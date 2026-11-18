import { describe, expect, it } from "vitest";
import { calculateQuote, formatMoney, roundUpHalfKg, type QuoteInput } from "./quote";
import { zoneFor } from "./zones";

const base: QuoteInput = {
  service: "Air Express",
  originCountry: "NG",
  destinationCountry: "GB",
  weightKg: 2.2,
  collection: "drop_off",
};

const quote = (input: Partial<QuoteInput>) => {
  const result = calculateQuote({ ...base, ...input });
  if (!result.ok) throw new Error(result.message);
  return result.quote;
};

describe("zoneFor", () => {
  it("groups countries by region", () => {
    expect(zoneFor("GB")).toBe("uk_ie");
    expect(zoneFor("FR")).toBe("europe");
    expect(zoneFor("US")).toBe("north_america");
    expect(zoneFor("GH")).toBe("africa");
    expect(zoneFor("NG")).toBe("africa");
    expect(zoneFor("AE")).toBe("asia");
    expect(zoneFor("BR")).toBe("rest");
    expect(zoneFor("AU")).toBe("rest");
    expect(zoneFor("MU")).toBe("africa");
  });
});

describe("roundUpHalfKg", () => {
  it("rounds up to the next half kilo", () => {
    expect(roundUpHalfKg(2.2)).toBe(2.5);
    expect(roundUpHalfKg(2.5)).toBe(2.5);
    expect(roundUpHalfKg(2.51)).toBe(3);
  });
});

describe("calculateQuote", () => {
  it("prices Lagos to London by the kilo, in naira, with VAT", () => {
    const q = quote({});
    expect(q.currency).toBe("NGN");
    expect(q.chargeableKg).toBe(2.5);
    // 2.5 kg x 18,500 = 46,250, plus 2,500 handling = 48,750; VAT 7.5% = 3,656.25
    expect(q.subtotalMinor).toBe(4_875_000);
    expect(q.vatMinor).toBe(365_625);
    expect(q.totalMinor).toBe(5_240_625);
    expect(formatMoney(q.totalMinor)).toBe("₦52,406.25");
  });

  it("charges the bigger of real and volumetric weight", () => {
    // 50 x 40 x 30 cm = 60,000 cm3 / 5,000 = 12 kg volumetric
    const q = quote({ weightKg: 3, dimensionsCm: { length: 50, width: 40, height: 30 } });
    expect(q.volumetricKg).toBe(12);
    expect(q.chargeableKg).toBe(12);
  });

  it("charges at least 1 kg by air", () => {
    expect(quote({ weightKg: 0.2 }).chargeableKg).toBe(1);
  });

  it("adds the pickup fee only for pickups", () => {
    const dropOff = quote({});
    const pickup = quote({ collection: "pickup" });
    expect(pickup.subtotalMinor - dropOff.subtotalMinor).toBe(500_000);
    expect(pickup.lines.at(-1)?.label).toBe("Pickup in Lagos");
  });

  it("prices sea freight per kg, with a 10 kg minimum", () => {
    const q = quote({ service: "Sea Freight", destinationCountry: "US", weightKg: 4 });
    expect(q.chargeableKg).toBe(10);
    expect(q.ratePerKg).toBe(4_800);
  });

  it("uses a gentler volumetric divisor for sea", () => {
    const q = quote({
      service: "Sea Freight",
      destinationCountry: "CA",
      weightKg: 20,
      dimensionsCm: { length: 60, width: 60, height: 60 },
    });
    expect(q.volumetricKg).toBe(36);
    expect(q.chargeableKg).toBe(36);
  });

  it("quotes China to Nigeria in naira too", () => {
    const q = quote({
      originCountry: "CN",
      destinationCountry: "NG",
      service: "Air Economy",
    });
    expect(q.currency).toBe("NGN");
    expect(q.ratePerKg).toBe(9_800);
  });

  it("adds two days for far destinations by air", () => {
    expect(quote({ destinationCountry: "BR" }).transitDays).toEqual([5, 7]);
  });

  it("refuses routes the network does not run", () => {
    expect(
      calculateQuote({ ...base, service: "Sea Freight", destinationCountry: "FR" }),
    ).toMatchObject({
      ok: false,
      field: "destinationCountry",
    });
    expect(calculateQuote({ ...base, originCountry: "US" })).toMatchObject({
      ok: false,
      field: "originCountry",
    });
  });
});
