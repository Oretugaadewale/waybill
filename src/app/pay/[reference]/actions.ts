"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isBookingReference } from "@/lib/bookings/admin";
import {
  amountToCharge,
  loadBookingForPayment,
  paymentsConfigured,
  serverKey,
} from "@/lib/payments/booking-payment";
import { initializeTransaction, newPaystackReference } from "@/lib/payments/paystack";
import { createPublicClient } from "@/lib/supabase/server";

export interface PayState {
  error: string | null;
}

/**
 * Starts a Paystack checkout for a booking. The amount comes from the rate
 * card and the booking in the database, never from the browser.
 */
export async function startPayment(reference: string): Promise<PayState> {
  if (!isBookingReference(reference) || !paymentsConfigured()) {
    return { error: "Online payment is not available right now." };
  }

  const booking = await loadBookingForPayment(reference);
  if (!booking) return { error: "We could not find that booking." };
  if (booking.status !== "awaiting_payment") {
    return { error: "This booking is not waiting for payment." };
  }

  const amount = amountToCharge(booking);
  if (!amount.ok) return { error: amount.reason };

  const paystackReference = newPaystackReference(reference);
  const { error } = await createPublicClient().rpc("start_payment", {
    p_server_key: serverKey(),
    p_reference: reference,
    p_paystack_reference: paystackReference,
    p_amount_minor: amount.amountMinor,
  });
  if (error) {
    if (error.code === "P0001") return { error: error.message };
    console.error("[pay] start_payment failed", error);
    return { error: "We could not start the payment. Try again in a minute." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return { error: "We could not start the payment. Try again in a minute." };

  let checkoutUrl: string;
  try {
    ({ authorizationUrl: checkoutUrl } = await initializeTransaction({
      email: booking.senderEmail,
      amountMinor: amount.amountMinor,
      reference: paystackReference,
      callbackUrl: `${proto}://${host}/pay/${reference}/callback`,
      bookingReference: reference,
    }));
  } catch (err) {
    console.error("[pay] Paystack initialize failed", err);
    return { error: "Paystack did not respond. Try again in a minute." };
  }

  redirect(checkoutUrl);
}
