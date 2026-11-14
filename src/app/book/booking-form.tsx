"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/form/fields";
import { liveQuote } from "@/components/quote/live-quote";
import { QuoteFields, type QuoteFormValues } from "@/components/quote/quote-fields";
import { QuoteSummary } from "@/components/quote/quote-summary";
import { initialBookingState, type BookingState } from "@/lib/bookings/state";
import { formatMoney } from "@/lib/pricing/quote";
import { RATE_CARD } from "@/lib/pricing/rate-card";
import { submitBooking } from "./actions";

const section = "rounded-sm border-2 border-ink bg-paper p-5 sm:p-6";

interface BookingFormProps {
  initial: QuoteFormValues;
  startedAt: number;
}

export function BookingForm({ initial, startedAt }: BookingFormProps) {
  const [state, formAction, pending] = useActionState(submitBooking, initialBookingState);
  const [quoteValues, setQuoteValues] = useState<QuoteFormValues>(initial);
  const live = liveQuote(quoteValues);
  const e = state.errors;
  const v = state.values;
  const hub =
    RATE_CARD[quoteValues.originCountry as "NG" | "CN"]?.hub ?? RATE_CARD.NG.hub;

  if (state.ok && state.booking) return <Confirmation booking={state.booking} />;

  const text = (
    name: string,
    label: string,
    opts: {
      hint?: string;
      type?: string;
      autoComplete?: string;
      inputMode?: "decimal" | "numeric" | "tel" | "email";
      optional?: boolean;
      textarea?: boolean;
      className?: string;
    } = {},
  ): ReactNode => (
    <Field
      id={name}
      label={opts.optional ? `${label} (optional)` : label}
      hint={opts.hint}
      error={e[name]}
      className={opts.className}
    >
      {(describedBy, invalid) =>
        opts.textarea ? (
          <textarea
            id={name}
            name={name}
            rows={2}
            defaultValue={v[name] ?? ""}
            autoComplete={opts.autoComplete}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`${inputClass} py-3`}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={opts.type ?? "text"}
            inputMode={opts.inputMode}
            defaultValue={v[name] ?? ""}
            autoComplete={opts.autoComplete}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        )
      }
    </Field>
  );

  return (
    <form
      action={formAction}
      noValidate
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"
    >
      <div className="flex flex-col gap-8">
        <FormMessage ok={state.ok} message={state.message} />

        <section aria-labelledby="shipment-heading" className={section}>
          <h2 id="shipment-heading" className="mb-5 text-xl font-bold">
            The shipment
          </h2>
          <QuoteFields values={quoteValues} onChange={setQuoteValues} errors={e} />
          {quoteValues.collection === "pickup" ? (
            <div className="mt-5">
              {text("pickupAddress", `Pickup address in ${hub.city}`, {
                textarea: true,
                autoComplete: "street-address",
              })}
            </div>
          ) : null}
        </section>

        <section aria-labelledby="package-heading" className={section}>
          <h2 id="package-heading" className="mb-5 text-xl font-bold">
            {"What's inside"}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {text("contents", "Contents", {
              hint: "For customs, e.g. Ankara fabric and shea butter.",
              className: "sm:col-span-2",
            })}
            {text("pieces", "Number of boxes", { inputMode: "numeric" })}
            {text("declaredValue", "Value in naira", {
              inputMode: "decimal",
              hint: "What the goods are worth. Use 0 for documents.",
            })}
          </div>
        </section>

        <section aria-labelledby="sender-heading" className={section}>
          <h2 id="sender-heading" className="mb-5 text-xl font-bold">
            Sender
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {text("senderName", "Full name", {
              autoComplete: "name",
              className: "sm:col-span-2",
            })}
            {text("senderPhone", "Phone", { type: "tel", autoComplete: "tel" })}
            {text("senderEmail", "Email", {
              type: "email",
              autoComplete: "email",
              hint: "For the booking confirmation.",
            })}
          </div>
        </section>

        <section aria-labelledby="receiver-heading" className={section}>
          <h2 id="receiver-heading" className="mb-5 text-xl font-bold">
            Receiver
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {text("receiverName", "Full name", { className: "sm:col-span-2" })}
            {text("receiverPhone", "Phone", {
              type: "tel",
              hint: "With the country code, e.g. +44.",
            })}
            {text("receiverEmail", "Email", { type: "email", optional: true })}
            {text("destinationCity", "City", { className: "sm:col-span-2" })}
            {text("receiverAddress", "Delivery address", {
              textarea: true,
              hint: "Street, area and postcode.",
              className: "sm:col-span-2",
            })}
          </div>
        </section>

        {/* Spam traps: hidden from people, filled by bots. */}
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-px w-px overflow-hidden"
        >
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <input type="hidden" name="startedAt" value={startedAt} />
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="lg:sticky lg:top-6 lg:self-start"
      >
        <h2 id="summary-heading" className="sr-only">
          Price
        </h2>
        <div aria-live="polite">
          {live.quote ? (
            <QuoteSummary quote={live.quote} />
          ) : (
            <div className="rounded-sm border-2 border-dashed border-ink px-5 py-8 text-ink-soft">
              {live.prompt}
            </div>
          )}
        </div>
        <div className="mt-4">
          <SubmitButton pending={pending} pendingText="Sending booking">
            {live.quote
              ? `Book for ${formatMoney(live.quote.totalMinor)}`
              : "Book shipment"}
          </SubmitButton>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          You pay after booking. The price is checked again when you submit. Demo rates,
          not real prices.
        </p>
      </aside>
    </form>
  );
}

function Confirmation({ booking }: { booking: NonNullable<BookingState["booking"]> }) {
  return (
    <div role="status" className="max-w-2xl">
      <div className="overflow-hidden rounded-sm border-2 border-ink bg-paper shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="border-b-2 border-ink bg-tape px-5 py-4 sm:px-8">
          <p className="text-sm font-medium">Booking received</p>
          <p className="font-mono text-3xl font-semibold tracking-wide">
            {booking.reference}
          </p>
        </div>
        <div className="flex flex-col gap-4 px-5 py-6 sm:px-8">
          <p>
            Keep this reference. Your total is{" "}
            <strong>{formatMoney(booking.quote.totalMinor)}</strong>, including VAT.
          </p>
          {booking.dropOff ? (
            <p>Bring your package to {booking.dropOff} and quote the reference.</p>
          ) : (
            <p>
              We will collect from {booking.pickupAddress}. A courier will call{" "}
              {booking.senderPhone} to arrange a time.
            </p>
          )}
          <Link
            href={`/pay/${booking.reference}`}
            className="flex min-h-12 items-center justify-center rounded-sm bg-ink px-6 font-semibold text-paper hover:bg-ink/90"
          >
            Pay {formatMoney(booking.quote.totalMinor)} now
          </Link>
          <p className="text-sm text-ink-soft">
            You can also pay later at /pay/{booking.reference}. Once it is paid and
            checked in, you will get a tracking number to follow its journey.
          </p>
        </div>
      </div>
      <p className="mt-6">
        <Link href="/quote" className="font-medium underline underline-offset-4">
          Price another shipment
        </Link>
      </p>
    </div>
  );
}
