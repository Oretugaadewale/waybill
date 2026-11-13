import type { ShipmentStage } from "@/lib/shipments/types";
import { STAGE_LABELS } from "@/lib/shipments/tracking";

export function StatusBadge({ stage }: { stage: ShipmentStage }) {
  const delivered = stage === "delivered";
  return (
    <span
      className={
        delivered
          ? "inline-flex items-center gap-2 rounded-sm bg-signal-soft px-3 py-1 text-sm font-semibold text-signal"
          : "inline-flex items-center gap-2 rounded-sm bg-tape px-3 py-1 text-sm font-semibold text-ink"
      }
    >
      <span
        aria-hidden="true"
        className={delivered ? "h-2 w-2 rounded-full bg-signal" : "h-2 w-2 rounded-full bg-ink"}
      />
      {STAGE_LABELS[stage]}
    </span>
  );
}
