import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment, paymentsConfigured } from "@/lib/payments/booking-payment";
import {
  bookingReferenceOf,
  isValidPaystackSignature,
  paystackSecretKey,
} from "@/lib/payments/paystack";

/**
 * Paystack calls this when a payment succeeds, even if the customer closed
 * the tab before coming back. The body is signed with our secret key; we
 * check the signature on the raw body, then verify with Paystack's API anyway
 * before marking anything paid.
 */
export async function POST(request: NextRequest) {
  const secret = paystackSecretKey();
  if (!secret || !paymentsConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (
    !isValidPaystackSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
      secret,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reference = event.data?.reference ?? "";
  // Other events, and payments that are not Waybill bookings, are acknowledged and ignored.
  if (event.event !== "charge.success" || !bookingReferenceOf(reference)) {
    return NextResponse.json({ received: true });
  }

  try {
    const outcome = await confirmPayment(reference);
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    // A 500 makes Paystack retry later, which is what we want if we could not record it.
    console.error("[webhook] could not confirm payment", err);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
