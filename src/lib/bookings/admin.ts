import type { Quote } from "@/lib/pricing/quote";
import type { ServiceLevel } from "@/lib/shipments/types";

export type BookingStatus = "awaiting_payment" | "paid" | "converted" | "declined";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  converted: "Shipment created",
  declined: "Declined",
};

export const BOOKING_STATUS_FILTERS: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All bookings" },
  ...(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((value) => ({
    value,
    label: BOOKING_STATUS_LABELS[value],
  })),
];

export function parseBookingStatus(value: unknown): BookingStatus | "" {
  return typeof value === "string" && value in BOOKING_STATUS_LABELS
    ? (value as BookingStatus)
    : "";
}

export interface BookingRow {
  reference: string;
  status: BookingStatus;
  service: ServiceLevel;
  origin_country: string;
  destination_country: string;
  destination_city: string;
  weight_kg: number | string;
  length_cm: number | string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  pieces: number;
  contents: string;
  declared_value_minor: number;
  collection: "drop_off" | "pickup";
  pickup_address: string | null;
  sender_name: string;
  sender_phone: string;
  sender_email: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_email: string | null;
  receiver_address: string;
  quote: Quote;
  total_minor: number;
  rate_card_version: string;
  decline_reason: string | null;
  created_at: string;
  shipments: { tracking_number: string } | null;
}

export const BOOKING_SELECT =
  "reference, status, service, origin_country, destination_country, destination_city, weight_kg, length_cm, width_cm, height_cm, pieces, contents, declared_value_minor, collection, pickup_address, sender_name, sender_phone, sender_email, receiver_name, receiver_phone, receiver_email, receiver_address, quote, total_minor, rate_card_version, decline_reason, created_at, shipments(tracking_number)";

export const BOOKING_LIST_SELECT =
  "reference, status, service, origin_country, destination_country, destination_city, weight_kg, sender_name, total_minor, created_at, shipments(tracking_number), payments(refund_needed, refunded_at)";

export const isBookingReference = (value: string) => /^BK-[A-HJ-NP-Z2-9]{6}$/.test(value);

/** "14 Nov 2026, 3:05 pm" in Lagos time, for admin lists. */
export function formatLagosDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
