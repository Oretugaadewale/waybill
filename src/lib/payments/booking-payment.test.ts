// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { amountToCharge, type BookingForPayment } from "./booking-payment";

const booking: BookingForPayment = {
  reference: "BK-7KQ4MX",
  status: "awaiting_payment",
  service: "Air Express",
  originCountry: "NG",
  destinationCountry: "GB",
  destinationCity: "London",
  weightKg: "2.20",
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  collection: "drop_off",
  senderEmail: "ada@example.com",
  totalMinor: 5_240_625,
  paidAt: null,
};

describe("amountToCharge", () => {
  it("charges the rate card price when it matches what the customer saw", () => {
    expect(amountToCharge(booking)).toEqual({ ok: true, amountMinor: 5_240_625 });
  });

  it("refuses to charge when the stored price was changed", () => {
    expect(amountToCharge({ ...booking, totalMinor: 100 })).toMatchObject({ ok: false });
  });
});
