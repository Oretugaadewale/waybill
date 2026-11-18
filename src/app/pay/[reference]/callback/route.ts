import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment, paymentsConfigured } from "@/lib/payments/booking-payment";
import { bookingReferenceOf } from "@/lib/payments/paystack";

/**
 * Paystack sends the customer back here after checkout with ?reference=...
 * The query string proves nothing, so we ask Paystack what really happened
 * before recording anything, then show the booking's payment page.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/pay/[reference]/callback">,
) {
  const { reference } = await params;
  const paystackReference = request.nextUrl.searchParams.get("reference") ?? "";
  const back = (result: string) =>
    NextResponse.redirect(new URL(`/pay/${reference}?result=${result}`, request.url));

  if (!paymentsConfigured() || bookingReferenceOf(paystackReference) !== reference) {
    return back("unknown");
  }

  try {
    const outcome = await confirmPayment(paystackReference);
    return back(
      outcome === "already_paid" || outcome === "refund_needed" ? "paid" : outcome,
    );
  } catch (err) {
    console.error("[pay] callback verification failed", err);
    return back("pending");
  }
}
