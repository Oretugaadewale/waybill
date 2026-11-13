import { SampleList } from "@/components/sample-list";
import { TrackingForm } from "@/components/tracking-form";
import { WaybillCard } from "@/components/waybill-card";
import { findShipment } from "@/lib/shipments/tracking";

export default function HomePage() {
  const preview = findShipment("WB-3150-CA")!;

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
            Enter your tracking number to see where your shipment is, every scan
            on its journey, and when it should arrive.
          </p>
        </div>

        <TrackingForm />

        <div>
          <h2 className="text-base font-semibold">No receipt? Try a sample</h2>
          <p className="mt-1 text-sm text-ink-soft">
            This is a demo. Each sample is at a different stage of its journey.
          </p>
          <div className="mt-4">
            <SampleList />
          </div>
        </div>
      </section>

      <section aria-label="Example tracking result" className="lg:pt-2">
        <WaybillCard shipment={preview} headingLevel="h2" />
      </section>
    </div>
  );
}
