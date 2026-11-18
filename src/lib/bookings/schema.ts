import { z } from "zod";
import { isKnownCountry } from "@/lib/places";
import { calculateQuote, type QuoteInput } from "@/lib/pricing/quote";
import { LIMITS } from "@/lib/pricing/rate-card";
import { SERVICE_LEVELS } from "@/lib/shipments/rules";
import type { ServiceLevel } from "@/lib/shipments/types";

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .min(min, `The ${label} looks too short. Check it.`)
    .max(max, `Keep the ${label} under ${max + 1} characters.`);

/** A number field where empty means "not filled in", not zero. */
const requiredNumber = (emptyMessage: string, rules: (n: z.ZodNumber) => z.ZodNumber) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    rules(z.coerce.number({ error: emptyMessage })),
  );

const phone = (whose: string) =>
  z
    .string()
    .trim()
    .regex(
      /^\+?[0-9 ()-]{7,20}$/,
      `Enter ${whose} phone number, with the country code if outside Nigeria.`,
    );

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "That email address is too long.")
  .email("Enter a valid email address, like name@example.com.");

const optionalNumber = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : null));

/** The fields that decide the price. Shared by /quote and /book. */
export const quoteFieldsSchema = z
  .object({
    service: z.enum(SERVICE_LEVELS as [ServiceLevel, ...ServiceLevel[]], {
      error: "Choose a service.",
    }),
    originCountry: z.enum(["NG", "CN"], { error: "Choose where it ships from." }),
    destinationCountry: z
      .string()
      .trim()
      .toUpperCase()
      .refine(isKnownCountry, "Choose the destination country."),
    weightKg: z.coerce
      .number({ error: "Enter the weight in kilograms." })
      .positive("Enter the weight in kilograms.")
      .multipleOf(0.01, "Use at most two decimal places."),
    length: optionalNumber,
    width: optionalNumber,
    height: optionalNumber,
    collection: z.enum(["drop_off", "pickup"], { error: "Choose drop-off or pickup." }),
  })
  .superRefine((d, ctx) => {
    const sea = d.service === "Sea Freight";
    const max = sea ? LIMITS.maxWeightKg.sea : LIMITS.maxWeightKg.air;
    if (d.weightKg > max) {
      ctx.addIssue({
        code: "custom",
        path: ["weightKg"],
        message: `${d.service} takes up to ${max.toLocaleString("en-GB")} kg per booking. Contact us for bigger loads.`,
      });
    }
    const sides = [d.length, d.width, d.height];
    const given = sides.filter((s) => s !== null);
    if (given.length > 0 && given.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["dimensions"],
        message: "Enter all three sides, or leave the size blank.",
      });
    } else if (
      given.some(
        (s) =>
          !Number.isFinite(s) || (s as number) <= 0 || (s as number) > LIMITS.maxSideCm,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dimensions"],
        message: `Each side must be between 1 and ${LIMITS.maxSideCm} cm.`,
      });
    }
  });

export type QuoteFields = z.output<typeof quoteFieldsSchema>;

export function toQuoteInput(d: QuoteFields): QuoteInput {
  return {
    service: d.service,
    originCountry: d.originCountry,
    destinationCountry: d.destinationCountry,
    weightKg: d.weightKg,
    dimensionsCm:
      d.length !== null && d.width !== null && d.height !== null
        ? { length: d.length, width: d.width, height: d.height }
        : null,
    collection: d.collection,
  };
}

export const bookingSchema = z
  .object({
    destinationCity: text("destination city", 1, 80),
    pieces: requiredNumber("Enter the number of boxes.", (n) =>
      n
        .int("Use a whole number of boxes.")
        .min(1, "There must be at least 1 box.")
        .max(99, "For more than 99 boxes, contact us."),
    ),
    contents: text("contents", 3, 200),
    declaredValue: requiredNumber(
      "Enter what the goods are worth in naira, or 0 for documents.",
      (n) =>
        n
          .min(0, "The value cannot be negative.")
          .max(100_000_000, "For goods worth more than ₦100 million, contact us."),
    ),
    pickupAddress: z
      .string()
      .trim()
      .max(300, "Keep the address under 301 characters.")
      .optional(),
    senderName: text("sender's full name", 2, 100),
    senderPhone: phone("the sender's"),
    senderEmail: email,
    receiverName: text("receiver's full name", 2, 100),
    receiverPhone: phone("the receiver's"),
    receiverEmail: z.union([z.literal(""), email]).optional(),
    receiverAddress: text("delivery address", 5, 300),
  })
  .and(quoteFieldsSchema)
  .superRefine((d, ctx) => {
    if (d.collection === "pickup" && (d.pickupAddress ?? "").length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["pickupAddress"],
        message: "Enter the address we should collect from.",
      });
    }
    const priced = calculateQuote(toQuoteInput(d));
    if (!priced.ok) {
      ctx.addIssue({ code: "custom", path: [priced.field], message: priced.message });
    }
  });

export type BookingFields = z.output<typeof bookingSchema>;
