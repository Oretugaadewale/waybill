import { STAGE_LABELS } from "./tracking";
import { SHIPMENT_STAGES, type ShipmentStage } from "./types";

/** A row as selected for the admin list, with its events nested. */
export interface AdminShipmentRow {
  tracking_number: string;
  origin_city: string;
  origin_hub: string;
  destination_city: string;
  destination_hub: string;
  service: string;
  estimated_delivery: string;
  cancelled_at?: string | null;
  tracking_events: { stage: ShipmentStage; occurred_at: string }[];
}

export interface AdminShipmentSummary {
  trackingNumber: string;
  route: string;
  /** Words to search: cities and hub codes. */
  searchText: string;
  service: string;
  estimatedDelivery: string;
  stage: ShipmentStage | null;
  cancelled: boolean;
  stageLabel: string;
  lastUpdate: string | null;
  scans: number;
}

export const ADMIN_LIST_SELECT =
  "tracking_number, origin_city, origin_hub, destination_city, destination_hub, service, estimated_delivery, cancelled_at, tracking_events(stage, occurred_at)";

export function summarizeAdminRows(rows: AdminShipmentRow[]): AdminShipmentSummary[] {
  return rows.map((row) => {
    const latest = [...row.tracking_events].sort(
      (a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at),
    )[0];
    const cancelled = Boolean(row.cancelled_at);
    return {
      trackingNumber: row.tracking_number,
      route: `${row.origin_city} (${row.origin_hub}) to ${row.destination_city} (${row.destination_hub})`,
      searchText: [
        row.tracking_number,
        row.origin_city,
        row.origin_hub,
        row.destination_city,
        row.destination_hub,
      ]
        .join(" ")
        .toLowerCase(),
      service: row.service,
      estimatedDelivery: row.estimated_delivery,
      stage: latest?.stage ?? null,
      cancelled,
      stageLabel: cancelled
        ? "Cancelled"
        : latest
          ? STAGE_LABELS[latest.stage]
          : "No scans yet",
      lastUpdate: latest?.occurred_at ?? null,
      scans: row.tracking_events.length,
    };
  });
}

/** The status filter: any stage, "cancelled", or "" for all. */
export type StatusFilter = ShipmentStage | "cancelled" | "";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All statuses" },
  ...SHIPMENT_STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] })),
  { value: "cancelled", label: "Cancelled" },
];

export function parseStatusFilter(value: unknown): StatusFilter {
  return STATUS_FILTERS.some((f) => f.value === value) ? (value as StatusFilter) : "";
}

/**
 * Filters the list by a search term (tracking number, city or hub, with or
 * without dashes) and a status.
 */
export function filterAdminShipments(
  shipments: AdminShipmentSummary[],
  { q, status }: { q: string; status: StatusFilter },
): AdminShipmentSummary[] {
  const term = q.trim().toLowerCase();
  const compactTerm = term.replace(/[^a-z0-9]/g, "");
  return shipments.filter((s) => {
    if (status === "cancelled" && !s.cancelled) return false;
    if (status && status !== "cancelled" && (s.cancelled || s.stage !== status))
      return false;
    if (!term) return true;
    return (
      s.searchText.includes(term) ||
      (compactTerm.length > 0 &&
        s.trackingNumber.toLowerCase().replace(/-/g, "").includes(compactTerm))
    );
  });
}
