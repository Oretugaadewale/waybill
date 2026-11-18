import { countryName } from "@/lib/country-name";
import { SHIPMENT_STAGES, type ServiceLevel, type ShipmentStage } from "./types";

export const SERVICE_LEVELS: readonly ServiceLevel[] = [
  "Air Express",
  "Air Economy",
  "Sea Freight",
];

/** Where eShopAfrica-style routes can start, by service. */
export const AIR_ORIGINS = ["NG", "CN"] as const;
export const SEA_ORIGINS = ["NG"] as const;
/** Sea freight only runs to these countries. */
export const SEA_DESTINATIONS = ["US", "CA", "GB"] as const;

const includes = (list: readonly string[], value: string) => list.includes(value);

/** Plain-English list: ["US", "CA", "GB"] -> "United States, Canada or United Kingdom". */
function namesOf(codes: readonly string[]): string {
  const names = codes.map(countryName);
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

/**
 * Checks a route against what the service actually runs.
 * Returns a message for the person filling in the form, or null if it is fine.
 */
export function routeProblem(
  service: ServiceLevel,
  origin: string,
  destination: string,
): { field: "originCountry" | "destinationCountry"; message: string } | null {
  if (origin === destination) {
    return {
      field: "destinationCountry",
      message: "The destination must be in a different country from the origin.",
    };
  }

  if (service === "Sea Freight") {
    if (!includes(SEA_ORIGINS, origin)) {
      return {
        field: "originCountry",
        message: `Sea freight ships from ${namesOf(SEA_ORIGINS)} only.`,
      };
    }
    if (!includes(SEA_DESTINATIONS, destination)) {
      return {
        field: "destinationCountry",
        message: `Sea freight goes to ${namesOf(SEA_DESTINATIONS)} only. Use an air service for other countries.`,
      };
    }
    return null;
  }

  if (!includes(AIR_ORIGINS, origin)) {
    return {
      field: "originCountry",
      message: `Air shipments start in ${namesOf(AIR_ORIGINS)}.`,
    };
  }
  return null;
}

/** The ending of a tracking number: the destination country, with GB written UK. */
export function trackingSuffix(destinationCountry: string): string {
  return destinationCountry === "GB" ? "UK" : destinationCountry;
}

/** Stages that can be scanned more than once, e.g. several transit hubs. */
export const REPEATABLE_STAGES: readonly ShipmentStage[] = ["in_transit", "at_customs"];

/**
 * Which stages the next scan may use. Mirrors the database trigger so the form
 * only offers valid choices; the database still has the final say.
 */
export function allowedNextStages(
  latest: ShipmentStage | null,
  cancelled: boolean,
): ShipmentStage[] {
  if (cancelled) return [];
  if (latest === null) return ["booked"];
  if (latest === "delivered") return [];
  const from = SHIPMENT_STAGES.indexOf(latest);
  return SHIPMENT_STAGES.filter((stage, i) =>
    i === from ? REPEATABLE_STAGES.includes(stage) : i > from,
  );
}

/** A sensible note for each stage, used when the admin leaves the note blank. */
export const DEFAULT_NOTES: Record<ShipmentStage, string> = {
  booked: "Shipment booked. Waiting for courier collection.",
  picked_up: "Collected from the sender.",
  in_transit: "In transit to the next hub.",
  at_customs: "With customs for clearance.",
  out_for_delivery: "Out with the courier for delivery today.",
  delivered: "Delivered.",
};
