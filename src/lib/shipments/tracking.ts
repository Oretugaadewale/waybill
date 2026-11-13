import { SAMPLE_SHIPMENTS } from "./sample-data";
import {
  SHIPMENT_STAGES,
  type Shipment,
  type ShipmentStage,
  type TrackingEvent,
} from "./types";

export const STAGE_LABELS: Record<ShipmentStage, string> = {
  booked: "Booked",
  picked_up: "Picked up",
  in_transit: "In transit",
  at_customs: "At customs",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

/** Tracking numbers look like WB-1042-US: prefix, four digits, country. */
const TRACKING_NUMBER_PATTERN = /^WB-\d{4}-[A-Z]{2}$/;

/**
 * Turns what a customer types into the canonical form.
 * Accepts lower case, spaces and missing dashes: " wb 1042 us " -> "WB-1042-US".
 */
export function normalizeTrackingNumber(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = /^WB(\d{4})([A-Z]{2})$/.exec(compact);
  if (!match) return input.trim().toUpperCase();
  return `WB-${match[1]}-${match[2]}`;
}

export function isValidTrackingNumber(value: string): boolean {
  return TRACKING_NUMBER_PATTERN.test(value);
}

export function findShipment(trackingNumber: string): Shipment | undefined {
  const normalized = normalizeTrackingNumber(trackingNumber);
  return SAMPLE_SHIPMENTS.find((s) => s.trackingNumber === normalized);
}

export function listSampleTrackingNumbers(): string[] {
  return SAMPLE_SHIPMENTS.map((s) => s.trackingNumber);
}

export function latestEvent(shipment: Shipment): TrackingEvent {
  const last = shipment.events.at(-1);
  if (!last) {
    throw new Error(`Shipment ${shipment.trackingNumber} has no events`);
  }
  return last;
}

export function currentStage(shipment: Shipment): ShipmentStage {
  return latestEvent(shipment).stage;
}

/** Zero-based position of a stage in the journey. */
export function stageIndex(stage: ShipmentStage): number {
  return SHIPMENT_STAGES.indexOf(stage);
}

export type StepState = "done" | "current" | "upcoming";

export interface ProgressStep {
  stage: ShipmentStage;
  label: string;
  state: StepState;
}

export function progressSteps(shipment: Shipment): ProgressStep[] {
  const current = stageIndex(currentStage(shipment));
  const delivered = currentStage(shipment) === "delivered";
  return SHIPMENT_STAGES.map((stage, i) => ({
    stage,
    label: STAGE_LABELS[stage],
    state:
      i < current || (delivered && i === current)
        ? "done"
        : i === current
          ? "current"
          : "upcoming",
  }));
}

/** Events newest first, for the timeline. */
export function eventsNewestFirst(shipment: Shipment): TrackingEvent[] {
  return [...shipment.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats an ISO timestamp in the local time of the place it happened,
 * which is what a customer expects ("arrived 9:30 am Houston time").
 * Reads the wall-clock parts straight from the string so the output is
 * identical on the server and in every browser time zone.
 */
export function formatEventTime(iso: string): { date: string; time: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) throw new Error(`Invalid timestamp: ${iso}`);
  const [, year, month, day, hh, mm] = m;
  const hour = Number(hh);
  const suffix = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return {
    date: `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`,
    time: `${hour12}:${mm} ${suffix}`,
  };
}

export function formatDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) throw new Error(`Invalid date: ${isoDate}`);
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}
