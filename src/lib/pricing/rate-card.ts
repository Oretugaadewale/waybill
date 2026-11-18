import type { Zone } from "./zones";

/**
 * Demo rate card. The numbers are invented for this portfolio project and
 * are not any real company's prices.
 *
 * Everything is priced per chargeable kilo, sea freight included, and every
 * quote is in naira so Paystack can charge it. Amounts are in naira.
 */
export const RATE_CARD_VERSION = "2026-11";

export type Currency = "NGN";
export const CURRENCY: Currency = "NGN";

export type OriginCountry = "NG" | "CN";
export type AirService = "Air Express" | "Air Economy";

export interface OriginRates {
  /** Where drop-offs go and pickups happen. */
  hub: { city: string; code: string; dropOff: string };
  /** Naira per chargeable kg, by service and destination zone. */
  airPerKg: Record<AirService, Record<Zone, number>>;
  /** Naira per chargeable kg for sea freight, by destination country. */
  seaPerKg: Partial<Record<string, number>>;
  pickupFee: number;
  handlingFee: number;
}

export const RATE_CARD: Record<OriginCountry, OriginRates> = {
  NG: {
    hub: { city: "Lagos", code: "LOS", dropOff: "our Lagos office in Ojota" },
    airPerKg: {
      "Air Express": {
        uk_ie: 18_500,
        europe: 21_000,
        north_america: 22_500,
        africa: 16_000,
        asia: 24_000,
        rest: 26_500,
      },
      "Air Economy": {
        uk_ie: 12_500,
        europe: 14_500,
        north_america: 15_500,
        africa: 11_000,
        asia: 16_500,
        rest: 18_500,
      },
    },
    seaPerKg: { GB: 4_200, US: 4_800, CA: 5_000 },
    pickupFee: 5_000,
    handlingFee: 2_500,
  },
  CN: {
    hub: { city: "Guangzhou", code: "CAN", dropOff: "our Guangzhou warehouse" },
    airPerKg: {
      "Air Express": {
        uk_ie: 13_000,
        europe: 12_800,
        north_america: 14_000,
        africa: 14_500,
        asia: 9_000,
        rest: 16_500,
      },
      "Air Economy": {
        uk_ie: 9_000,
        europe: 8_800,
        north_america: 9_600,
        africa: 9_800,
        asia: 6_200,
        rest: 11_500,
      },
    },
    seaPerKg: {},
    pickupFee: 6_500,
    handlingFee: 2_500,
  },
};

/** Nigerian VAT, charged on every quote. */
export const VAT_RATE = 0.075;

/** Cubic centimetres that count as 1 kg when a box is big but light. */
export const VOLUMETRIC_DIVISOR = { air: 5_000, sea: 6_000 } as const;
export const MIN_CHARGEABLE_KG = { air: 1, sea: 10 } as const;

/** Working days, door to door, as a range. */
export const TRANSIT_DAYS: Record<string, [number, number]> = {
  "Air Express": [3, 5],
  "Air Economy": [7, 12],
  "Sea Freight": [35, 50],
};

export const LIMITS = {
  maxWeightKg: { air: 500, sea: 5_000 },
  maxSideCm: 300,
};
