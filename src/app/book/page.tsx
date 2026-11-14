import type { Metadata } from "next";
import { Suspense } from "react";
import { quoteValuesFromParams } from "@/components/quote/quote-fields";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book a shipment",
  description: "Book a shipment from Nigeria or China and see the price as you go.",
};

export default function BookPage({ searchParams }: PageProps<"/book">) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Book a shipment</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Tell us what you are sending and where. The price updates as you fill in the form.
      </p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-ink-soft">Loading the form</p>}>
          <BookingFormWithParams searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function BookingFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/book">["searchParams"];
}) {
  const initial = quoteValuesFromParams(await searchParams);
  return <BookingForm initial={initial} startedAt={formOpenedAt()} />;
}

/** When the form was served; the action rejects forms sent back too fast. */
function formOpenedAt(): number {
  return Date.now();
}
