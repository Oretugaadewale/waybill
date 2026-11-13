import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-sm bg-tape font-mono text-sm font-semibold text-ink"
          >
            W
          </span>
          <span className="text-lg font-semibold tracking-tight">Waybill</span>
        </Link>
        <p className="text-sm text-paper/70">Demo with sample shipments</p>
      </div>
    </header>
  );
}
