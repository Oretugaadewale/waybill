// @vitest-environment node
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const confirmPayment = vi.fn();
vi.mock("@/lib/payments/booking-payment", () => ({
  confirmPayment: (ref: string) => confirmPayment(ref),
  paymentsConfigured: () => true,
}));

import { POST } from "./route";

const SECRET = "sk_test_abc123";
const send = (body: string, signature?: string) =>
  POST(
    new NextRequest("https://waybill.example/api/paystack/webhook", {
      method: "POST",
      body,
      headers: signature ? { "x-paystack-signature": signature } : {},
    }),
  );
const sign = (body: string) => createHmac("sha512", SECRET).update(body).digest("hex");

describe("Paystack webhook", () => {
  beforeEach(() => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    confirmPayment.mockReset();
  });

  it("rejects unsigned or forged events without touching the database", async () => {
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "BK-7KQ4MX-0123456789ab" },
    });
    expect((await send(body)).status).toBe(401);
    expect((await send(body, "a".repeat(128))).status).toBe(401);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("confirms a signed charge.success for a Waybill booking", async () => {
    confirmPayment.mockResolvedValue("paid");
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "BK-7KQ4MX-0123456789ab" },
    });
    const res = await send(body, sign(body));
    expect(res.status).toBe(200);
    expect(confirmPayment).toHaveBeenCalledWith("BK-7KQ4MX-0123456789ab");
  });

  it("acknowledges and ignores other events and other references", async () => {
    const other = JSON.stringify({
      event: "transfer.success",
      data: { reference: "BK-7KQ4MX-0123456789ab" },
    });
    const foreign = JSON.stringify({
      event: "charge.success",
      data: { reference: "ESHOP-123" },
    });
    expect((await send(other, sign(other))).status).toBe(200);
    expect((await send(foreign, sign(foreign))).status).toBe(200);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("asks Paystack to retry if recording fails", async () => {
    confirmPayment.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "BK-7KQ4MX-0123456789ab" },
    });
    expect((await send(body, sign(body))).status).toBe(500);
  });
});
