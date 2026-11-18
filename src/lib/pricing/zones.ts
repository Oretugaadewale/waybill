import { getCountry } from "countries-and-timezones";

/** Pricing zones. Every destination falls into exactly one. */
export const ZONES = [
  "uk_ie",
  "europe",
  "north_america",
  "africa",
  "asia",
  "rest",
] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABELS: Record<Zone, string> = {
  uk_ie: "UK and Ireland",
  europe: "Europe",
  north_america: "United States and Canada",
  africa: "Africa",
  asia: "Asia and the Middle East",
  rest: "Rest of the world",
};

/** Islands whose time zone sits under "Indian" or "Atlantic" but which we price with a continent. */
const OVERRIDES: Record<string, Zone> = {
  GB: "uk_ie",
  IE: "uk_ie",
  US: "north_america",
  CA: "north_america",
  CV: "africa",
  KM: "africa",
  MG: "africa",
  MU: "africa",
  RE: "africa",
  SC: "africa",
  YT: "africa",
  IS: "europe",
  FO: "europe",
  MV: "asia",
};

/**
 * The zone for a country. Uses the region of its main IANA time zone
 * ("Africa/Lagos" -> Africa), so all 240+ countries are covered without a
 * hand-written list, plus a few overrides for islands.
 */
export function zoneFor(countryCode: string): Zone {
  const override = OVERRIDES[countryCode];
  if (override) return override;
  const area = getCountry(countryCode)?.timezones[0]?.split("/")[0];
  switch (area) {
    case "Europe":
      return "europe";
    case "Africa":
      return "africa";
    case "Asia":
      return "asia";
    default:
      return "rest";
  }
}
