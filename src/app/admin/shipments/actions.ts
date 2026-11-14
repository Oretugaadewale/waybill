"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminClientForAction } from "@/lib/admin/session";
import { databaseMessage, type FormState } from "@/lib/admin/form-state";
import { countryName, offsetMinutesAt, wallTimeToInstant } from "@/lib/places";
import {
  addEventSchema,
  cancelSchema,
  createShipmentSchema,
  fieldErrors,
  formValues,
  resolveTimeZone,
  updateDetailsSchema,
} from "@/lib/shipments/admin-schemas";
import { shipmentCacheTag } from "@/lib/shipments/repository";
import { isValidTrackingNumber } from "@/lib/shipments/tracking";

const notAllowed = (values: Record<string, string>): FormState => ({
  ok: false,
  message: "Your session has ended or this account is not an admin. Sign in again.",
  errors: {},
  values,
  savedAt: 0,
});

const invalid = (
  values: Record<string, string>,
  errors: Record<string, string>,
): FormState => ({
  ok: false,
  message: "Some fields need fixing. Check the messages below each one.",
  errors,
  values,
  savedAt: 0,
});

const failed = (values: Record<string, string>, message: string): FormState => ({
  ok: false,
  message,
  errors: {},
  values,
  savedAt: 0,
});

const saved = (message: string): FormState => ({
  ok: true,
  message,
  errors: {},
  values: {},
  savedAt: Date.now(),
});

function logDatabaseError(action: string, error: { code?: string; message: string }) {
  if (error.code !== "P0001") console.error(`[admin] ${action} failed`, error);
}

async function shipmentId(
  supabase: NonNullable<Awaited<ReturnType<typeof adminClientForAction>>>,
  trackingNumber: string,
): Promise<string | null> {
  if (!isValidTrackingNumber(trackingNumber)) return null;
  const { data } = await supabase
    .from("shipments")
    .select("id")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ---------------------------------------------------------------------------

export async function createShipment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = createShipmentSchema.safeParse(values);
  if (!parsed.success) return invalid(values, fieldErrors(parsed.error));

  const supabase = await adminClientForAction();
  if (!supabase) return notAllowed(values);

  const s = parsed.data;
  const zone = resolveTimeZone(s.originCountry, s.originTimeZone);

  const { data: trackingNumber, error } = await supabase.rpc("create_shipment", {
    p_origin_city: s.originCity,
    p_origin_country: s.originCountry,
    p_origin_hub: s.originHub,
    p_destination_city: s.destinationCity,
    p_destination_country: s.destinationCountry,
    p_destination_hub: s.destinationHub,
    p_service: s.service,
    p_carrier: s.carrier,
    p_weight_kg: s.weightKg,
    p_pieces: s.pieces,
    p_contents: s.contents,
    p_estimated_delivery: s.estimatedDelivery,
    p_booked_location: `${s.originCity}, ${countryName(s.originCountry)}`,
    p_booked_offset_minutes: offsetMinutesAt(zone, new Date()),
  });

  if (error || typeof trackingNumber !== "string") {
    if (error) logDatabaseError("create shipment", error);
    return failed(
      values,
      error ? databaseMessage(error) : "Could not create the shipment.",
    );
  }

  updateTag(shipmentCacheTag(trackingNumber));
  redirect(`/admin/shipments/${trackingNumber}?created=1`);
}

// ---------------------------------------------------------------------------

export async function addTrackingEvent(
  trackingNumber: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = addEventSchema.safeParse(values);
  if (!parsed.success) return invalid(values, fieldErrors(parsed.error));

  const supabase = await adminClientForAction();
  if (!supabase) return notAllowed(values);

  const id = await shipmentId(supabase, trackingNumber);
  if (!id) return failed(values, "That shipment no longer exists.");

  const e = parsed.data;
  const zone = resolveTimeZone(e.country, e.timeZone);
  const instant = e.occurredAt ? wallTimeToInstant(e.occurredAt, zone) : new Date();

  const { error } = await supabase.from("tracking_events").insert({
    shipment_id: id,
    stage: e.stage,
    occurred_at: instant.toISOString(),
    local_offset_minutes: offsetMinutesAt(zone, instant),
    location: `${e.city}, ${countryName(e.country)}`,
    note: e.note,
  });

  if (error) {
    logDatabaseError("add tracking event", error);
    return failed(values, databaseMessage(error));
  }

  updateTag(shipmentCacheTag(trackingNumber));
  return saved("Update posted. The public tracking page shows it now.");
}

// ---------------------------------------------------------------------------

export async function removeLatestEvent(trackingNumber: string): Promise<FormState> {
  const supabase = await adminClientForAction();
  if (!supabase) return notAllowed({});

  const id = await shipmentId(supabase, trackingNumber);
  if (!id) return failed({}, "That shipment no longer exists.");

  const { data: latest } = await supabase
    .from("tracking_events")
    .select("id")
    .eq("shipment_id", id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return failed({}, "There is no scan to remove.");

  const { error, count } = await supabase
    .from("tracking_events")
    .delete({ count: "exact" })
    .eq("id", latest.id);

  if (error) {
    logDatabaseError("remove latest event", error);
    return failed({}, databaseMessage(error));
  }
  if (count === 0) return failed({}, "The scan could not be removed.");

  updateTag(shipmentCacheTag(trackingNumber));
  return saved("Latest scan removed.");
}

// ---------------------------------------------------------------------------

export async function updateShipmentDetails(
  trackingNumber: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = updateDetailsSchema.safeParse(values);
  if (!parsed.success) return invalid(values, fieldErrors(parsed.error));

  const supabase = await adminClientForAction();
  if (!supabase) return notAllowed(values);

  const d = parsed.data;
  const { error, count } = await supabase
    .from("shipments")
    .update(
      {
        carrier: d.carrier,
        weight_kg: d.weightKg,
        pieces: d.pieces,
        contents: d.contents,
        estimated_delivery: d.estimatedDelivery,
      },
      { count: "exact" },
    )
    .eq("tracking_number", trackingNumber);

  if (error) {
    logDatabaseError("update details", error);
    return failed(values, databaseMessage(error));
  }
  if (count === 0) return failed(values, "That shipment no longer exists.");

  updateTag(shipmentCacheTag(trackingNumber));
  return { ...saved("Details saved."), values };
}

// ---------------------------------------------------------------------------

export async function cancelShipment(
  trackingNumber: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = cancelSchema.safeParse(values);
  if (!parsed.success) return invalid(values, fieldErrors(parsed.error));

  const supabase = await adminClientForAction();
  if (!supabase) return notAllowed(values);

  const { error, count } = await supabase
    .from("shipments")
    .update(
      { cancelled_at: new Date().toISOString(), cancel_reason: parsed.data.reason },
      { count: "exact" },
    )
    .eq("tracking_number", trackingNumber)
    .is("cancelled_at", null);

  if (error) {
    logDatabaseError("cancel shipment", error);
    return failed(values, databaseMessage(error));
  }
  if (count === 0) return failed(values, "This shipment is already cancelled.");

  updateTag(shipmentCacheTag(trackingNumber));
  return saved("Shipment cancelled.");
}
