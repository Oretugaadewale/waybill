import type { Metadata } from "next";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  const configured = getSupabaseEnv() !== null;

  return (
    <div className="mx-auto max-w-md px-5 py-14 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Admin sign in</h1>
      <p className="mt-2 text-ink-soft">For staff who manage shipments.</p>
      <div className="mt-8 rounded-sm border-2 border-ink bg-paper p-6">
        {configured ? (
          <LoginForm />
        ) : (
          <p>
            Sign in is not available because the database is not connected. Set the
            Supabase environment variables to enable it.
          </p>
        )}
      </div>
    </div>
  );
}
