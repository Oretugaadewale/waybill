import type { Shipment } from "@/lib/shipments/types";
import { formatDate } from "@/lib/shipments/tracking";

/** The boxed fields of a waybill: each fact in its own ruled cell. */
export function ShipmentFacts({ shipment }: { shipment: Shipment }) {
  const delivered = shipment.events.at(-1)?.stage === "delivered";
  const facts: { label: string; value: string }[] = [
    {
      label: delivered ? "Delivered on" : "Estimated delivery",
      value: delivered
        ? formatDate(shipment.events.at(-1)!.at)
        : formatDate(shipment.estimatedDelivery),
    },
    { label: "Service", value: shipment.service },
    { label: "Carrier", value: shipment.carrier },
    { label: "Weight", value: `${shipment.weightKg} kg` },
    { label: "Pieces", value: String(shipment.pieces) },
    { label: "Contents", value: shipment.contents },
  ];

  return (
    <dl className="grid grid-cols-2 border-l border-t border-ink sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="border-b border-r border-ink px-4 py-3">
          <dt className="text-xs text-ink-soft">{fact.label}</dt>
          <dd className="mt-1 text-base font-medium">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
