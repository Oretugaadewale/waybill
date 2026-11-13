import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/status-badge";
import { summarizeAdminRows, type AdminShipmentRow } from "@/lib/shipments/admin-list";
import { formatDate } from "@/lib/shipments/tracking";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createUserClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  if (!getSupabaseEnv()) {
    return (
      <AdminShell>
        <p>The database is not connected, so the admin area is unavailable.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Suspense fallback={<p aria-busy="true">Loading shipments</p>}>
        <AdminContent />
      </Suspense>
    </AdminShell>
  );
}

async function AdminContent() {
  const supabase = await createUserClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/admin/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw new Error(`Could not check admin access: ${adminError.message}`);

  if (!isAdmin) {
    return (
      <div>
        <h2 className="text-xl font-bold">This account is not an admin</h2>
        <p className="mt-2 text-ink-soft">
          You are signed in as {String(claims.claims.email ?? "this user")}, but this
          account has not been given admin access. Ask the project owner to add it.
        </p>
        <SignOutButton />
      </div>
    );
  }

  const { data, error } = await supabase
    .from("shipments")
    .select(
      "tracking_number, origin_city, origin_hub, destination_city, destination_hub, service, estimated_delivery, tracking_events(stage, occurred_at)",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load shipments: ${error.message}`);
  const shipments = summarizeAdminRows((data ?? []) as AdminShipmentRow[]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-soft">
          Signed in as{" "}
          <span className="font-medium text-ink">{String(claims.claims.email)}</span>
        </p>
        <SignOutButton />
      </div>

      <h2 className="mt-8 text-xl font-bold">
        Shipments <span className="font-normal text-ink-soft">({shipments.length})</span>
      </h2>

      {shipments.length === 0 ? (
        <p className="mt-4">
          No shipments yet. Creating shipments arrives in the next stage.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-sm border-2 border-ink bg-paper">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">All shipments, newest first</caption>
            <thead className="border-b-2 border-ink">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Tracking number
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Route
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Service
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Estimated delivery
                </th>
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
                      href={`/track/${s.trackingNumber}`}
                      className="font-mono font-semibold underline underline-offset-4"
                    >
                      {s.trackingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.route}</td>
                  <td className="px-4 py-3">{s.service}</td>
                  <td className="px-4 py-3">
                    {s.stage ? <StatusBadge stage={s.stage} /> : s.stageLabel}
                  </td>
                  <td className="px-4 py-3">{formatDate(s.estimatedDelivery)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.scans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={signOut} className="mt-4 sm:mt-0">
      <button
        type="submit"
        className="min-h-11 rounded-sm border-2 border-ink px-4 font-semibold hover:bg-concrete"
      >
        Sign out
      </button>
    </form>
  );
}
