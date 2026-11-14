import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Timeline } from "@/components/timeline";
import { WaybillCard } from "@/components/waybill-card";
import { getAdminAccess } from "@/lib/admin/session";
import {
  ADMIN_DETAIL_SELECT,
  toAdminDetail,
  type AdminShipmentDetailRow,
} from "@/lib/admin/shipment-detail";
import { allowedNextStages } from "@/lib/shipments/rules";
import {
  STAGE_LABELS,
  currentStage,
  eventsNewestFirst,
  formatDate,
  formatEventTime,
  isValidTrackingNumber,
  normalizeTrackingNumber,
} from "@/lib/shipments/tracking";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  AdminLoading,
  AdminShell,
  NotAdmin,
  NotConnected,
} from "../../_components/admin-shell";
import { AddEventForm } from "./add-event-form";
import { CancelForm } from "./cancel-form";
import { EditDetailsForm } from "./edit-details-form";
import { RemoveLatestScan } from "./remove-latest-scan";

export const metadata: Metadata = {
  title: "Shipment",
  robots: { index: false, follow: false },
};

export default function AdminShipmentPage({
  params,
  searchParams,
}: PageProps<"/admin/shipments/[trackingNumber]">) {
  if (!getSupabaseEnv()) return <NotConnected />;
  return (
    <Suspense fallback={<AdminLoading label="Loading shipment" />}>
      <ShipmentContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ShipmentContent({
  params,
  searchParams,
}: Pick<PageProps<"/admin/shipments/[trackingNumber]">, "params" | "searchParams">) {
  const access = await getAdminAccess();
  if (access.kind === "not-admin") return <NotAdmin email={access.email} />;

  const { trackingNumber: raw } = await params;
  const trackingNumber = normalizeTrackingNumber(decodeURIComponent(raw));
  if (!isValidTrackingNumber(trackingNumber)) notFound();

  const { data, error } = await access.supabase
    .from("shipments")
    .select(ADMIN_DETAIL_SELECT)
    .eq("tracking_number", trackingNumber)
    .maybeSingle();
  if (error) throw new Error(`Could not load shipment: ${error.message}`);
  if (!data) notFound();

  const { shipment, cancelReason, latestEventId } = toAdminDetail(
    data as unknown as AdminShipmentDetailRow,
  );
  const latest = shipment.events.at(-1);
  const cancelled = Boolean(shipment.cancelledAt);
  const delivered = currentStage(shipment) === "delivered";
  const nextStages = allowedNextStages(latest?.stage ?? null, cancelled);
  const created = (await searchParams).created === "1";

  return (
    <AdminShell
      title={<span className="font-mono">{shipment.trackingNumber}</span>}
      email={access.email}
      back={{ href: "/admin", label: "All shipments" }}
      actions={
        <Link
          href={`/track/${shipment.trackingNumber}`}
          className="font-medium underline underline-offset-4"
        >
          View the public tracking page
        </Link>
      }
    >
      {created ? (
        <p
          role="status"
          className="mb-8 rounded-sm bg-signal-soft px-4 py-3 font-medium text-signal"
        >
          Shipment created. Give the customer tracking number{" "}
          <span className="font-mono">{shipment.trackingNumber}</span>.
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-10">
          <WaybillCard shipment={shipment} headingLevel="h2" />

          <Panel
            title="Journey so far"
            description="Newest first, in each place's local time."
          >
            <Timeline events={eventsNewestFirst(shipment)} />
            {!cancelled && latestEventId && shipment.events.length > 1 ? (
              <div className="mt-6 border-t border-rule pt-6">
                <RemoveLatestScan
                  trackingNumber={shipment.trackingNumber}
                  latestLabel={`${STAGE_LABELS[latest!.stage]}, ${latest!.location}, ${
                    formatEventTime(latest!.at).date
                  }`}
                />
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="flex flex-col gap-10">
          {cancelled ? (
            <Panel title="Cancelled">
              <p>Cancelled on {formatDate(shipment.cancelledAt!)}.</p>
              {cancelReason ? (
                <p className="mt-2 text-ink-soft">Reason: {cancelReason}</p>
              ) : null}
              <p className="mt-2 text-ink-soft">
                The shipment and its history are kept on record and can no longer change.
              </p>
            </Panel>
          ) : delivered ? (
            <Panel title="Delivered">
              <p>This shipment is delivered, so it takes no more updates.</p>
            </Panel>
          ) : (
            <Panel title="Post a tracking update">
              <AddEventForm
                trackingNumber={shipment.trackingNumber}
                stages={nextStages}
                defaultCountry={
                  latest && stageAtOrAfterCustoms(latest.stage)
                    ? shipment.destination.country
                    : shipment.origin.country
                }
              />
            </Panel>
          )}

          {!cancelled ? (
            <Panel
              title="Edit details"
              description="The route and service are fixed once booked."
            >
              <EditDetailsForm
                trackingNumber={shipment.trackingNumber}
                current={{
                  carrier: shipment.carrier,
                  weightKg: shipment.weightKg,
                  pieces: shipment.pieces,
                  contents: shipment.contents,
                  estimatedDelivery: shipment.estimatedDelivery,
                }}
              />
            </Panel>
          ) : null}

          {!cancelled && !delivered ? (
            <Panel title="Cancel this shipment">
              <CancelForm trackingNumber={shipment.trackingNumber} />
            </Panel>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}

function stageAtOrAfterCustoms(stage: string) {
  return stage === "at_customs" || stage === "out_for_delivery";
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border-2 border-ink bg-paper p-5 sm:p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
