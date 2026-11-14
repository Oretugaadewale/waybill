import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Timeline } from "@/components/timeline";
import { WaybillCard } from "@/components/waybill-card";
import { getShipment } from "@/lib/shipments/repository";
import {
  STAGE_LABELS,
  currentStage,
  eventsNewestFirst,
  listSampleTrackingNumbers,
  normalizeTrackingNumber,
} from "@/lib/shipments/tracking";

export function generateStaticParams() {
  return listSampleTrackingNumbers().map((trackingNumber) => ({ trackingNumber }));
}

export async function generateMetadata({
  params,
}: PageProps<"/track/[trackingNumber]">): Promise<Metadata> {
  const { trackingNumber } = await params;
  const shipment = await getShipment(
    normalizeTrackingNumber(decodeURIComponent(trackingNumber)),
  );
  if (!shipment) return { title: "Shipment not found" };
  return {
    title: `${shipment.trackingNumber}: ${
      shipment.cancelledAt ? "Cancelled" : STAGE_LABELS[currentStage(shipment)]
    }`,
  };
}

async function TrackPageContent({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}) {
  const { trackingNumber: raw } = await params;
  const requested = decodeURIComponent(raw);
  const canonical = normalizeTrackingNumber(requested);

  // Keep one URL per shipment: /track/wb1042us -> /track/WB-1042-US
  if (canonical !== requested) {
    redirect(`/track/${encodeURIComponent(canonical)}`);
  }

  const shipment = await getShipment(canonical);
  if (!shipment) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Track another shipment
      </Link>

      <div className="mt-6">
        <WaybillCard shipment={shipment} />
      </div>

      <section aria-labelledby="history-heading" className="mt-12">
        <h2 id="history-heading" className="text-2xl font-bold tracking-tight">
          Journey so far
        </h2>
        <p className="mt-1 text-ink-soft">
          Every scan, newest first. Times are local to where the scan happened.
        </p>
        <div className="mt-6 rounded-sm border border-rule bg-paper p-5 sm:p-8">
          <Timeline events={eventsNewestFirst(shipment)} />
        </div>
      </section>
    </div>
  );
}

export default function TrackPage({ params }: PageProps<"/track/[trackingNumber]">) {
  return (
    <Suspense fallback={<TrackPageSkeleton />}>
      <TrackPageContent params={params} />
    </Suspense>
  );
}

function TrackPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14" aria-busy="true">
      <p className="sr-only">Loading shipment</p>
      <div className="h-4 w-44 rounded-sm bg-rule" />
      <div className="mt-6 h-[28rem] rounded-sm border-2 border-ink bg-paper" />
    </div>
  );
}
