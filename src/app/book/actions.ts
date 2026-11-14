"use server";

import { bookingSchema, toQuoteInput } from "@/lib/bookings/schema";
import type { BookingState } from "@/lib/bookings/state";
import { calculateQuote } from "@/lib/pricing/quote";
import { RATE_CARD } from "@/lib/pricing/rate-card";
import { fieldErrors, formValues } from "@/lib/shipments/admin-schemas";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/server";

const MIN_FILL_MS = 3_000;
const MAX_FILL_MS = 24 * 60 * 60 * 1_000;

export async function submitBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const values = formValues(formData);
  const fail = (message: string, errors: Record<string, string> = {}): BookingState => ({
    ok: false,
    message,
    errors,
    values,
    booking: null,
  });

  // Bots fill every field and submit instantly; people do neither.
  const startedAt = Number(values.startedAt);
  const elapsed = Date.now() - startedAt;
  if (
    values.website ||
    !Number.isFinite(startedAt) ||
    elapsed < MIN_FILL_MS ||
    elapsed > MAX_FILL_MS
  ) {
    return fail("We could not send your booking. Reload the page and try again.");
  }

  const parsed = bookingSchema.safeParse(values);
  if (!parsed.success) {
    return fail(
      "Some details need fixing. Check the messages below each field.",
      fieldErrors(parsed.error),
    );
  }
  const d = parsed.data;

  // The price is always worked out here, never taken from the browser.
  const priced = calculateQuote(toQuoteInput(d));
  if (!priced.ok) return fail(priced.message, { [priced.field]: priced.message });
  const quote = priced.quote;

  if (!getSupabaseEnv()) {
    return fail(
      "Bookings are switched off in this copy because the database is not connected.",
    );
  }

  const { data: reference, error } = await createPublicClient().rpc("submit_booking", {
    p_service: d.service,
    p_origin_country: d.originCountry,
    p_destination_country: d.destinationCountry,
    p_destination_city: d.destinationCity,
    p_weight_kg: d.weightKg,
    p_length_cm: d.length,
    p_width_cm: d.width,
    p_height_cm: d.height,
    p_pieces: d.pieces,
    p_contents: d.contents,
    p_declared_value_minor: Math.round(d.declaredValue * 100),
    p_collection: d.collection,
    p_pickup_address: d.collection === "pickup" ? (d.pickupAddress ?? "") : "",
    p_sender_name: d.senderName,
    p_sender_phone: d.senderPhone,
    p_sender_email: d.senderEmail,
    p_receiver_name: d.receiverName,
    p_receiver_phone: d.receiverPhone,
    p_receiver_email: d.receiverEmail ?? "",
    p_receiver_address: d.receiverAddress,
    p_quote: quote,
    p_total_minor: quote.totalMinor,
    p_rate_card_version: quote.rateCardVersion,
  });

  if (error || typeof reference !== "string") {
    if (error?.code === "P0001") return fail(error.message);
    if (error) console.error("[book] submit_booking failed", error);
    return fail("We could not save your booking just now. Try again in a minute.");
  }

  const hub = RATE_CARD[d.originCountry].hub;
  return {
    ok: true,
    message: null,
    errors: {},
    values: {},
    booking: {
      reference,
      quote,
      dropOff: d.collection === "drop_off" ? hub.dropOff : null,
      pickupAddress: d.collection === "pickup" ? (d.pickupAddress ?? null) : null,
      senderPhone: d.senderPhone,
    },
  };
}
