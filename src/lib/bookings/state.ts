import type { Quote } from "@/lib/pricing/quote";

export interface BookingState {
  ok: boolean | null;
  message: string | null;
  errors: Record<string, string>;
  values: Record<string, string>;
  booking: {
    reference: string;
    quote: Quote;
    dropOff: string | null;
    pickupAddress: string | null;
    senderPhone: string;
  } | null;
}

export const initialBookingState: BookingState = {
  ok: null,
  message: null,
  errors: {},
  values: {},
  booking: null,
};
