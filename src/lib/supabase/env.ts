/**
 * Supabase settings. Both values are safe to expose to the browser: the
 * publishable key only grants what Row Level Security allows.
 *
 * When they are missing (local development without a database, CI, tests)
 * the app falls back to the sample shipments so it still runs end to end.
 */
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return env;
}
