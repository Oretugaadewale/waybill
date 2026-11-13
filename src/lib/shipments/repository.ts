import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/server";
import { recordToShipment, type ShipmentRecord } from "./mapping";
import { findShipment, isValidTrackingNumber } from "./tracking";
import type { Shipment } from "./types";

export const shipmentCacheTag = (trackingNumber: string) => `shipment:${trackingNumber}`;

/**
 * Looks up one shipment by its canonical tracking number.
 * Reads Supabase when configured, otherwise the bundled sample data.
 * Cached for a few minutes; admin edits in Stage 3 will revalidate the tag.
 */
export async function getShipment(trackingNumber: string): Promise<Shipment | null> {
  "use cache";
  cacheTag(shipmentCacheTag(trackingNumber));
  cacheLife("minutes");

  if (!isValidTrackingNumber(trackingNumber)) return null;

  if (!getSupabaseEnv()) {
    return findShipment(trackingNumber) ?? null;
  }

  const { data, error } = await createPublicClient().rpc("get_shipment", {
    p_tracking_number: trackingNumber,
  });
  if (error) throw new Error(`Could not load shipment: ${error.message}`);
  if (!data) return null;
  return recordToShipment(data as ShipmentRecord);
}
