import type { Shipment, ShipmentStage, ServiceLevel, TrackingEvent } from "./types";

/** Shape returned by the get_shipment() database function. */
export interface ShipmentRecord {
  trackingNumber: string;
  origin: { city: string; country: string; hub: string };
  destination: { city: string; country: string; hub: string };
  service: ServiceLevel;
  carrier: string;
  weightKg: number | string;
  pieces: number;
  contents: string;
  estimatedDelivery: string;
  events: {
    stage: ShipmentStage;
    occurredAt: string;
    localOffsetMinutes: number;
    location: string;
    note: string;
  }[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Turns a UTC instant plus the offset of the place it happened into an ISO
 * string in that local time, e.g. ("2026-11-09T20:47:00Z", -360)
 * -> "2026-11-09T14:47:00-06:00". The UI reads wall-clock time from this.
 */
export function toLocalIso(utcIso: string, offsetMinutes: number): string {
  const ms = Date.parse(utcIso);
  if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: ${utcIso}`);
  const local = new Date(ms + offsetMinutes * 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function recordToShipment(record: ShipmentRecord): Shipment {
  const events: TrackingEvent[] = record.events.map((e) => ({
    stage: e.stage,
    at: toLocalIso(e.occurredAt, e.localOffsetMinutes),
    location: e.location,
    note: e.note,
  }));

  return {
    trackingNumber: record.trackingNumber,
    origin: { ...record.origin },
    destination: { ...record.destination },
    service: record.service,
    carrier: record.carrier,
    weightKg: Number(record.weightKg),
    pieces: record.pieces,
    contents: record.contents,
    estimatedDelivery: record.estimatedDelivery,
    events,
  };
}
