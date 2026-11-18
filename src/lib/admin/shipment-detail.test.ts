import { describe, expect, it } from "vitest";
import {
  priceChangeSincePayment,
  toAdminDetail,
  type AdminShipmentDetailRow,
} from "./shipment-detail";

const row: AdminShipmentDetailRow = {
  tracking_number: "WB-1761-US",
  origin_city: "Lagos",
  origin_country: "NG",
  origin_hub: "LOS",
  destination_city: "Dallas",
  destination_country: "US",
  destination_hub: "DFW",
  service: "Sea Freight",
  carrier: "Waybill Sea",
  weight_kg: "25.50",
  pieces: 3,
  contents: "Dried food",
  estimated_delivery: "2027-01-20",
  cancelled_at: null,
  cancel_reason: null,
  created_at: "2026-11-16T14:15:00Z",
  // The database returns the linked booking as an object, not a list.
  bookings: {
    reference: "BK-J8Z78W",
    service: "Sea Freight",
    origin_country: "NG",
    destination_country: "US",
    weight_kg: "25.00",
    length_cm: null,
    width_cm: null,
    height_cm: null,
    collection: "drop_off",
    total_minor: 13_168_750,
  },
  tracking_events: [
    {
      id: "e1",
      stage: "booked",
      occurred_at: "2026-11-16T14:15:00Z",
      local_offset_minutes: 60,
      location: "Lagos, Nigeria",
      note: "Booked",
      created_at: "2026-11-16T14:15:00Z",
    },
  ],
};

describe("toAdminDetail", () => {
  it("reads the linked booking whether it comes as an object or a list", () => {
    expect(toAdminDetail(row).booking?.reference).toBe("BK-J8Z78W");
    expect(
      toAdminDetail({ ...row, bookings: [row.bookings as never] }).booking?.reference,
    ).toBe("BK-J8Z78W");
    expect(toAdminDetail({ ...row, bookings: null }).booking).toBeNull();
  });
});

describe("priceChangeSincePayment", () => {
  it("shows the new price when the weight changed after payment", () => {
    // 25.5 kg at 4,800 + 2,500, plus 7.5% VAT
    expect(priceChangeSincePayment(toAdminDetail(row))).toEqual({
      bookedKg: 25,
      nowKg: 25.5,
      paidMinor: 13_168_750,
      nowMinor: 13_426_750,
    });
  });

  it("says nothing when the weight is unchanged", () => {
    expect(
      priceChangeSincePayment(toAdminDetail({ ...row, weight_kg: "25.00" })),
    ).toBeNull();
  });
});
