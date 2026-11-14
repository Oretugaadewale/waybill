const displayNames = new Intl.DisplayNames(["en-GB"], { type: "region" });

/** Short, familiar English name for an ISO country code: "GB" -> "United Kingdom". */
export function countryName(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}
