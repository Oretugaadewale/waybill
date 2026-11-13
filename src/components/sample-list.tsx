import Link from "next/link";
import { SAMPLE_SHIPMENTS } from "@/lib/shipments/sample-data";
import { STAGE_LABELS, currentStage } from "@/lib/shipments/tracking";

/** Sample tracking numbers, so visitors can try the demo without a receipt. */
export function SampleList() {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {SAMPLE_SHIPMENTS.map((s) => (
        <li key={s.trackingNumber}>
          <Link
            href={`/track/${s.trackingNumber}`}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 hover:bg-paper/60"
          >
            <span className="font-mono font-semibold underline underline-offset-4">
              {s.trackingNumber}
            </span>
            <span className="text-sm text-ink-soft">
              {s.origin.city} to {s.destination.city},{" "}
              {STAGE_LABELS[currentStage(s)].toLowerCase()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
