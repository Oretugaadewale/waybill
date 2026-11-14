import { describe, expect, it } from "vitest";
import {
  filterAdminShipments,
  parseStatusFilter,
  summarizeAdminRows,
  type AdminShipmentRow,
} from "./admin-list";

const rows: AdminShipmentRow[] = [
  {
    tracking_number: "WB-1042-US",
    origin_city: "Lagos",
    origin_hub: "LOS",
    destination_city: "Houston",
    destination_hub: "IAH",
    service: "Air Express",
    estimated_delivery: "2026-11-09",
    tracking_events: [
      { stage: "booked", occurred_at: "2026-11-01T10:00:00Z" },
      { stage: "delivered", occurred_at: "2026-11-08T10:00:00Z" },
    ],
  },
  {
    tracking_number: "WB-2087-NG",
    origin_city: "Guangzhou",
    origin_hub: "CAN",
    destination_city: "Lagos",
    destination_hub: "LOS",
    service: "Air Economy",
    estimated_delivery: "2026-11-17",
    tracking_events: [{ stage: "at_customs", occurred_at: "2026-11-10T10:00:00Z" }],
  },
  {
    tracking_number: "WB-3150-CA",
    origin_city: "Lagos",
    origin_hub: "LOS",
    destination_city: "Toronto",
    destination_hub: "YYZ",
    service: "Sea Freight",
    estimated_delivery: "2026-12-20",
    cancelled_at: "2026-11-12T09:00:00Z",
    tracking_events: [{ stage: "booked", occurred_at: "2026-11-11T10:00:00Z" }],
  },
];

const summaries = summarizeAdminRows(rows);
const numbers = (list: { trackingNumber: string }[]) => list.map((s) => s.trackingNumber);

describe("summarizeAdminRows", () => {
  it("shows the latest stage, or Cancelled", () => {
    expect(summaries.map((s) => s.stageLabel)).toEqual([
      "Delivered",
      "At customs",
      "Cancelled",
    ]);
  });
});

describe("filterAdminShipments", () => {
  it("finds tracking numbers with or without dashes", () => {
    expect(numbers(filterAdminShipments(summaries, { q: "wb2087", status: "" }))).toEqual(
      ["WB-2087-NG"],
    );
    expect(
      numbers(filterAdminShipments(summaries, { q: "1042-us", status: "" })),
    ).toEqual(["WB-1042-US"]);
  });

  it("finds cities and hub codes", () => {
    expect(
      numbers(filterAdminShipments(summaries, { q: "toronto", status: "" })),
    ).toEqual(["WB-3150-CA"]);
    expect(filterAdminShipments(summaries, { q: "LOS", status: "" })).toHaveLength(3);
  });

  it("filters by status, keeping cancelled shipments separate", () => {
    expect(numbers(filterAdminShipments(summaries, { q: "", status: "booked" }))).toEqual(
      [],
    );
    expect(
      numbers(filterAdminShipments(summaries, { q: "", status: "cancelled" })),
    ).toEqual(["WB-3150-CA"]);
  });
});

describe("parseStatusFilter", () => {
  it("ignores unknown values", () => {
    expect(parseStatusFilter("delivered")).toBe("delivered");
    expect(parseStatusFilter("lost")).toBe("");
    expect(parseStatusFilter(undefined)).toBe("");
  });
});
