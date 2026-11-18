"use client";

import Link from "next/link";
import { useState } from "react";
import { QuoteFields, type QuoteFormValues } from "@/components/quote/quote-fields";
import { liveQuote } from "@/components/quote/live-quote";
import { QuoteSummary } from "@/components/quote/quote-summary";

export function QuoteCalculator({ initial }: { initial: QuoteFormValues }) {
  const [values, setValues] = useState(initial);
  const live = liveQuote(values);
  const bookHref = `/book?${new URLSearchParams(
    Object.entries(values).filter(([, v]) => v !== ""),
  ).toString()}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <form
        className="rounded-sm border-2 border-ink bg-paper p-5 sm:p-6"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Shipment details for the quote"
      >
        <QuoteFields values={values} onChange={setValues} />
      </form>

      <section
        aria-labelledby="price-heading"
        className="lg:sticky lg:top-6 lg:self-start"
      >
        <h2 id="price-heading" className="sr-only">
          Your price
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
        {live.quote ? (
          <Link
            href={bookHref}
            className="mt-4 flex min-h-12 items-center justify-center rounded-sm bg-ink px-6 font-semibold text-paper hover:bg-ink/90"
          >
            Book this shipment
          </Link>
        ) : null}
        <p className="mt-3 text-sm text-ink-soft">
          Prices are in naira and include VAT. Demo rates, not real prices.
        </p>
      </section>
    </div>
  );
}
