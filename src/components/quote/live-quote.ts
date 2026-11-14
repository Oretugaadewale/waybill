import { quoteFieldsSchema, toQuoteInput } from "@/lib/bookings/schema";
import { calculateQuote, type Quote } from "@/lib/pricing/quote";
import type { QuoteFormValues } from "./quote-fields";

export type LiveQuote = { quote: Quote } | { quote: null; prompt: string };

/** Prices what has been typed so far, or says what is still missing. */
export function liveQuote(values: QuoteFormValues): LiveQuote {
  if (!values.destinationCountry)
    return { quote: null, prompt: "Choose where it ships to." };
  if (!values.weightKg)
    return { quote: null, prompt: "Enter the weight to see your price." };
  const parsed = quoteFieldsSchema.safeParse(values);
  if (!parsed.success) return { quote: null, prompt: parsed.error.issues[0].message };
  const result = calculateQuote(toQuoteInput(parsed.data));
  return result.ok ? { quote: result.quote } : { quote: null, prompt: result.message };
}
