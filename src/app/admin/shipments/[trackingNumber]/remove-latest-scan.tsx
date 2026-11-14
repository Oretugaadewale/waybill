"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/admin/form-state";
import { FormMessage, SubmitButton } from "../../_components/fields";
import { removeLatestEvent } from "../actions";

/** Two steps, so a scan is never removed by one stray click. */
export function RemoveLatestScan({
  trackingNumber,
  latestLabel,
}: {
  trackingNumber: string;
  latestLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    removeLatestEvent.bind(null, trackingNumber),
    initialFormState,
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <FormMessage ok={state.ok} message={state.message} />
      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <p className="w-full">
            Remove the latest scan, <strong>{latestLabel}</strong>? Customers will no
            longer see it.
          </p>
          <SubmitButton pending={pending} pendingText="Removing" tone="danger">
            Yes, remove it
          </SubmitButton>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-12 px-4 font-semibold underline underline-offset-4"
          >
            Keep it
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 self-start rounded-sm border-2 border-ink px-4 font-semibold hover:bg-concrete"
        >
          Remove latest scan
        </button>
      )}
    </div>
  );
}
