import Link from "next/link";
import { SampleList } from "@/components/sample-list";
import { TrackingForm } from "@/components/tracking-form";
import { WaybillCard } from "@/components/waybill-card";
import { getShipment } from "@/lib/shipments/repository";
import { getSupabaseEnv } from "@/lib/supabase/env";

const STEPS = [
  {
    title: "Get a price",
    body: "Air from Nigeria or China to any country, or sea to the US, Canada and UK. Priced per kilo, in naira.",
    href: "/quote",
    link: "Get a quote",
  },
  {
    title: "Book and pay",
    body: "Drop your package at our Lagos office in Ojota, or we pick it up. Pay securely with Paystack.",
    href: "/book",
    link: "Book a shipment",
  },
  {
    title: "Track every scan",
    body: "Once it is checked in you get a tracking number, and every scan shows here in local time.",
    href: null,
    link: null,
  },
];

export default async function HomePage() {
  // With a real database the home page shows only real data; the bundled
  // samples are for running the project without one.
  const live = Boolean(getSupabaseEnv());
  const preview = live ? null : await getShipment("WB-3150-CA");

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-20">
      <section aria-labelledby="track-heading" className="flex flex-col gap-8">
        <div>
          <h1
            id="track-heading"
            className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Where is my package?
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-soft">
            Enter your tracking number to see where your shipment is, every scan on its
            journey, and when it should arrive.
          </p>
        </div>

        <TrackingForm />

        <p className="text-ink-soft">
          Sending something?{" "}
          <Link
            href="/quote"
            className="font-semibold text-ink underline underline-offset-4"
          >
            Get a price in seconds
          </Link>{" "}
          or{" "}
          <Link
            href="/book"
            className="font-semibold text-ink underline underline-offset-4"
          >
            book a shipment
          </Link>
          .
        </p>

        {live ? null : (
          <div>
            <h2 className="text-base font-semibold">No receipt? Try a sample</h2>
            <p className="mt-1 text-sm text-ink-soft">
              This is a demo. Each sample is at a different stage of its journey.
            </p>
            <div className="mt-4">
              <SampleList />
            </div>
          </div>
        )}
      </section>

      {preview ? (
        <section aria-label="Example tracking result" className="lg:pt-2">
          <WaybillCard shipment={preview} headingLevel="h2" />
        </section>
      ) : (
        <section aria-labelledby="how-heading" className="lg:pt-2">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <ol className="mt-6 flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.5rem_1fr] gap-4 rounded-sm border-2 border-ink bg-paper p-5"
              >
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-sm bg-tape font-mono font-semibold"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-ink-soft">{step.body}</p>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="mt-2 inline-block font-semibold underline underline-offset-4"
                    >
                      {step.link}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
