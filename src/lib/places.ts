import { getCountry } from "countries-and-timezones";
import { countryName } from "./country-name";
import { COUNTRY_NAMES } from "./country-names";

export { countryName };

export interface CountryOption {
  code: string;
  name: string;
}

/**
 * Every country with at least one time zone, sorted by name. The order comes
 * from the fixed name table, not a run-time sort, so server and browser agree.
 */
export const COUNTRIES: CountryOption[] = Object.entries(COUNTRY_NAMES)
  .filter(([code]) => (getCountry(code)?.timezones.length ?? 0) > 0)
  .map(([code, name]) => ({ code, name }));

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

/**
 * The zones people actually ask for, per country, with plain names, so staff
 * pick "Central: Chicago, Houston, Dallas" instead of hunting for "Chicago".
 */
const COMMON_ZONES: Record<string, [string, string][]> = {
  US: [
    ["America/New_York", "Eastern: New York, Atlanta, Miami"],
    ["America/Chicago", "Central: Chicago, Houston, Dallas"],
    ["America/Denver", "Mountain: Denver, Salt Lake City"],
    ["America/Phoenix", "Arizona: Phoenix"],
    ["America/Los_Angeles", "Pacific: Los Angeles, Seattle, Las Vegas"],
    ["America/Anchorage", "Alaska: Anchorage"],
    ["Pacific/Honolulu", "Hawaii: Honolulu"],
  ],
  CA: [
    ["America/Toronto", "Eastern: Toronto, Ottawa, Montreal"],
    ["America/Winnipeg", "Central: Winnipeg"],
    ["America/Regina", "Saskatchewan: Regina, Saskatoon"],
    ["America/Edmonton", "Mountain: Calgary, Edmonton"],
    ["America/Vancouver", "Pacific: Vancouver, Victoria"],
    ["America/Halifax", "Atlantic: Halifax"],
    ["America/St_Johns", "Newfoundland: St. John's"],
  ],
  CN: [
    ["Asia/Shanghai", "China: Beijing, Shanghai, Guangzhou"],
    ["Asia/Urumqi", "Xinjiang: Ürümqi"],
  ],
  AU: [
    ["Australia/Sydney", "Sydney, Canberra"],
    ["Australia/Melbourne", "Melbourne"],
    ["Australia/Brisbane", "Brisbane"],
    ["Australia/Adelaide", "Adelaide"],
    ["Australia/Perth", "Perth"],
    ["Australia/Darwin", "Darwin"],
  ],
  BR: [["America/Sao_Paulo", "Brasília: São Paulo, Rio de Janeiro"]],
  MX: [
    ["America/Mexico_City", "Central: Mexico City"],
    ["America/Cancun", "Cancún"],
    ["America/Tijuana", "Tijuana"],
  ],
  RU: [["Europe/Moscow", "Moscow, St Petersburg"]],
  ID: [["Asia/Jakarta", "Western Indonesia: Jakarta"]],
};

export interface TimeZoneOption {
  value: string;
  label: string;
}

/**
 * Zones for a country, the common ones first with plain names, then the
 * rest alphabetically. Countries with one zone return a single option.
 */
export function timeZoneOptions(countryCode: string): {
  common: TimeZoneOption[];
  other: TimeZoneOption[];
} {
  const zones = timeZonesFor(countryCode);
  const common = (COMMON_ZONES[countryCode] ?? [])
    .filter(([z]) => zones.includes(z))
    .map(([value, label]) => ({ value, label }));
  const named = new Set(common.map((o) => o.value));
  const other = zones
    .filter((z) => !named.has(z))
    .map((z) => ({ value: z, label: timeZoneLabel(z) }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
  return { common, other };
}

/** Names an earlier version stored in scan locations, before the fixed table. */
const OLDER_COUNTRY_NAMES: Record<string, string> = {
  "Hong Kong SAR China": "HK",
  "Macao SAR China": "MO",
  "Palestinian Territories": "PS",
  "Falkland Islands (Islas Malvinas)": "FK",
};

/**
 * The country of a scan's location, which is stored as "Place, Country".
 * Used to start the next scan in the same country.
 */
export function countryCodeFromLocation(location: string): string | null {
  const name = location.split(",").at(-1)?.trim() ?? "";
  return (
    COUNTRIES.find((c) => c.name === name)?.code ?? OLDER_COUNTRY_NAMES[name] ?? null
  );
}
