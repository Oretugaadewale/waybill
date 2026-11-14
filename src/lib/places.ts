import { getAllCountries, getCountry } from "countries-and-timezones";
import { countryName } from "./country-name";

export { countryName };

export interface CountryOption {
  code: string;
  name: string;
}

/** Every country with at least one time zone, sorted by name. */
export const COUNTRIES: CountryOption[] = Object.values(getAllCountries())
  .filter((c) => c.timezones.length > 0 && /^[A-Z]{2}$/.test(c.id))
  .map((c) => ({ code: c.id, name: countryName(c.id) }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export function isKnownCountry(code: string): boolean {
  return COUNTRY_CODES.has(code);
}

/** IANA time zones used in a country, e.g. "NG" -> ["Africa/Lagos"]. */
export function timeZonesFor(countryCode: string): string[] {
  return getCountry(countryCode)?.timezones ?? [];
}

/** "America/Indiana/Indianapolis" -> "Indiana / Indianapolis" */
export function timeZoneLabel(timeZone: string): string {
  return timeZone.split("/").slice(1).join(" / ").replaceAll("_", " ") || timeZone;
}

/**
 * Minutes ahead of UTC in a time zone at a given instant, daylight saving
 * included. Lagos -> 60, Houston in November -> -360.
 */
export function offsetMinutesAt(timeZone: string, instant: Date): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value;

  const m = /^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(name ?? "");
  if (!m) throw new Error(`Could not read the offset for ${timeZone}`);
  if (!m[1]) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -minutes : minutes;
}

/**
 * Converts a wall-clock time typed for a place ("2026-11-14T09:30" in
 * Houston) into the real instant. Done in two passes so it stays right on
 * the days the clocks change.
 */
export function wallTimeToInstant(wallTime: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wallTime);
  if (!m) throw new Error(`Invalid date and time: ${wallTime}`);
  const asUtc = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  let instant = asUtc - offsetMinutesAt(timeZone, new Date(asUtc)) * 60_000;
  instant = asUtc - offsetMinutesAt(timeZone, new Date(instant)) * 60_000;
  return new Date(instant);
}
