import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

/** The key as pasted, minus stray spaces, quotes or line breaks. */
export function cleanEnvValue(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function paystackKeyStatus(): "ok" | "missing" | "invalid" {
  const key = cleanEnvValue(process.env.PAYSTACK_SECRET_KEY);
  if (!key) return "missing";
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test(key) ? "ok" : "invalid";
}

export function paystackSecretKey(): string | null {
  return paystackKeyStatus() === "ok"
    ? cleanEnvValue(process.env.PAYSTACK_SECRET_KEY)
    : null;
}

/** A fresh reference for each attempt, tied to the booking: BK-7KQ4MX-1a2b3c4d5e6f. */
export function newPaystackReference(bookingReference: string): string {
  return `${bookingReference}-${randomBytes(6).toString("hex")}`;
}

/** The booking a Paystack reference belongs to, or null if it is not one of ours. */
export function bookingReferenceOf(paystackReference: string): string | null {
  const m = /^(BK-[A-HJ-NP-Z2-9]{6})-[0-9a-f]{12}$/.exec(paystackReference);
  return m ? m[1] : null;
}

/**
 * Checks the x-paystack-signature header: an HMAC-SHA512 of the raw request
 * body, keyed with the secret key. Compared in constant time.
 */
export function isValidPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): boolean {
  if (!signature || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody, "utf8").digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<PaystackResponse<T>> {
  const key = paystackSecretKey();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const response = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => null)) as PaystackResponse<T> | null;
  if (!response.ok || !json?.status) {
    throw new Error(`Paystack ${path} failed: ${response.status} ${json?.message ?? ""}`);
  }
  return json;
}

export async function initializeTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  /** Where Paystack sends the customer if they close the checkout. */
  cancelUrl: string;
  bookingReference: string;
}): Promise<{ authorizationUrl: string }> {
  const { data } = await call<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      amount: input.amountMinor,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { booking_reference: input.bookingReference, cancel_action: input.cancelUrl },
    },
  });
  if (!/^https:\/\/checkout\.paystack\.com\//.test(data.authorization_url)) {
    throw new Error("Unexpected Paystack checkout URL");
  }
  return { authorizationUrl: data.authorization_url };
}

export interface VerifiedTransaction {
  reference: string;
  status: string;
  amountMinor: number;
  currency: string;
  paidAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
}

/** Asks Paystack directly what happened to a transaction. Never trust the browser. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const { data } = await call<{
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    channel: string | null;
    gateway_response: string | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
  return {
    reference: data.reference,
    status: data.status,
    amountMinor: data.amount,
    currency: data.currency,
    paidAt: data.paid_at,
    channel: data.channel,
    gatewayResponse: data.gateway_response,
  };
}
