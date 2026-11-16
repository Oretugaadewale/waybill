import { calculateQuote } from "@/lib/pricing/quote";
import { recordToShipment } from "@/lib/shipments/mapping";
import type { ServiceLevel, Shipment, ShipmentStage } from "@/lib/shipments/types";

/** A shipment row as selected for the admin detail page, events nested. */
export interface AdminShipmentDetailRow {
  tracking_number: string;
  origin_city: string;
  origin_country: string;
  origin_hub: string;
  destination_city: string;
  destination_country: string;
  destination_hub: string;
  service: ServiceLevel;
  carrier: string;
  weight_kg: number | string;
  pieces: number;
  contents: string;
  estimated_delivery: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  /** One booking at most (bookings.shipment_id is unique), so it comes back as an object. */
  bookings: BookingLink | BookingLink[] | null;
  tracking_events: {
    id: string;
    stage: ShipmentStage;
    occurred_at: string;
    local_offset_minutes: number;
    location: string;
    note: string;
    created_at: string;
  }[];
}

interface BookingLink {
  reference: string;
  service: ServiceLevel;
  origin_country: string;
  destination_country: string;
  weight_kg: number | string;
  length_cm: number | string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  collection: "drop_off" | "pickup";
  total_minor: number;
}

export const ADMIN_DETAIL_SELECT =
  "tracking_number, origin_city, origin_country, origin_hub, destination_city, destination_country, destination_hub, service, carrier, weight_kg, pieces, contents, estimated_delivery, cancelled_at, cancel_reason, created_at, tracking_events(id, stage, occurred_at, local_offset_minutes, location, note, created_at), bookings(reference, service, origin_country, destination_country, weight_kg, length_cm, width_cm, height_cm, collection, total_minor)";

export interface AdminShipmentDetail {
  shipment: Shipment;
  cancelReason: string | null;
  latestEventId: string | null;
  booking: BookingLink | null;
}

export function toAdminDetail(row: AdminShipmentDetailRow): AdminShipmentDetail {
  const events = [...row.tracking_events].sort(
    (a, b) =>
      Date.parse(a.occurred_at) - Date.parse(b.occurred_at) ||
      Date.parse(a.created_at) - Date.parse(b.created_at),
  );

  const shipment = recordToShipment({
    trackingNumber: row.tracking_number,
    origin: { city: row.origin_city, country: row.origin_country, hub: row.origin_hub },
    destination: {
      city: row.destination_city,
      country: row.destination_country,
      hub: row.destination_hub,
    },
    service: row.service,
    carrier: row.carrier,
    weightKg: row.weight_kg,
    pieces: row.pieces,
    contents: row.contents,
    estimatedDelivery: row.estimated_delivery,
    cancelledAt: row.cancelled_at,
    events: events.map((e) => ({
      stage: e.stage,
      occurredAt: e.occurred_at,
      localOffsetMinutes: e.local_offset_minutes,
      location: e.location,
      note: e.note,
    })),
  });

  return {
    shipment,
    cancelReason: row.cancel_reason,
    latestEventId: events.at(-1)?.id ?? null,
    booking: Array.isArray(row.bookings) ? (row.bookings[0] ?? null) : row.bookings,
  };
}

/**
 * If staff changed the weight after the customer paid, what the rate card
 * says the shipment should cost now, so the difference can be collected
 * or refunded. Null when nothing changed.
 */
export function priceChangeSincePayment(detail: AdminShipmentDetail): {
  bookedKg: number;
  nowKg: number;
  paidMinor: number;
  nowMinor: number;
} | null {
  const b = detail.booking;
  if (!b) return null;
  const bookedKg = Number(b.weight_kg);
  const nowKg = detail.shipment.weightKg;
  if (bookedKg === nowKg) return null;
  const dims =
    b.length_cm !== null && b.width_cm !== null && b.height_cm !== null
      ? {
          length: Number(b.length_cm),
          width: Number(b.width_cm),
          height: Number(b.height_cm),
        }
      : null;
  const priced = calculateQuote({
    service: b.service,
    originCountry: b.origin_country,
    destinationCountry: b.destination_country,
    weightKg: nowKg,
    dimensionsCm: dims,
    collection: b.collection,
  });
  if (!priced.ok || priced.quote.totalMinor === Number(b.total_minor)) return null;
  return {
    bookedKg,
    nowKg,
    paidMinor: Number(b.total_minor),
    nowMinor: priced.quote.totalMinor,
  };
}
