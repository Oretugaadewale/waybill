"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { databaseMessage, type FormState } from "@/lib/admin/form-state";
import { adminClientForAction } from "@/lib/admin/session";
import { isBookingReference } from "@/lib/bookings/admin";
import { countryName, offsetMinutesAt } from "@/lib/places";
import { RATE_CARD, type OriginCountry } from "@/lib/pricing/rate-card";
import { fieldErrors, formValues } from "@/lib/shipments/admin-schemas";
import { shipmentCacheTag } from "@/lib/shipments/repository";

const hub = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use the three-letter airport or port code, like LHR.");

const convertSchema = z.object({
  originHub: hub,
  destinationHub: hub,
  carrier: z
    .string()
    .trim()
    .min(1, "Enter the carrier.")
    .max(80, "Keep it under 81 characters."),
  estimatedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
});

const declineSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Enter a reason for the record.")
    .max(300, "Keep it under 301 characters."),
});

const ORIGIN_TIME_ZONE: Record<OriginCountry, string> = {
  NG: "Africa/Lagos",
  CN: "Asia/Shanghai",
};

const stateWith = (
  ok: boolean,
  message: string,
  values: Record<string, string>,
  errors: Record<string, string> = {},
): FormState => ({ ok, message, errors, values, savedAt: ok ? Date.now() : 0 });

export async function convertBooking(
  reference: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = convertSchema.safeParse(values);
  if (!parsed.success) {
    return stateWith(
      false,
      "Some fields need fixing.",
      values,
      fieldErrors(parsed.error),
    );
  }
  if (!isBookingReference(reference))
    return stateWith(false, "That booking does not exist.", values);

  const supabase = await adminClientForAction();
  if (!supabase) return stateWith(false, "Sign in again as an admin.", values);

  const { data: booking } = await supabase
    .from("bookings")
    .select("origin_country")
    .eq("reference", reference)
    .maybeSingle();
  const origin = booking?.origin_country as OriginCountry | undefined;
  if (!origin || !RATE_CARD[origin])
    return stateWith(false, "That booking does not exist.", values);

  const originCity = RATE_CARD[origin].hub.city;
  const { data: trackingNumber, error } = await supabase.rpc("convert_booking", {
    p_reference: reference,
    p_origin_city: originCity,
    p_origin_hub: parsed.data.originHub,
    p_destination_hub: parsed.data.destinationHub,
    p_carrier: parsed.data.carrier,
    p_estimated_delivery: parsed.data.estimatedDelivery,
    p_booked_location: `${originCity}, ${countryName(origin)}`,
    p_booked_offset_minutes: offsetMinutesAt(ORIGIN_TIME_ZONE[origin], new Date()),
  });

  if (error || typeof trackingNumber !== "string") {
    if (error && error.code !== "P0001")
      console.error("[admin] convert booking failed", error);
    return stateWith(
      false,
      error ? databaseMessage(error) : "Could not create the shipment.",
      values,
    );
  }

  updateTag(shipmentCacheTag(trackingNumber));
  redirect(`/admin/shipments/${trackingNumber}?created=1`);
}

export async function declineBooking(
  reference: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = declineSchema.safeParse(values);
  if (!parsed.success) {
    return stateWith(
      false,
      "Some fields need fixing.",
      values,
      fieldErrors(parsed.error),
    );
  }

  const supabase = await adminClientForAction();
  if (!supabase) return stateWith(false, "Sign in again as an admin.", values);

  const { error, count } = await supabase
    .from("bookings")
    .update(
      { status: "declined", decline_reason: parsed.data.reason },
      { count: "exact" },
    )
    .eq("reference", reference)
    .in("status", ["awaiting_payment", "paid"]);

  if (error) {
    if (error.code !== "P0001") console.error("[admin] decline booking failed", error);
    return stateWith(false, databaseMessage(error), values);
  }
  if (count === 0) return stateWith(false, "This booking is already closed.", values);

  redirect(`/admin/bookings/${reference}`);
}
