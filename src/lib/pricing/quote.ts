import { routeProblem } from "@/lib/shipments/rules";
import type { ServiceLevel } from "@/lib/shipments/types";
import {
  CURRENCY,
  MIN_CHARGEABLE_KG,
  RATE_CARD,
  RATE_CARD_VERSION,
  TRANSIT_DAYS,
  VAT_RATE,
  VOLUMETRIC_DIVISOR,
  type Currency,
  type OriginCountry,
} from "./rate-card";
import { ZONE_LABELS, zoneFor, type Zone } from "./zones";

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface QuoteInput {
  service: ServiceLevel;
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  /** Box size in cm. Optional: without it we charge the actual weight. */
  dimensionsCm?: Dimensions | null;
  collection: "drop_off" | "pickup";
}

export interface QuoteLine {
  label: string;
  /** Amount in kobo. */
  amountMinor: number;
}

export interface Quote {
  currency: Currency;
  zone: Zone;
  zoneLabel: string;
  actualKg: number;
  volumetricKg: number | null;
  chargeableKg: number;
  ratePerKg: number;
  lines: QuoteLine[];
  subtotalMinor: number;
  vatMinor: number;
  totalMinor: number;
  transitDays: [number, number];
  rateCardVersion: string;
}

export type QuoteResult =
  { ok: true; quote: Quote } | { ok: false; field: string; message: string };

/** Rounds up to the next half kilo, as couriers do. */
export function roundUpHalfKg(kg: number): number {
  return Math.ceil(kg * 2 - 1e-9) / 2;
}

/**
 * Prices a shipment from the rate card. Pure and deterministic, so the
 * browser can show it live and the server can recompute it before saving
 * or charging. The server never trusts a price sent by the browser.
 */
export function calculateQuote(input: QuoteInput): QuoteResult {
  const problem = routeProblem(
    input.service,
    input.originCountry,
    input.destinationCountry,
  );
  if (problem) return { ok: false, ...problem };

  const rates = RATE_CARD[input.originCountry as OriginCountry];
  if (!rates) {
    return {
      ok: false,
      field: "originCountry",
      message: "Shipments start in Nigeria or China.",
    };
  }
  if (!(input.weightKg > 0)) {
    return { ok: false, field: "weightKg", message: "Enter the weight in kilograms." };
  }

  const zone = zoneFor(input.destinationCountry);
  const sea = input.service === "Sea Freight";
  const ratePerKg = sea
    ? rates.seaPerKg[input.destinationCountry]
    : rates.airPerKg[input.service as "Air Express" | "Air Economy"][zone];
  if (!ratePerKg) {
    return {
      ok: false,
      field: "destinationCountry",
      message: "This service does not run to that country.",
    };
  }

  const dims = input.dimensionsCm ?? null;
  const divisor = sea ? VOLUMETRIC_DIVISOR.sea : VOLUMETRIC_DIVISOR.air;
  const volumetricKg = dims
    ? Math.round(((dims.length * dims.width * dims.height) / divisor) * 100) / 100
    : null;

  // Charge whichever is bigger: the real weight or the space the box takes.
  const chargeableKg = Math.max(
    sea ? MIN_CHARGEABLE_KG.sea : MIN_CHARGEABLE_KG.air,
    roundUpHalfKg(Math.max(input.weightKg, volumetricKg ?? 0)),
  );

  const lines: QuoteLine[] = [
    {
      label: `${input.service}, ${chargeableKg} kg at ${formatMoney(ratePerKg * 100)} per kg`,
      amountMinor: Math.round(ratePerKg * 100 * chargeableKg),
    },
    { label: "Handling", amountMinor: rates.handlingFee * 100 },
  ];
  if (input.collection === "pickup") {
    lines.push({
      label: `Pickup in ${rates.hub.city}`,
      amountMinor: rates.pickupFee * 100,
    });
  }

  const subtotalMinor = lines.reduce((sum, l) => sum + l.amountMinor, 0);
  const vatMinor = Math.round(subtotalMinor * VAT_RATE);
  const [min, max] = TRANSIT_DAYS[input.service];
  const extra = !sea && zone === "rest" ? 2 : 0;

  return {
    ok: true,
    quote: {
      currency: CURRENCY,
      zone,
      zoneLabel: ZONE_LABELS[zone],
      actualKg: input.weightKg,
      volumetricKg,
      chargeableKg,
      ratePerKg,
      lines,
      subtotalMinor,
      vatMinor,
      totalMinor: subtotalMinor + vatMinor,
      transitDays: [min + extra, max + extra],
      rateCardVersion: RATE_CARD_VERSION,
    },
  };
}

/** "₦18,500" or "₦1,234.50": no kobo when the amount is whole. */
export function formatMoney(amountMinor: number): string {
  const whole = amountMinor % 100 === 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: CURRENCY,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amountMinor / 100);
}
