// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bookingReferenceOf,
  initializeTransaction,
  isValidPaystackSignature,
  newPaystackReference,
  verifyTransaction,
} from "./paystack";

const SECRET = "sk_test_abc123";

describe("Paystack references", () => {
  it("ties each attempt to its booking", () => {
    const ref = newPaystackReference("BK-7KQ4MX");
    expect(ref).toMatch(/^BK-7KQ4MX-[0-9a-f]{12}$/);
    expect(bookingReferenceOf(ref)).toBe("BK-7KQ4MX");
    expect(newPaystackReference("BK-7KQ4MX")).not.toBe(ref);
  });

  it("ignores references that are not ours", () => {
    expect(bookingReferenceOf("T123456789")).toBeNull();
    expect(bookingReferenceOf("BK-7KQ4MX")).toBeNull();
  });
});

describe("isValidPaystackSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "x" } });
  const sign = (b: string, key = SECRET) =>
    createHmac("sha512", key).update(b).digest("hex");

  it("accepts a body signed with our key", () => {
    expect(isValidPaystackSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a changed body, another key, or no signature", () => {
    expect(isValidPaystackSignature(body + " ", sign(body), SECRET)).toBe(false);
    expect(isValidPaystackSignature(body, sign(body, "sk_test_other"), SECRET)).toBe(
      false,
    );
    expect(isValidPaystackSignature(body, null, SECRET)).toBe(false);
    expect(isValidPaystackSignature(body, "not-hex", SECRET)).toBe(false);
  });
});

describe("Paystack API calls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("initializes in kobo and naira with our reference and callback", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          message: "ok",
          data: { authorization_url: "https://checkout.paystack.com/abc" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await initializeTransaction({
      email: "ada@example.com",
      amountMinor: 5_240_625,
      reference: "BK-7KQ4MX-0123456789ab",
      callbackUrl: "https://waybill.example/pay/BK-7KQ4MX/callback",
      cancelUrl: "https://waybill.example/pay/BK-7KQ4MX",
      bookingReference: "BK-7KQ4MX",
    });

    expect(result.authorizationUrl).toBe("https://checkout.paystack.com/abc");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(init.body)).toMatchObject({
      amount: 5_240_625,
      currency: "NGN",
      reference: "BK-7KQ4MX-0123456789ab",
      metadata: {
        booking_reference: "BK-7KQ4MX",
        cancel_action: "https://waybill.example/pay/BK-7KQ4MX",
      },
    });
  });

  it("refuses a checkout URL that is not Paystack's", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: true,
            message: "ok",
            data: { authorization_url: "https://evil.example" },
          }),
        ),
      ),
    );
    await expect(
      initializeTransaction({
        email: "a@b.co",
        amountMinor: 100,
        reference: "BK-7KQ4MX-0123456789ab",
        callbackUrl: "https://x/pay",
        cancelUrl: "https://x/pay",
        bookingReference: "BK-7KQ4MX",
      }),
    ).rejects.toThrow(/checkout URL/);
  });

  it("reads the verified amount and status", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: true,
            message: "ok",
            data: {
              reference: "BK-7KQ4MX-0123456789ab",
              status: "success",
              amount: 5_240_625,
              currency: "NGN",
              paid_at: "2026-11-14T10:00:00Z",
              channel: "card",
              gateway_response: "Successful",
            },
          }),
        ),
      ),
    );
    await expect(verifyTransaction("BK-7KQ4MX-0123456789ab")).resolves.toMatchObject({
      status: "success",
      amountMinor: 5_240_625,
      currency: "NGN",
    });
  });

  it("fails without a secret key", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    await expect(verifyTransaction("x")).rejects.toThrow(/PAYSTACK_SECRET_KEY/);
  });
});

describe("cleanEnvValue", () => {
  it("ignores stray spaces, quotes and line breaks from pasting", async () => {
    const { cleanEnvValue } = await import("./paystack");
    expect(cleanEnvValue("  sk_test_abc\n")).toBe("sk_test_abc");
    expect(cleanEnvValue('"sk_test_abc"')).toBe("sk_test_abc");
    expect(cleanEnvValue(undefined)).toBe("");
  });
});
