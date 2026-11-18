import Link from "next/link";

const NAV = [
  { href: "/", label: "Track" },
  { href: "/quote", label: "Get a quote" },
  { href: "/book", label: "Book a shipment" },
];

export function SiteHeader() {
  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-sm bg-tape font-mono text-sm font-semibold text-ink"
          >
            W
          </span>
          <span className="text-lg font-semibold tracking-tight">Waybill</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="underline-offset-4 hover:underline focus-visible:outline-paper"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
