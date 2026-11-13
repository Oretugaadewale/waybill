import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./env";

/**
 * Client for the signed-in user, backed by the session cookies.
 * Use it for anything that depends on who is logged in.
 */
export async function createUserClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous client with no session. It can only call what the public is
 * allowed to (get_shipment), which makes its results safe to cache.
 */
export function createPublicClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  return createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
