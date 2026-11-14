"use client";

import { Field, inputClass } from "@/components/form/fields";
import { COUNTRIES, countryName } from "@/lib/places";
import { RATE_CARD } from "@/lib/pricing/rate-card";
import {
  AIR_ORIGINS,
  SEA_DESTINATIONS,
  SEA_ORIGINS,
  SERVICE_LEVELS,
} from "@/lib/shipments/rules";

export interface QuoteFormValues {
  service: string;
  originCountry: string;
  destinationCountry: string;
  weightKg: string;
  length: string;
  width: string;
  height: string;
  collection: string;
}

export const emptyQuoteValues: QuoteFormValues = {
  service: "Air Express",
  originCountry: "NG",
  destinationCountry: "",
  weightKg: "",
  length: "",
  width: "",
  height: "",
  collection: "drop_off",
};

/** Reads quote values from URL search params, ignoring anything unexpected. */
export function quoteValuesFromParams(
  params: Record<string, string | string[] | undefined>,
): QuoteFormValues {
  const get = (key: keyof QuoteFormValues) => {
    const v = params[key];
    return typeof v === "string" ? v.slice(0, 40) : emptyQuoteValues[key];
  };
  return {
    service: get("service"),
    originCountry: get("originCountry"),
    destinationCountry: get("destinationCountry"),
    weightKg: get("weightKg"),
    length: get("length"),
    width: get("width"),
    height: get("height"),
    collection: get("collection"),
  };
}

interface QuoteFieldsProps {
  values: QuoteFormValues;
  onChange: (values: QuoteFormValues) => void;
  errors?: Record<string, string>;
}

/**
 * The inputs that decide the price. Controlled, so the price updates as the
 * customer types. Only valid choices are offered: sea freight narrows the
 * countries to the routes it runs.
 */
export function QuoteFields({ values, onChange, errors = {} }: QuoteFieldsProps) {
  const sea = values.service === "Sea Freight";
  const origins = sea ? SEA_ORIGINS : AIR_ORIGINS;
  const destinations = sea
    ? SEA_DESTINATIONS.map((code) => ({ code, name: countryName(code) }))
    : COUNTRIES.filter((c) => c.code !== values.originCountry);

  const set = (patch: Partial<QuoteFormValues>) => {
    const next = { ...values, ...patch };
    // Keep the route valid when the service or origin changes.
    const nextSea = next.service === "Sea Freight";
    if (nextSea && !(SEA_ORIGINS as readonly string[]).includes(next.originCountry)) {
      next.originCountry = "NG";
    }
    if (
      nextSea &&
      next.destinationCountry &&
      !(SEA_DESTINATIONS as readonly string[]).includes(next.destinationCountry)
    ) {
      next.destinationCountry = "";
    }
    if (next.destinationCountry === next.originCountry) next.destinationCountry = "";
    onChange(next);
  };

  const hub = RATE_CARD[values.originCountry as "NG" | "CN"]?.hub ?? RATE_CARD.NG.hub;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <fieldset
        className="sm:col-span-2"
        aria-describedby={errors.service ? "service-error" : undefined}
      >
        <legend className="font-medium">Service</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {SERVICE_LEVELS.map((s) => (
            <label
              key={s}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border-2 border-ink bg-paper px-4 has-checked:bg-tape"
            >
              <input
                type="radio"
                name="service"
                value={s}
                checked={values.service === s}
                onChange={() => set({ service: s })}
                className="h-4 w-4 accent-ink"
              />
              <span className="font-medium">{s}</span>
            </label>
          ))}
        </div>
        {errors.service ? (
          <p id="service-error" className="mt-2 text-sm font-medium text-red-700">
            {errors.service}
          </p>
        ) : null}
      </fieldset>

      <Field id="originCountry" label="Ships from" error={errors.originCountry}>
        {(describedBy, invalid) => (
          <select
            id="originCountry"
            name="originCountry"
            value={values.originCountry}
            onChange={(e) => set({ originCountry: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          >
            {origins.map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="destinationCountry"
        label="Ships to"
        hint={sea ? "Sea freight runs to these three countries." : undefined}
        error={errors.destinationCountry}
      >
        {(describedBy, invalid) => (
          <select
            id="destinationCountry"
            name="destinationCountry"
            value={values.destinationCountry}
            onChange={(e) => set({ destinationCountry: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          >
            <option value="">Choose a country</option>
            {destinations.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="weightKg"
        label="Weight (kg)"
        hint="All boxes together."
        error={errors.weightKg}
      >
        {(describedBy, invalid) => (
          <input
            id="weightKg"
            name="weightKg"
            inputMode="decimal"
            value={values.weightKg}
            onChange={(e) => set({ weightKg: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </Field>

      <fieldset aria-describedby="dimensions-hint dimensions-error">
        <legend className="font-medium">Box size in cm (optional)</legend>
        <p id="dimensions-hint" className="mt-1 text-sm text-ink-soft">
          Big, light boxes are charged by size.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["length", "width", "height"] as const).map((side) => (
            <label key={side} className="text-sm">
              <span className="capitalize">{side}</span>
              <input
                name={side}
                inputMode="decimal"
                value={values[side]}
                onChange={(e) => set({ [side]: e.target.value })}
                aria-invalid={errors.dimensions ? true : undefined}
                className={`${inputClass} mt-1 px-3`}
              />
            </label>
          ))}
        </div>
        {errors.dimensions ? (
          <p id="dimensions-error" className="mt-2 text-sm font-medium text-red-700">
            {errors.dimensions}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="sm:col-span-2">
        <legend className="font-medium">Getting it to us</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            {
              value: "drop_off",
              label: "I'll drop it off",
              detail: `Free, at ${hub.dropOff}`,
            },
            {
              value: "pickup",
              label: "Pick it up from me",
              detail: `Within ${hub.city}, for a small fee`,
            },
          ].map((o) => (
            <label
              key={o.value}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-sm border-2 border-ink bg-paper px-4 py-3 has-checked:bg-tape"
            >
              <input
                type="radio"
                name="collection"
                value={o.value}
                checked={values.collection === o.value}
                onChange={() => set({ collection: o.value })}
                className="mt-1 h-4 w-4 accent-ink"
              />
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-sm text-ink-soft">{o.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
