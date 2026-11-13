/**
 * The stages a shipment moves through, in order.
 * The order of this array is the source of truth for progress.
 */
export const SHIPMENT_STAGES = [
  "booked",
  "picked_up",
  "in_transit",
  "at_customs",
  "out_for_delivery",
  "delivered",
] as const;

export type ShipmentStage = (typeof SHIPMENT_STAGES)[number];

export type ServiceLevel = "Air Express" | "Air Economy" | "Sea Freight";

export interface Place {
  /** City name shown to customers, e.g. "Lagos". */
  city: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "NG". */
  country: string;
  /** Three-letter hub code shown on the waybill, e.g. "LOS". */
  hub: string;
}

export interface TrackingEvent {
  stage: ShipmentStage;
  /** ISO 8601 timestamp with offset. */
  at: string;
  location: string;
  note: string;
}

export interface Shipment {
  /** Normalised tracking number, e.g. "WB-1042-US". */
  trackingNumber: string;
  origin: Place;
  destination: Place;
  service: ServiceLevel;
  carrier: string;
  /** Total chargeable weight in kilograms. */
  weightKg: number;
  pieces: number;
  contents: string;
  /** ISO 8601 date (no time) of the expected delivery. */
  estimatedDelivery: string;
  /** Events in chronological order, oldest first. */
  events: TrackingEvent[];
}
