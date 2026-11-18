import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

type UserClient = Awaited<ReturnType<typeof createUserClient>>;

export type AdminAccess =
  | { kind: "admin"; supabase: UserClient; email: string }
  | { kind: "not-admin"; email: string };

/**
 * For pages: who is signed in, and are they an admin?
 * Signed-out visitors are sent to the login page. The proxy does this too,
 * but pages never rely on the proxy alone.
 */
export async function getAdminAccess(): Promise<AdminAccess> {
  // Admin pages are always per request; this also keeps the Supabase client's
  // clock reads out of prerendering.
  await connection();
  const supabase = await createUserClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/admin/login");

  const email = String(claims.claims.email ?? "this account");
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(`Could not check admin access: ${error.message}`);

  return isAdmin ? { kind: "admin", supabase, email } : { kind: "not-admin", email };
}

/**
 * For server actions: returns a client only if the caller is an admin.
 * Server actions are public endpoints, so each one checks again.
 */
export async function adminClientForAction(): Promise<UserClient | null> {
  const supabase = await createUserClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? supabase : null;
}
