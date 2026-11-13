import { STAGE_LABELS } from "./tracking";
import type { ShipmentStage } from "./types";

/** A row as selected for the admin list, with its events nested. */
export interface AdminShipmentRow {
  tracking_number: string;
  origin_city: string;
  origin_hub: string;
  destination_city: string;
  destination_hub: string;
  service: string;
  estimated_delivery: string;
  tracking_events: { stage: ShipmentStage; occurred_at: string }[];
}

export interface AdminShipmentSummary {
  trackingNumber: string;
  route: string;
  service: string;
  estimatedDelivery: string;
  stage: ShipmentStage | null;
  stageLabel: string;
  lastUpdate: string | null;
  scans: number;
}

export function summarizeAdminRows(rows: AdminShipmentRow[]): AdminShipmentSummary[] {
  return rows.map((row) => {
    const latest = [...row.tracking_events].sort(
      (a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at),
    )[0];
    return {
      trackingNumber: row.tracking_number,
      route: `${row.origin_city} (${row.origin_hub}) to ${row.destination_city} (${row.destination_hub})`,
      service: row.service,
      estimatedDelivery: row.estimated_delivery,
      stage: latest?.stage ?? null,
      stageLabel: latest ? STAGE_LABELS[latest.stage] : "No scans yet",
      lastUpdate: latest?.occurred_at ?? null,
      scans: row.tracking_events.length,
    };
  });
}
