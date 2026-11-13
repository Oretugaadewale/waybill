import { describe, expect, it } from "vitest";
import { SAMPLE_SHIPMENTS } from "./sample-data";
import {
  currentStage,
  eventsNewestFirst,
  findShipment,
  formatDate,
  formatEventTime,
  isValidTrackingNumber,
  normalizeTrackingNumber,
  progressSteps,
} from "./tracking";
import { SHIPMENT_STAGES } from "./types";

describe("normalizeTrackingNumber", () => {
  it.each([
    ["WB-1042-US", "WB-1042-US"],
    ["wb-1042-us", "WB-1042-US"],
    [" wb 1042 us ", "WB-1042-US"],
    ["WB1042US", "WB-1042-US"],
    ["wb_1042_us", "WB-1042-US"],
  ])("turns %j into %s", (input, expected) => {
    expect(normalizeTrackingNumber(input)).toBe(expected);
  });

  it("leaves unrecognised input trimmed and upper-cased", () => {
    expect(normalizeTrackingNumber("  hello ")).toBe("HELLO");
  });
});

describe("isValidTrackingNumber", () => {
  it("accepts the canonical format only", () => {
    expect(isValidTrackingNumber("WB-1042-US")).toBe(true);
    expect(isValidTrackingNumber("WB-104-US")).toBe(false);
    expect(isValidTrackingNumber("wb-1042-us")).toBe(false);
    expect(isValidTrackingNumber("")).toBe(false);
  });
});

describe("findShipment", () => {
  it("finds a shipment however the number is typed", () => {
    expect(findShipment("wb 1042 us")?.destination.city).toBe("Houston");
  });

  it("returns undefined for an unknown number", () => {
    expect(findShipment("WB-0000-NG")).toBeUndefined();
  });
});

describe("sample data", () => {
  it("has one shipment at every stage", () => {
    const stages = SAMPLE_SHIPMENTS.map(currentStage).sort();
    expect(stages).toEqual([...SHIPMENT_STAGES].sort());
  });

  it("uses valid, unique tracking numbers", () => {
    const numbers = SAMPLE_SHIPMENTS.map((s) => s.trackingNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    numbers.forEach((n) => expect(isValidTrackingNumber(n)).toBe(true));
  });

  it("keeps events in journey order", () => {
    for (const shipment of SAMPLE_SHIPMENTS) {
      const order = shipment.events.map((e) => SHIPMENT_STAGES.indexOf(e.stage));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });
});

describe("progressSteps", () => {
  it("marks earlier stages done, the latest current and the rest upcoming", () => {
    const shipment = findShipment("WB-3150-CA")!; // in transit
    expect(progressSteps(shipment).map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("marks every stage done once delivered", () => {
    const shipment = findShipment("WB-1042-US")!;
    expect(progressSteps(shipment).every((s) => s.state === "done")).toBe(true);
  });
});

describe("eventsNewestFirst", () => {
  it("sorts by real time, not by the order events were stored", () => {
    const shipment = findShipment("WB-1042-US")!;
    expect(eventsNewestFirst(shipment)[0].stage).toBe("delivered");
    expect(shipment.events[0].stage).toBe("booked");
  });
});

describe("formatting", () => {
  it("shows the local wall-clock time of the event", () => {
    expect(formatEventTime("2026-11-09T14:47:00-06:00")).toEqual({
      date: "9 Nov 2026",
      time: "2:47 pm",
    });
    expect(formatEventTime("2026-11-02T00:05:00+01:00").time).toBe("12:05 am");
  });

  it("formats a plain date", () => {
    expect(formatDate("2026-12-18")).toBe("18 Dec 2026");
  });
});
