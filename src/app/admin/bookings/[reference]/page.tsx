import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { QuoteSummary } from "@/components/quote/quote-summary";
import { getAdminAccess } from "@/lib/admin/session";
import {
  BOOKING_SELECT,
  BOOKING_STATUS_LABELS,
  formatLagosDateTime,
  isBookingReference,
  type BookingRow,
} from "@/lib/bookings/admin";
import { countryName } from "@/lib/places";
import { calculateQuote, formatMoney } from "@/lib/pricing/quote";
import { RATE_CARD, type OriginCountry } from "@/lib/pricing/rate-card";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  AdminLoading,
  AdminShell,
  NotAdmin,
  NotConnected,
} from "../../_components/admin-shell";
import { ConvertBookingForm, DeclineBookingForm } from "./booking-forms";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false },
};

export default function BookingPage({
  params,
}: PageProps<"/admin/bookings/[reference]">) {
  if (!getSupabaseEnv()) return <NotConnected />;
  return (
    <Suspense fallback={<AdminLoading label="Loading booking" />}>
      <BookingContent params={params} />
    </Suspense>
  );
}

async function BookingContent({
  params,
}: {
  params: PageProps<"/admin/bookings/[reference]">["params"];
}) {
  const access = await getAdminAccess();
  if (access.kind === "not-admin") return <NotAdmin email={access.email} />;

  const reference = decodeURIComponent((await params).reference).toUpperCase();
  if (!isBookingReference(reference)) notFound();

  const { data, error } = await access.supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error(`Could not load booking: ${error.message}`);
  if (!data) notFound();
  const b = data as unknown as BookingRow;

  const { data: paymentRows } = await access.supabase
    .from("payments")
    .select(
      "paystack_reference, amount_minor, status, channel, paid_at, created_at, bookings!inner(reference)",
    )
    .eq("bookings.reference", reference)
    .order("created_at", { ascending: false });
  const payments = (paymentRows ?? []) as unknown as {
    paystack_reference: string;
    amount_minor: number;
    status: "initialized" | "success" | "failed" | "abandoned";
    channel: string | null;
    paid_at: string | null;
    created_at: string;
  }[];

  const origin = b.origin_country as OriginCountry;
  const dims =
    b.length_cm !== null && b.width_cm !== null && b.height_cm !== null
      ? {
          length: Number(b.length_cm),
          width: Number(b.width_cm),
          height: Number(b.height_cm),
        }
      : null;

  // Recompute from the rate card. The stored quote is what the customer saw;
  // if they differ, the stored one was changed or the rates have moved.
  const recomputed = calculateQuote({
    service: b.service,
    originCountry: origin,
    destinationCountry: b.destination_country,
    weightKg: Number(b.weight_kg),
    dimensionsCm: dims,
    collection: b.collection,
  });
  const priceMatches = recomputed.ok && recomputed.quote.totalMinor === b.total_minor;
  const open = b.status === "awaiting_payment" || b.status === "paid";

  const transitMax = recomputed.ok ? recomputed.quote.transitDays[1] : 10;
  const etaIso = suggestedDeliveryDate(transitMax);

  return (
    <AdminShell
      section="bookings"
      title={<span className="font-mono">{b.reference}</span>}
      email={access.email}
      back={{ href: "/admin/bookings", label: "All bookings" }}
    >
      <p className="-mt-4 mb-8 text-ink-soft">
        {BOOKING_STATUS_LABELS[b.status]}. Received {formatLagosDateTime(b.created_at)}{" "}
        (Lagos time).
        {b.shipments ? (
          <>
            {" "}
            Shipment{" "}
            <Link
              href={`/admin/shipments/${b.shipments.tracking_number}`}
              className="font-mono font-semibold text-ink underline underline-offset-4"
            >
              {b.shipments.tracking_number}
            </Link>
            .
          </>
        ) : null}
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="flex flex-col gap-8">
          <Panel title="Shipment">
            <Facts
              rows={[
                ["Service", b.service],
                [
                  "Route",
                  `${countryName(origin)} to ${b.destination_city}, ${countryName(b.destination_country)}`,
                ],
                ["Weight", `${Number(b.weight_kg)} kg`],
                [
                  "Box size",
                  dims
                    ? `${dims.length} x ${dims.width} x ${dims.height} cm`
                    : "Not given",
                ],
                ["Boxes", String(b.pieces)],
                ["Contents", b.contents],
                ["Declared value", formatMoney(b.declared_value_minor)],
                [
                  "Getting it to us",
                  b.collection === "pickup"
                    ? `Pickup from ${b.pickup_address}`
                    : `Drop-off at ${RATE_CARD[origin]?.hub.dropOff ?? "the office"}`,
                ],
              ]}
            />
          </Panel>

          <Panel title="Sender">
            <Facts
              rows={[
                ["Name", b.sender_name],
                [
                  "Phone",
                  <a key="p" href={`tel:${b.sender_phone}`}>
                    {b.sender_phone}
                  </a>,
                ],
                [
                  "Email",
                  <a key="e" href={`mailto:${b.sender_email}`}>
                    {b.sender_email}
                  </a>,
                ],
              ]}
            />
          </Panel>

          <Panel title="Receiver">
            <Facts
              rows={[
                ["Name", b.receiver_name],
                ["Phone", b.receiver_phone],
                ["Email", b.receiver_email ?? "Not given"],
                ["Address", b.receiver_address],
              ]}
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="price-heading">
            <h2 id="price-heading" className="mb-3 text-xl font-bold">
              Price quoted
            </h2>
            <QuoteSummary quote={b.quote} />
            {!priceMatches ? (
              <p
                role="alert"
                className="mt-3 rounded-sm border-2 border-red-700 bg-paper px-4 py-3 text-sm font-medium text-red-700"
              >
                The current rate card gives{" "}
                {recomputed.ok ? formatMoney(recomputed.quote.totalMinor) : "no price"}{" "}
                for this booking, not {formatMoney(b.total_minor)}. Check it before taking
                payment.
              </p>
            ) : null}
          </section>

          <Panel title="Payments">
            {payments.length === 0 ? (
              <p className="text-ink-soft">
                No online payment yet. The customer pays at{" "}
                <Link
                  href={`/pay/${b.reference}`}
                  className="underline underline-offset-4"
                >
                  /pay/{b.reference}
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-rule text-sm">
                {payments.map((p) => (
                  <li key={p.paystack_reference} className="py-2">
                    <span className="font-semibold">{PAYMENT_LABELS[p.status]}</span>,{" "}
                    {formatMoney(p.amount_minor)}
                    {p.channel ? ` by ${p.channel}` : ""}
                    <span className="block text-ink-soft">
                      {formatLagosDateTime(p.paid_at ?? p.created_at)}.{" "}
                      <span className="font-mono text-xs">{p.paystack_reference}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {open ? (
            <>
              <Panel title="Create the shipment">
                <ConvertBookingForm
                  reference={b.reference}
                  defaults={{
                    originHub: RATE_CARD[origin]?.hub.code ?? "",
                    carrier: b.service === "Sea Freight" ? "Waybill Sea" : "DHL Express",
                    estimatedDelivery: etaIso,
                  }}
                />
              </Panel>
              <Panel title="Decline">
                <DeclineBookingForm reference={b.reference} />
              </Panel>
            </>
          ) : b.status === "declined" ? (
            <Panel title="Declined">
              <p>Reason: {b.decline_reason}</p>
            </Panel>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}

const PAYMENT_LABELS = {
  initialized: "Started, not finished",
  success: "Paid",
  failed: "Failed",
  abandoned: "Abandoned",
} as const;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border-2 border-ink bg-paper p-5 sm:p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-rule text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
          <dt className="text-ink-soft">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Today in Lagos plus the slow end of the transit range, counting working
 * days as calendar days times 7/5.
 */
function suggestedDeliveryDate(workingDays: number): string {
  const eta = new Date(Date.now() + Math.ceil((workingDays * 7) / 5) * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(eta);
}
