/**
 * Decorative barcode drawn from the tracking number.
 * It is not a scannable symbology; it makes the card read as a label.
 */
export function Barcode({ value, className }: { value: string; className?: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    for (let bit = 0; bit < 6; bit++) {
      const w = ((code >> bit) & 1) + 1;
      if ((code + bit) % 3 !== 0) bars.push({ x, w });
      x += w + 1;
    }
  }

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${x} 40`}
      preserveAspectRatio="none"
      className={className}
    >
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={40} fill="currentColor" />
      ))}
    </svg>
  );
}
