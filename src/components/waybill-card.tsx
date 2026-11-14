import type { Shipment } from "@/lib/shipments/types";
import { currentStage, formatDate, progressSteps } from "@/lib/shipments/tracking";
import { Barcode } from "./barcode";
import { ProgressSteps } from "./progress-steps";
import { RouteBand } from "./route-band";
import { ShipmentFacts } from "./shipment-facts";
import { StatusBadge } from "./status-badge";

interface WaybillCardProps {
  shipment: Shipment;
  headingLevel?: "h1" | "h2";
}

/** The shipment drawn as a printed label: number, route, progress, facts. */
export function WaybillCard({ shipment, headingLevel = "h1" }: WaybillCardProps) {
  const Heading = headingLevel;
  return (
    <article className="overflow-hidden rounded-sm border-2 border-ink bg-paper shadow-[6px_6px_0_0_var(--color-ink)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-4 sm:px-8">
        <div>
          <p className="text-sm text-ink-soft">Tracking number</p>
          <Heading className="font-mono text-2xl font-semibold tracking-wide sm:text-3xl">
            {shipment.trackingNumber}
          </Heading>
        </div>
        <StatusBadge
          stage={currentStage(shipment)}
          cancelled={Boolean(shipment.cancelledAt)}
        />
      </header>

      {shipment.cancelledAt ? (
        <p className="border-b-2 border-ink bg-concrete px-5 py-3 font-medium sm:px-8">
          This shipment was cancelled on {formatDate(shipment.cancelledAt)}. It will not
          move any further. Contact the sender if you have questions.
        </p>
      ) : null}

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <RouteBand origin={shipment.origin} destination={shipment.destination} />
      </div>

      <div className="border-t-2 border-ink px-5 py-6 sm:px-8">
        <h2 className="sr-only">Progress</h2>
        <ProgressSteps steps={progressSteps(shipment)} />
      </div>

      <div className="border-t-2 border-ink px-5 py-6 sm:px-8">
        <h2 className="sr-only">Shipment details</h2>
        <ShipmentFacts shipment={shipment} />
      </div>

      <div className="border-t-2 border-dashed border-ink px-5 py-4 sm:px-8">
        <Barcode value={shipment.trackingNumber} className="h-12 w-full text-ink" />
      </div>
    </article>
  );
}
