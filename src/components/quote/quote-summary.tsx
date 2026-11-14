import { formatMoney, type Quote } from "@/lib/pricing/quote";

/** The price breakdown, laid out like the charges box on a waybill. */
export function QuoteSummary({ quote }: { quote: Quote }) {
  const [min, max] = quote.transitDays;
  return (
    <div className="rounded-sm border-2 border-ink bg-paper">
      <div className="border-b-2 border-ink px-5 py-4">
        <p className="text-sm text-ink-soft">Total to pay</p>
        <p className="font-mono text-4xl font-semibold tracking-tight">
          {formatMoney(quote.totalMinor)}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Arrives in about {min} to {max} working days. Zone: {quote.zoneLabel}.
        </p>
      </div>

      <dl className="divide-y divide-rule px-5 text-sm">
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-ink-soft">Weight we charge</dt>
          <dd className="text-right font-medium">
            {quote.chargeableKg} kg
            <span className="block text-xs font-normal text-ink-soft">
              {quote.volumetricKg !== null && quote.volumetricKg > quote.actualKg
                ? `Box size counts as ${quote.volumetricKg} kg, more than its ${quote.actualKg} kg`
                : `Actual weight ${quote.actualKg} kg`}
            </span>
          </dd>
        </div>
        {quote.lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-4 py-3">
            <dt>{line.label}</dt>
            <dd className="font-mono tabular-nums">{formatMoney(line.amountMinor)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-3">
          <dt>VAT (7.5%)</dt>
          <dd className="font-mono tabular-nums">{formatMoney(quote.vatMinor)}</dd>
        </div>
      </dl>
    </div>
  );
}
