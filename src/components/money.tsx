import { formatMoney } from "@/lib/pricing/quote";

/**
 * A naira amount for places set in the monospaced face. IBM Plex has no ₦,
 * so the browser borrowed a much heavier sign from another font. The sign is
 * drawn here in the sans face at a matched size.
 */
export function Money({ minor }: { minor: number }) {
  const text = formatMoney(minor);
  const digits = text.replace(/^₦/, "");
  return (
    <span className="whitespace-nowrap">
      <span
        aria-hidden="true"
        className="mr-[0.04em] font-sans text-[0.82em] font-semibold"
      >
        ₦
      </span>
      <span className="sr-only">₦</span>
      {digits}
    </span>
  );
}
