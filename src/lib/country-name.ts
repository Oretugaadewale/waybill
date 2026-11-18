import { COUNTRY_NAMES } from "./country-names";

/** Short, familiar English name for an ISO country code: "GB" -> "United Kingdom". */
export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}
