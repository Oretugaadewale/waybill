import "server-only";
import { calculateQuote } from "@/lib/pricing/quote";
import type { ServiceLevel } from "@/lib/shipments/types";
import { createPublicClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { bookingReferenceOf, paystackSecretKey, verifyTransaction } from "./paystack";

export interface BookingForPayment {
  reference: string;
  status: "awaiting_payment" | "paid" | "converted" | "declined";
  service: ServiceLevel;
  originCountry: string;
  destinationCountry: string;
  destinationCity: string;
  weightKg: number | string;
  lengthCm: number | string | null;
  widthCm: number | string | null;
  heightCm: number | string | null;
  collection: "drop_off" | "pickup";
  senderEmail: string;
  totalMinor: number;
  paidAt: string | null;
}

export function serverKey(): string | null {
  const key = process.env.WAYBILL_SERVER_KEY;
  return key && /^wbk_[0-9a-f]{64}$/.test(key) ? key : null;
}

/** Payments need the database, the Paystack key and the server key. */
export function paymentsConfigured(): boolean {
  return Boolean(getSupabaseEnv() && paystackSecretKey() && serverKey());
}

export async function loadBookingForPayment(
  reference: string,
): Promise<BookingForPayment | null> {
  const { data, error } = await createPublicClient().rpc("booking_for_payment", {
    p_server_key: serverKey(),
    p_reference: reference,
  });
  if (error) throw new Error(`Could not load booking: ${error.message}`);
  return (data as BookingForPayment | null) ?? null;
}

/**
 * What to charge: the rate card applied to what the customer booked. If that
 * differs from the price they were shown, we stop rather than charge a
 * different amount.
 */
export function amountToCharge(
  b: BookingForPayment,
): { ok: true; amountMinor: number } | { ok: false; reason: string } {
  const dims =
    b.lengthCm !== null && b.widthCm !== null && b.heightCm !== null
      ? {
          length: Number(b.lengthCm),
          width: Number(b.widthCm),
          height: Number(b.heightCm),
        }
      : null;
  const priced = calculateQuote({
    service: b.service,
    originCountry: b.originCountry,
    destinationCountry: b.destinationCountry,
    weightKg: Number(b.weightKg),
    dimensionsCm: dims,
    collection: b.collection,
  });
  if (!priced.ok) return { ok: false, reason: priced.message };
  if (priced.quote.totalMinor !== Number(b.totalMinor)) {
    return {
      ok: false,
      reason:
        "Our prices have changed since you booked. Contact us and we will sort it out.",
    };
  }
  return { ok: true, amountMinor: priced.quote.totalMinor };
}

export type PaymentOutcome = "paid" | "already_paid" | "failed" | "abandoned" | "pending";

/**
 * Asks Paystack about a transaction and records the answer. Used by both the
 * redirect back from checkout and the webhook, so it is safe to run twice.
 */
export async function confirmPayment(paystackReference: string): Promise<PaymentOutcome> {
  if (!bookingReferenceOf(paystackReference))
    throw new Error("Not a Waybill payment reference");
  const tx = await verifyTransaction(paystackReference);
  if (tx.reference !== paystackReference)
    throw new Error("Paystack returned another reference");

  const status = ["success", "failed", "abandoned"].includes(tx.status)
    ? tx.status
    : "pending";
  const { data, error } = await createPublicClient().rpc("record_payment_result", {
    p_server_key: serverKey(),
    p_paystack_reference: paystackReference,
    p_status: status,
    p_amount_minor: tx.amountMinor,
    p_currency: tx.currency,
    p_paid_at: tx.paidAt,
    p_channel: tx.channel,
    p_gateway_response: tx.gatewayResponse,
  });
  if (error) throw new Error(`Could not record payment: ${error.message}`);
  return data as PaymentOutcome;
}
