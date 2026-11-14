import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminAccess } from "@/lib/admin/session";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  AdminLoading,
  AdminShell,
  NotAdmin,
  NotConnected,
} from "../../_components/admin-shell";
import { NewShipmentForm } from "./new-shipment-form";

export const metadata: Metadata = {
  title: "New shipment",
  robots: { index: false, follow: false },
};

export default function NewShipmentPage() {
  if (!getSupabaseEnv()) return <NotConnected />;
  return (
    <Suspense fallback={<AdminLoading label="Loading" />}>
      <NewShipmentContent />
    </Suspense>
  );
}

async function NewShipmentContent() {
  const access = await getAdminAccess();
  if (access.kind === "not-admin") return <NotAdmin email={access.email} />;

  // Earliest delivery date the picker offers: today in Lagos.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(
    new Date(),
  );

  return (
    <AdminShell
      section="shipments"
      title="New shipment"
      email={access.email}
      back={{ href: "/admin", label: "All shipments" }}
    >
      <div className="max-w-4xl">
        <NewShipmentForm today={today} />
      </div>
    </AdminShell>
  );
}
