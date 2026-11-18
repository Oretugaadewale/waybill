import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminAccess } from "@/lib/admin/session";
import {
  BOOKING_LIST_SELECT,
  BOOKING_STATUS_FILTERS,
  BOOKING_STATUS_LABELS,
  formatLagosDateTime,
  parseBookingStatus,
  type BookingStatus,
} from "@/lib/bookings/admin";
import { countryName } from "@/lib/places";
import { Money } from "@/components/money";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  AdminLoading,
  AdminShell,
  NotAdmin,
  NotConnected,
} from "../_components/admin-shell";
import { inputClass } from "../_components/fields";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

interface BookingListRow {
  reference: string;
  status: BookingStatus;
  service: string;
  origin_country: string;
  destination_country: string;
  destination_city: string;
  weight_kg: number | string;
  sender_name: string;
  total_minor: number;
  created_at: string;
  shipments: { tracking_number: string } | null;
  payments: { refund_needed: boolean; refunded_at: string | null }[];
}

export default function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  if (!getSupabaseEnv()) return <NotConnected />;
  return (
    <Suspense fallback={<AdminLoading label="Loading bookings" />}>
      <BookingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BookingsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/bookings">["searchParams"];
}) {
  const access = await getAdminAccess();
  if (access.kind === "not-admin") return <NotAdmin email={access.email} />;

  const status = parseBookingStatus((await searchParams).status);
  let query = access.supabase
    .from("bookings")
    .select(BOOKING_LIST_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load bookings: ${error.message}`);
  const bookings = (data ?? []) as unknown as BookingListRow[];

  return (
    <AdminShell section="bookings" title="Bookings" email={access.email}>
      <form
        action="/admin/bookings"
        className="flex flex-wrap items-end gap-4 rounded-sm border-2 border-ink bg-paper p-4"
      >
        <div className="min-w-56">
          <label htmlFor="status" className="block font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className={inputClass}>
            {BOOKING_STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="min-h-12 rounded-sm bg-ink px-6 font-semibold text-paper hover:bg-ink/90"
        >
          Show bookings
        </button>
      </form>

      <p className="mt-6 text-ink-soft">
        {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}, newest first.
      </p>

      {bookings.length === 0 ? (
        <p className="mt-4">
          No bookings {status ? "with this status" : "yet"}. Customers book at{" "}
          <Link href="/book" className="font-semibold underline underline-offset-4">
            /book
          </Link>
          .
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-sm border-2 border-ink bg-paper">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Bookings</caption>
            <thead className="border-b-2 border-ink">
              <tr>
                {["Reference", "Received", "Sender", "Route", "Service", "Status"].map(
                  (h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ),
                )}
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {bookings.map((b) => (
                <tr key={b.reference}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bookings/${b.reference}`}
                      className="font-mono font-semibold underline underline-offset-4"
                    >
                      {b.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatLagosDateTime(b.created_at)}</td>
                  <td className="px-4 py-3">{b.sender_name}</td>
                  <td className="px-4 py-3">
                    {countryName(b.origin_country)} to {b.destination_city},{" "}
                    {countryName(b.destination_country)}
                  </td>
                  <td className="px-4 py-3">
                    {b.service}, {Number(b.weight_kg)} kg
                  </td>
                  <td className="px-4 py-3">
                    {BOOKING_STATUS_LABELS[b.status]}
                    {b.payments?.some((p) => p.refund_needed && !p.refunded_at) ? (
                      <span className="mt-1 block w-fit rounded-sm bg-red-700 px-2 py-0.5 text-xs font-semibold text-paper">
                        Refund needed
                      </span>
                    ) : null}
                    {b.shipments ? (
                      <span className="block font-mono text-xs">
                        {b.shipments.tracking_number}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <Money minor={b.total_minor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
