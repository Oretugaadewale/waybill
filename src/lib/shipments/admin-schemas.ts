import { z } from "zod";
import { isKnownCountry, timeZonesFor } from "@/lib/places";
import { DEFAULT_NOTES, SERVICE_LEVELS, routeProblem } from "./rules";
import { SHIPMENT_STAGES, type ServiceLevel } from "./types";

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .max(max, `Keep the ${label} under ${max + 1} characters.`);

const country = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isKnownCountry, "Choose a country from the list.");

const hub = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use the three-letter airport or port code, like LOS.");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Choose a real date.");

const detailFields = {
  carrier: text("carrier", 80),
  weightKg: z.coerce
    .number({ error: "Enter the weight in kilograms." })
    .positive("The weight must be more than 0 kg.")
    .max(99_999, "That weight is too high. Check the number.")
    .multipleOf(0.01, "Use at most two decimal places."),
  pieces: z.coerce
    .number({ error: "Enter the number of pieces." })
    .int("Pieces must be a whole number.")
    .min(1, "There must be at least 1 piece.")
    .max(999, "That is too many pieces. Check the number."),
  contents: text("contents", 200),
  estimatedDelivery: isoDate,
};

/** The time zone must belong to the chosen country. */
function checkTimeZone(
  countryField: string,
  zoneField: string,
  data: Record<string, string>,
  ctx: z.RefinementCtx,
) {
  const zones = timeZonesFor(data[countryField] ?? "");
  if (zones.length > 1 && !zones.includes(data[zoneField] ?? "")) {
    ctx.addIssue({
      code: "custom",
      path: [zoneField],
      message: "Choose the time zone for this place.",
    });
  }
}

/** Resolves the zone to use: the only one, or the one chosen. */
export function resolveTimeZone(countryCode: string, chosen: string | undefined): string {
  const zones = timeZonesFor(countryCode);
  if (zones.length === 1) return zones[0];
  if (chosen && zones.includes(chosen)) return chosen;
  throw new Error(`No time zone for ${countryCode}`);
}

export const createShipmentSchema = z
  .object({
    originCity: text("origin city", 80),
    originCountry: country,
    originHub: hub,
    originTimeZone: z.string().optional(),
    destinationCity: text("destination city", 80),
    destinationCountry: country,
    destinationHub: hub,
    service: z.enum(SERVICE_LEVELS as [ServiceLevel, ...ServiceLevel[]], {
      error: "Choose a service.",
    }),
    ...detailFields,
  })
  .superRefine((data, ctx) => {
    const problem = routeProblem(
      data.service,
      data.originCountry,
      data.destinationCountry,
    );
    if (problem)
      ctx.addIssue({ code: "custom", path: [problem.field], message: problem.message });
    checkTimeZone("originCountry", "originTimeZone", data as never, ctx);
  });

export const updateDetailsSchema = z.object(detailFields);

export const addEventSchema = z
  .object({
    stage: z.enum(SHIPMENT_STAGES, { error: "Choose a stage." }),
    city: text("city or place", 80),
    country,
    timeZone: z.string().optional(),
    /** Wall-clock time at the place, "YYYY-MM-DDTHH:mm". Blank means now. */
    occurredAt: z
      .string()
      .trim()
      .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "Choose a date and time.")
      .optional(),
    note: z.string().trim().max(300, "Keep the note under 301 characters.").optional(),
  })
  .superRefine((data, ctx) => checkTimeZone("country", "timeZone", data as never, ctx))
  .transform((data) => ({
    ...data,
    note: data.note || DEFAULT_NOTES[data.stage],
  }));

export const cancelSchema = z.object({
  reason: text("reason", 300),
});

/** Form values come in as FormData; keep only strings. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

/** First message for each field, ready to show next to the input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
