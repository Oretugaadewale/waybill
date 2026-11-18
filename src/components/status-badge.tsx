import type { ShipmentStage } from "@/lib/shipments/types";
import { STAGE_LABELS } from "@/lib/shipments/tracking";

interface StatusBadgeProps {
  stage: ShipmentStage;
  cancelled?: boolean;
}

const STYLES = {
  active: { badge: "bg-tape text-ink", dot: "bg-ink" },
  delivered: { badge: "bg-signal-soft text-signal", dot: "bg-signal" },
  cancelled: { badge: "border border-ink bg-concrete text-ink", dot: "bg-ink-soft" },
} as const;

export function StatusBadge({ stage, cancelled = false }: StatusBadgeProps) {
  const tone = cancelled ? "cancelled" : stage === "delivered" ? "delivered" : "active";
  const style = STYLES[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-sm px-3 py-1 text-sm font-semibold ${style.badge}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot}`} />
      {cancelled ? "Cancelled" : STAGE_LABELS[stage]}
    </span>
  );
}
