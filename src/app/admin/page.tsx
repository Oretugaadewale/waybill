import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getAdminAccess } from "@/lib/admin/session";
import {
  ADMIN_LIST_SELECT,
  STATUS_FILTERS,
  filterAdminShipments,
  parseStatusFilter,
  summarizeAdminRows,
  type AdminShipmentRow,
} from "@/lib/shipments/admin-list";
import { formatDate } from "@/lib/shipments/tracking";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  AdminLoading,
  AdminShell,
  NotAdmin,
  NotConnected,
  primaryLinkClass,
} from "./_components/admin-shell";
import { inputClass } from "./_components/fields";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!getSupabaseEnv()) return <NotConnected />;
  return (
    <Suspense fallback={<AdminLoading label="Loading shipments" />}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin">["searchParams"];
}) {
  const access = await getAdminAccess();
  if (access.kind === "not-admin") return <NotAdmin email={access.email} />;

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 60) : "";
  const status = parseStatusFilter(params.status);

  const { data, error } = await access.supabase
    .from("shipments")
    .select(ADMIN_LIST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load shipments: ${error.message}`);

  const all = summarizeAdminRows((data ?? []) as AdminShipmentRow[]);
  const shipments = filterAdminShipments(all, { q, status });
  const filtered = Boolean(q || status);

  return (
    <AdminShell
      section="shipments"
      title="Shipments"
      email={access.email}
      actions={
        <Link href="/admin/shipments/new" className={primaryLinkClass}>
          New shipment
        </Link>
      }
    >
      <form
        role="search"
        action="/admin"
        className="flex flex-wrap items-end gap-4 rounded-sm border-2 border-ink bg-paper p-4"
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="block font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Tracking number, city or hub code"
            className={inputClass}
          />
        </div>
        <div className="min-w-48">
          <label htmlFor="status" className="block font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className={inputClass}>
            {STATUS_FILTERS.map((f) => (
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
          Show shipments
        </button>
        {filtered ? (
          <Link
            href="/admin"
            className="flex min-h-12 items-center font-medium underline underline-offset-4"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mt-6 text-ink-soft" aria-live="polite">
        {filtered
          ? `${shipments.length} of ${all.length} shipments match.`
          : `${all.length} shipments, newest first.`}
      </p>

      {all.length === 0 ? (
        <p className="mt-4">
          No shipments yet.{" "}
          <Link
            href="/admin/shipments/new"
            className="font-semibold underline underline-offset-4"
          >
            Create the first one
          </Link>
          .
        </p>
      ) : shipments.length === 0 ? (
        <p className="mt-4">Nothing matches. Try another search or status.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-sm border-2 border-ink bg-paper">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Shipments</caption>
            <thead className="border-b-2 border-ink">
              <tr>
                {[
                  "Tracking number",
                  "Route",
                  "Service",
                  "Status",
                  "Estimated delivery",
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Scans
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {shipments.map((s) => (
                <tr key={s.trackingNumber}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/shipments/${s.trackingNumber}`}
                      className="font-mono font-semibold underline underline-offset-4"
                    >
                      {s.trackingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.route}</td>
                  <td className="px-4 py-3">{s.service}</td>
                  <td className="px-4 py-3">
                    {s.stage ? (
                      <StatusBadge stage={s.stage} cancelled={s.cancelled} />
                    ) : (
                      s.stageLabel
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(s.estimatedDelivery)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.scans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
