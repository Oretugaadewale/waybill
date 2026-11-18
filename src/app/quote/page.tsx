import type { Metadata } from "next";
import { Suspense } from "react";
import { emptyQuoteValues, quoteValuesFromParams } from "@/components/quote/quote-values";
import { QuoteCalculator } from "./quote-calculator";

export const metadata: Metadata = {
  title: "Get a quote",
  description: "Price a shipment from Nigeria or China in seconds, by air or sea.",
};

export default function QuotePage({ searchParams }: PageProps<"/quote">) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        What will it cost?
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Air from Nigeria or China to any country. Sea from Nigeria to the United States,
        Canada and the United Kingdom. Priced per kilo, in naira.
      </p>
      <div className="mt-10">
        <Suspense fallback={<QuoteCalculator initial={emptyQuoteValues} />}>
          <QuoteWithParams searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function QuoteWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/quote">["searchParams"];
}) {
  return <QuoteCalculator initial={quoteValuesFromParams(await searchParams)} />;
}
