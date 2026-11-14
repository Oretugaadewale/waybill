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
      database: getSupabaseEnv() ? "ok" : "missing",
      paystackSecretKey: paystackKeyStatus(),
      paystackMode: key.startsWith("sk_test_")
        ? "test"
        : key.startsWith("sk_live_")
          ? "live"
          : null,
      serverKey: serverKeyStatus(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
