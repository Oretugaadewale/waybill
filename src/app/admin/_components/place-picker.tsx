"use client";

import { useState } from "react";
import { COUNTRIES, countryName, timeZoneOptions, timeZonesFor } from "@/lib/places";
import { Field, inputClass } from "./fields";

interface PlacePickerProps {
  /** Field names, e.g. { country: "originCountry", timeZone: "originTimeZone" }. */
  names: { country: string; timeZone: string };
  idPrefix: string;
  countryLabel: string;
  /** Limit the choice, e.g. to the countries a service starts from. */
  countryCodes?: readonly string[];
  defaultCountry?: string;
  defaultTimeZone?: string;
  errors: Record<string, string>;
  onCountryChange?: (code: string) => void;
}

/**
 * Country select, plus a time zone select that only appears for countries
 * with more than one zone (the US, Canada, China...). The time zone decides
 * the local time shown on the scan.
 */
export function PlacePicker({
  names,
  idPrefix,
  countryLabel,
  countryCodes,
  defaultCountry = "",
  defaultTimeZone = "",
  errors,
  onCountryChange,
}: PlacePickerProps) {
  const [country, setCountry] = useState(defaultCountry);
  const options = countryCodes
    ? countryCodes.map((code) => ({ code, name: countryName(code) }))
    : COUNTRIES;
  const zones = country ? timeZonesFor(country) : [];

  return (
    <>
      <Field
        id={`${idPrefix}-country`}
        label={countryLabel}
        error={errors[names.country]}
      >
        {(describedBy, invalid) => (
          <select
            id={`${idPrefix}-country`}
            name={names.country}
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              onCountryChange?.(e.target.value);
            }}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          >
            <option value="">Choose a country</option>
            {options.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      {zones.length > 1 ? (
        <Field
          id={`${idPrefix}-tz`}
          label="Time zone"
          hint={`${countryName(country)} has more than one. Pick the one for this city.`}
          error={errors[names.timeZone]}
        >
          {(describedBy, invalid) => (
            <select
              id={`${idPrefix}-tz`}
              name={names.timeZone}
              defaultValue={zones.includes(defaultTimeZone) ? defaultTimeZone : ""}
              key={country}
              required
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className={inputClass}
            >
              <option value="">Choose a time zone</option>
              {(() => {
                const { common, other } = timeZoneOptions(country);
                const render = (o: { value: string; label: string }) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                );
                return common.length ? (
                  <>
                    <optgroup label="Main cities">{common.map(render)}</optgroup>
                    <optgroup label="Other zones">{other.map(render)}</optgroup>
                  </>
                ) : (
                  other.map(render)
                );
              })()}
            </select>
          )}
        </Field>
      ) : null}
    </>
  );
}
