import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Money } from "@/components/money";
import { formatLagosDateTime, isBookingReference } from "@/lib/bookings/admin";
import {
  amountToCharge,
  loadBookingForPayment,
  paymentsConfigured,
  refreshOpenAttempt,
  type BookingForPayment,
} from "@/lib/payments/booking-payment";
import { countryName } from "@/lib/places";
import { formatMoney } from "@/lib/pricing/quote";
import { RATE_CARD, type OriginCountry } from "@/lib/pricing/rate-card";
import { PayButton } from "./pay-button";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

const RESULT_MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  paid: { tone: "ok", text: "Payment received. Thank you." },
  failed: {
    tone: "warn",
    text: "Your card was declined, so you have not been charged. Try again or use another card.",
  },
  abandoned: { tone: "warn", text: "The payment was not finished. You can try again." },
  pending: {
    tone: "warn",
    text: "We are still waiting for Paystack to confirm the payment. Refresh this page in a minute.",
  },
  refund_needed: {
    tone: "warn",
    text: "We received your payment, but this booking was no longer open for payment. Our team has been alerted and will refund you.",
  },
  unknown: { tone: "warn", text: "We could not match that payment to this booking." },
};

export default function PayPage({ params, searchParams }: PageProps<"/pay/[reference]">) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<p className="text-ink-soft">Loading your booking</p>}>
        <PayContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PayContent({
  params,
  searchParams,
}: Pick<PageProps<"/pay/[reference]">, "params" | "searchParams">) {
  await connection();
  const reference = decodeURIComponent((await params).reference).toUpperCase();
  if (!isBookingReference(reference)) notFound();

  if (!paymentsConfigured()) {
    return (
      <Shell reference={reference}>
        <p>Online payment is not switched on in this copy of Waybill.</p>
      </Shell>
    );
  }

  let booking = await loadBookingForPayment(reference);
  if (!booking) notFound();

  // A customer who was declined usually just closes Paystack's page, so find
  // out what happened to their last attempt before showing the booking.
  const refreshed = await refreshOpenAttempt(booking);
  if (refreshed === "paid" || refreshed === "failed") {
    booking = (await loadBookingForPayment(reference)) ?? booking;
  }

  const param = (await searchParams).result;
  const result =
    typeof param === "string"
      ? param
      : booking.status === "awaiting_payment" &&
          booking.latestAttempt?.status === "failed"
        ? "failed"
        : undefined;
  const banner = result ? RESULT_MESSAGES[result] : undefined;
  const amount = amountToCharge(booking);

  return (
    <Shell reference={reference}>
      {banner && !(result === "failed" && booking.status !== "awaiting_payment") ? (
        <p
          role="status"
          className={
            banner.tone === "ok"
              ? "rounded-sm bg-signal-soft px-4 py-3 font-medium text-signal"
              : "rounded-sm border-2 border-ink bg-tape px-4 py-3 font-medium"
          }
        >
          {banner.text}
        </p>
      ) : null}

      {booking.trackingNumber ? (
        <TrackingNumberCard trackingNumber={booking.trackingNumber} />
      ) : null}

      <dl className="divide-y divide-rule rounded-sm border-2 border-ink bg-paper px-5 text-sm">
        <Row label="Service">{booking.service}</Row>
        <Row label="Route">
          {countryName(booking.originCountry)} to {booking.destinationCity},{" "}
          {countryName(booking.destinationCountry)}
        </Row>
        <Row label="Weight">{Number(booking.weightKg)} kg</Row>
        <Row label="Total">
          <span className="font-mono text-lg font-semibold">
            <Money minor={Number(booking.totalMinor)} />
          </span>{" "}
          <span className="text-ink-soft">including VAT</span>
        </Row>
      </dl>

      <NextStep booking={booking} amount={amount} />

      <p>
        <Link href="/" className="font-medium underline underline-offset-4">
          Back to tracking
        </Link>
      </p>
    </Shell>
  );
}

function NextStep({
  booking,
  amount,
}: {
  booking: BookingForPayment;
  amount: ReturnType<typeof amountToCharge>;
}) {
  if (booking.status === "awaiting_payment") {
    return amount.ok ? (
      <div className="flex flex-col gap-3">
        <PayButton
          reference={booking.reference}
          label={`Pay ${formatMoney(amount.amountMinor)} with Paystack`}
        />
        <p className="text-sm text-ink-soft">
          You will pay on Paystack&apos;s secure page by card, bank transfer or USSD, then
          come back here. This demo uses Paystack test mode, so no real money moves.
        </p>
      </div>
    ) : (
      <p className="rounded-sm border-2 border-red-700 bg-paper px-4 py-3 font-medium text-red-700">
        {amount.reason}
      </p>
    );
  }

  if (booking.status === "declined") {
    return (
      <p>
        This booking was declined, so it cannot be paid. Contact us if you have questions.
      </p>
    );
  }

  const hub = RATE_CARD[booking.originCountry as OriginCountry]?.hub;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-semibold">
        Paid{booking.paidAt ? ` on ${formatLagosDateTime(booking.paidAt)}` : ""}.
      </p>
      {booking.trackingNumber ? (
        <p className="text-ink-soft">
          Your package is checked in. Follow it with the tracking number above.
        </p>
      ) : (
        <p className="text-ink-soft">
          {booking.collection === "drop_off"
            ? `Bring your package to ${hub?.dropOff ?? "our office"} and quote your booking reference.`
            : `A courier will call you to arrange the pickup in ${hub?.city ?? "your city"}.`}{" "}
          Your tracking number will appear on this page once it is checked in.
        </p>
      )}
    </div>
  );
}

function TrackingNumberCard({ trackingNumber }: { trackingNumber: string }) {
  return (
    <div className="rounded-sm border-2 border-ink bg-tape px-5 py-4">
      <p className="text-sm font-medium">Your tracking number</p>
      <p className="font-mono text-3xl font-semibold tracking-wide">{trackingNumber}</p>
      <Link
        href={`/track/${trackingNumber}`}
        className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-ink px-5 font-semibold text-paper hover:bg-ink/90"
      >
        Track your shipment
      </Link>
    </div>
  );
}

function Shell({ reference, children }: { reference: string; children: ReactNode }) {
  return (
    <>
      <p className="text-sm text-ink-soft">Booking</p>
      <h1 className="font-mono text-3xl font-semibold tracking-wide sm:text-4xl">
        {reference}
      </h1>
      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
