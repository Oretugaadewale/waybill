import { SampleList } from "@/components/sample-list";
import { TrackingForm } from "@/components/tracking-form";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function ShipmentNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        No shipment matches that tracking number
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        Check the number on your receipt and try again. Tracking numbers have a WB prefix,
        four digits and a country code, like WB-4821-NG.
      </p>
      <div className="mt-8">
        <TrackingForm />
      </div>
      {getSupabaseEnv() ? null : (
        <div className="mt-10">
          <h2 className="text-base font-semibold">Sample tracking numbers</h2>
          <div className="mt-3">
            <SampleList />
          </div>
        </div>
      )}
    </div>
  );
}
