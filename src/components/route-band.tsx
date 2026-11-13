import type { Place } from "@/lib/shipments/types";
import { countryName } from "@/lib/shipments/tracking";

interface RouteBandProps {
  origin: Place;
  destination: Place;
  size?: "large" | "compact";
}

/** The two hub codes, set big, the way they read on a printed waybill. */
export function RouteBand({ origin, destination, size = "large" }: RouteBandProps) {
  const codeClass =
    size === "large"
      ? "text-6xl sm:text-8xl"
      : "text-5xl";

  return (
    <div className="flex items-end justify-between gap-4">
      <PlaceBlock place={origin} label="From" codeClass={codeClass} />
      <div aria-hidden="true" className="mb-6 flex flex-1 items-center sm:mb-9">
        <span className="h-0.5 flex-1 bg-ink" />
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-ink">
          <path d="M0 0 L12 6 L0 12 Z" fill="currentColor" />
        </svg>
      </div>
      <PlaceBlock place={destination} label="To" codeClass={codeClass} align="right" />
    </div>
  );
}

function PlaceBlock({
  place,
  label,
  codeClass,
  align = "left",
}: {
  place: Place;
  label: string;
  codeClass: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`font-bold leading-none tracking-tight ${codeClass}`}>
        <abbr title={`${place.city} hub`} className="no-underline">
          {place.hub}
        </abbr>
      </p>
      <p className="mt-2 text-sm font-medium">
        {place.city}, {countryName(place.country)}
      </p>
    </div>
  );
}
