import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
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
