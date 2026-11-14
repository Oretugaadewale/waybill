import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { isBookingReference, formatLagosDateTime } from "@/lib/bookings/admin";
import {
  amountToCharge,
  loadBookingForPayment,
  paymentsConfigured,
} from "@/lib/payments/booking-payment";
import { countryName } from "@/lib/places";
import { formatMoney } from "@/lib/pricing/quote";
import { PayButton } from "./pay-button";

export const metadata: Metadata = {
  title: "Pay for your booking",
  robots: { index: false, follow: false },
};

const RESULT_MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  paid: { tone: "ok", text: "Payment received. Thank you." },
  failed: {
    tone: "warn",
    text: "The payment did not go through. You have not been charged; try again.",
  },
  abandoned: { tone: "warn", text: "The payment was not finished. You can try again." },
  pending: {
    tone: "warn",
    text: "We are still waiting for Paystack to confirm the payment. Refresh this page in a minute.",
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

  const booking = await loadBookingForPayment(reference);
  if (!booking) notFound();

  const result = (await searchParams).result;
  const banner = typeof result === "string" ? RESULT_MESSAGES[result] : undefined;
  const amount = amountToCharge(booking);

  return (
    <Shell reference={reference}>
      {banner ? (
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

      <dl className="divide-y divide-rule rounded-sm border-2 border-ink bg-paper px-5 text-sm">
        <Row label="Service">{booking.service}</Row>
        <Row label="Route">
          {countryName(booking.originCountry)} to {booking.destinationCity},{" "}
          {countryName(booking.destinationCountry)}
        </Row>
        <Row label="Weight">{Number(booking.weightKg)} kg</Row>
        <Row label="Total">
          <span className="font-mono text-lg font-semibold">
            {formatMoney(Number(booking.totalMinor))}
          </span>{" "}
          <span className="text-ink-soft">including VAT</span>
        </Row>
      </dl>

      {booking.status === "awaiting_payment" ? (
        amount.ok ? (
          <div className="flex flex-col gap-3">
            <PayButton
              reference={reference}
              label={`Pay ${formatMoney(amount.amountMinor)} with Paystack`}
            />
            <p className="text-sm text-ink-soft">
              You will pay on Paystack&apos;s secure page by card, bank transfer or USSD,
              then come back here. This demo uses Paystack test mode, so use a test card;
              no real money moves.
            </p>
          </div>
        ) : (
          <p className="rounded-sm border-2 border-red-700 bg-paper px-4 py-3 font-medium text-red-700">
            {amount.reason}
          </p>
        )
      ) : booking.status === "paid" || booking.status === "converted" ? (
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold">
            Paid{booking.paidAt ? ` on ${formatLagosDateTime(booking.paidAt)}` : ""}.
          </p>
          <p className="text-ink-soft">
            {booking.collection === "drop_off"
              ? "Bring your package to the office and quote your booking reference."
              : "A courier will call you to arrange the pickup."}{" "}
            You will get a tracking number once it is checked in.
          </p>
        </div>
      ) : (
        <p>
          This booking was declined, so it cannot be paid. Contact us if you have
          questions.
        </p>
      )}

      <p>
        <Link href="/" className="font-medium underline underline-offset-4">
          Back to tracking
        </Link>
      </p>
    </Shell>
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
