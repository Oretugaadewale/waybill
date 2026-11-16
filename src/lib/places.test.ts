import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  countryCodeFromLocation,
  countryName,
  isKnownCountry,
  offsetMinutesAt,
  timeZoneLabel,
  timeZonesFor,
  wallTimeToInstant,
} from "./places";

describe("countries", () => {
  it("covers well over 200 countries, sorted by name", () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
    const names = COUNTRIES.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("uses familiar names", () => {
    expect(countryName("GB")).toBe("United Kingdom");
    expect(countryName("NG")).toBe("Nigeria");
    expect(countryName("CN")).toBe("China");
  });

  it("knows real codes only", () => {
    expect(isKnownCountry("NG")).toBe(true);
    expect(isKnownCountry("XX")).toBe(false);
  });
});

describe("time zones", () => {
  it("lists one zone for Nigeria and several for the US", () => {
    expect(timeZonesFor("NG")).toEqual(["Africa/Lagos"]);
    expect(timeZonesFor("US")).toContain("America/Chicago");
  });

  it("labels zones for people", () => {
    expect(timeZoneLabel("America/Indiana/Indianapolis")).toBe("Indiana / Indianapolis");
    expect(timeZoneLabel("America/New_York")).toBe("New York");
  });

  it("reads offsets with daylight saving", () => {
    expect(offsetMinutesAt("Africa/Lagos", new Date("2026-11-14T08:00:00Z"))).toBe(60);
    expect(offsetMinutesAt("America/Chicago", new Date("2026-11-14T08:00:00Z"))).toBe(
      -360,
    );
    expect(offsetMinutesAt("America/Chicago", new Date("2026-07-14T08:00:00Z"))).toBe(
      -300,
    );
    expect(offsetMinutesAt("Europe/London", new Date("2026-11-14T08:00:00Z"))).toBe(0);
    expect(offsetMinutesAt("Asia/Kolkata", new Date("2026-11-14T08:00:00Z"))).toBe(330);
  });
});

describe("wallTimeToInstant", () => {
  it("turns a local time at a place into the real instant", () => {
    expect(wallTimeToInstant("2026-11-14T09:30", "Africa/Lagos").toISOString()).toBe(
      "2026-11-14T08:30:00.000Z",
    );
    expect(wallTimeToInstant("2026-11-14T09:30", "America/Chicago").toISOString()).toBe(
      "2026-11-14T15:30:00.000Z",
    );
  });

  it("stays right on the day the clocks change", () => {
    // US clocks went back at 2am on 1 November 2026.
    expect(wallTimeToInstant("2026-11-01T12:00", "America/Chicago").toISOString()).toBe(
      "2026-11-01T18:00:00.000Z",
    );
  });

  it("rejects malformed input", () => {
    expect(() => wallTimeToInstant("14/11/2026 09:30", "Africa/Lagos")).toThrow();
  });
});

describe("timeZoneOptions", () => {
  it("puts the common US zones first, with plain names", async () => {
    const { timeZoneOptions } = await import("./places");
    const { common, other } = timeZoneOptions("US");
    expect(common[0]).toEqual({
      value: "America/New_York",
      label: "Eastern: New York, Atlanta, Miami",
    });
    expect(common.map((o) => o.label)).toContain("Central: Chicago, Houston, Dallas");
    expect(other.some((o) => o.value === "America/Chicago")).toBe(false);
    expect(other.length).toBeGreaterThan(10);
  });

  it("starts Canada with Toronto", async () => {
    const { timeZoneOptions } = await import("./places");
    expect(timeZoneOptions("CA").common[0].value).toBe("America/Toronto");
  });
});

describe("countryCodeFromLocation", () => {
  it("reads the country at the end of a scan location", async () => {
    const { countryCodeFromLocation } = await import("./places");
    expect(countryCodeFromLocation("Heathrow Airport, London, United Kingdom")).toBe(
      "GB",
    );
    expect(countryCodeFromLocation("Ojota office, Lagos, Nigeria")).toBe("NG");
    expect(countryCodeFromLocation("Somewhere")).toBeNull();
  });
});

describe("country names", () => {
  it("has a fixed name for every country the time zone data knows", async () => {
    const { getAllCountries } = await import("countries-and-timezones");
    const { COUNTRY_NAMES } = await import("./country-names");
    const missing = Object.keys(getAllCountries()).filter(
      (code) => /^[A-Z]{2}$/.test(code) && !COUNTRY_NAMES[code],
    );
    expect(missing).toEqual([]);
  });

  it("uses the short names people know, whatever the ICU data says", () => {
    expect(countryName("HK")).toBe("Hong Kong");
    expect(countryName("PS")).toBe("Palestine");
    expect(countryName("GB")).toBe("United Kingdom");
  });

  it("lists countries in alphabetical order", () => {
    const names = COUNTRIES.map((c) => c.name);
    expect(names.slice(0, 2)).toEqual(["Afghanistan", "Åland Islands"]);
    expect([...names].sort((a, b) => a.localeCompare(b, "en"))).toEqual(names);
  });

  it("still reads scans saved with the older long names", () => {
    expect(countryCodeFromLocation("Kowloon, Hong Kong SAR China")).toBe("HK");
    expect(countryCodeFromLocation("Kowloon, Hong Kong")).toBe("HK");
  });
});
