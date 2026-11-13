import { describe, expect, it } from "vitest";
import { summarizeAdminRows } from "./admin-list";
import { recordToShipment, toLocalIso, type ShipmentRecord } from "./mapping";
import { SAMPLE_SHIPMENTS } from "./sample-data";

describe("toLocalIso", () => {
  it("shifts a UTC instant into the local time of the scan", () => {
    expect(toLocalIso("2026-11-09T20:47:00+00:00", -360)).toBe(
      "2026-11-09T14:47:00-06:00",
    );
    expect(toLocalIso("2026-11-02T09:14:00Z", 60)).toBe("2026-11-02T10:14:00+01:00");
    expect(toLocalIso("2026-11-05T11:02:00Z", 0)).toBe("2026-11-05T11:02:00+00:00");
  });

  it("handles crossing midnight and half-hour offsets", () => {
    expect(toLocalIso("2026-11-02T23:30:00Z", 60)).toBe("2026-11-03T00:30:00+01:00");
    expect(toLocalIso("2026-11-02T10:00:00Z", 330)).toBe("2026-11-02T15:30:00+05:30");
  });

  it("rejects an invalid timestamp", () => {
    expect(() => toLocalIso("not a date", 0)).toThrow();
  });
});

describe("recordToShipment", () => {
  it("rebuilds the exact sample shipment from what the database returns", () => {
    const sample = SAMPLE_SHIPMENTS[0];
    // What get_shipment() returns for this shipment: UTC timestamps, numeric as string.
    const record: ShipmentRecord = {
      trackingNumber: sample.trackingNumber,
      origin: sample.origin,
      destination: sample.destination,
      service: sample.service,
      carrier: sample.carrier,
      weightKg: String(sample.weightKg),
      pieces: sample.pieces,
      contents: sample.contents,
      estimatedDelivery: sample.estimatedDelivery,
      events: sample.events.map((e) => {
        const m = /([+-])(\d{2}):(\d{2})$/.exec(e.at)!;
        const offset = (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
        return {
          stage: e.stage,
          occurredAt: new Date(e.at).toISOString(),
          localOffsetMinutes: offset,
          location: e.location,
          note: e.note,
        };
      }),
    };

    expect(recordToShipment(record)).toEqual(sample);
  });
});

describe("summarizeAdminRows", () => {
  it("uses the latest scan for the status, whatever order the rows arrive in", () => {
    const [summary] = summarizeAdminRows([
      {
        tracking_number: "WB-3150-CA",
        origin_city: "Lagos",
        origin_hub: "LOS",
        destination_city: "Toronto",
        destination_hub: "YYZ",
        service: "Air Express",
        estimated_delivery: "2026-11-18",
        tracking_events: [
          { stage: "in_transit", occurred_at: "2026-11-12T22:10:00+00:00" },
          { stage: "booked", occurred_at: "2026-11-10T08:05:00+00:00" },
          { stage: "picked_up", occurred_at: "2026-11-10T14:30:00+00:00" },
        ],
      },
    ]);

    expect(summary).toMatchObject({
      trackingNumber: "WB-3150-CA",
      route: "Lagos (LOS) to Toronto (YYZ)",
      stage: "in_transit",
      stageLabel: "In transit",
      scans: 3,
    });
  });

  it("copes with a shipment that has no scans yet", () => {
    const [summary] = summarizeAdminRows([
      {
        tracking_number: "WB-7000-NG",
        origin_city: "Lagos",
        origin_hub: "LOS",
        destination_city: "Abuja",
        destination_hub: "ABV",
        service: "Air Economy",
        estimated_delivery: "2026-11-30",
        tracking_events: [],
      },
    ]);

    expect(summary.stage).toBeNull();
    expect(summary.stageLabel).toBe("No scans yet");
    expect(summary.lastUpdate).toBeNull();
  });
});
