"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { isValidTrackingNumber, normalizeTrackingNumber } from "@/lib/shipments/tracking";

interface TrackingFormProps {
  defaultValue?: string;
}

export function TrackingForm({ defaultValue = "" }: TrackingFormProps) {
  const router = useRouter();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trackingNumber = normalizeTrackingNumber(value);

    if (!value.trim()) {
      setError("Enter your tracking number.");
      return;
    }
    if (!isValidTrackingNumber(trackingNumber)) {
      setError(
        "Tracking numbers look like WB-1042-US. Check the number on your receipt.",
      );
      return;
    }

    setError(null);
    router.push(`/track/${trackingNumber}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-xl">
      <label htmlFor={inputId} className="block text-base font-medium">
        Tracking number
      </label>
      <p id={hintId} className="mt-1 text-sm text-ink-soft">
        Printed on your receipt, for example WB-1042-US.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          name="trackingNumber"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={error ? true : undefined}
          className="min-h-12 flex-1 rounded-sm border-2 border-ink bg-paper px-4 font-mono text-lg tracking-wide placeholder:text-ink-soft/60 aria-[invalid]:border-red-700"
          placeholder="WB-0000-NG"
        />
        <button
          type="submit"
          className="min-h-12 rounded-sm bg-ink px-6 text-base font-semibold text-paper hover:bg-ink/90"
        >
          Track shipment
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
