import { NextResponse } from "next/server";
import { serverKeyStatus } from "@/lib/payments/booking-payment";
import { paystackKeyStatus } from "@/lib/payments/paystack";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Says which payment settings are present and well formed, without ever
 * returning a value. Handy after changing environment variables.
 */
export async function GET() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  return NextResponse.json(
    {
      // Which commit is live, so checks can wait for a new deploy to land.
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      database: getSupabaseEnv() ? "ok" : "missing",
      paystackSecretKey: paystackKeyStatus(),
      paystackMode: key.startsWith("sk_test_")
        ? "test"
        : key.startsWith("sk_live_")
          ? "live"
          : null,
      serverKey: serverKeyStatus(),
      // Shape only, never the value: helps spot a key pasted in the wrong place.
      shapes: {
        paystackSecretKey: shape(process.env.PAYSTACK_SECRET_KEY),
        serverKey: shape(process.env.WAYBILL_SERVER_KEY),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function shape(value: string | undefined) {
  if (value === undefined) return null;
  return {
    length: value.length,
    startsWith: value.slice(0, 4),
    hasSpaces: /\s/.test(value),
  };
}
