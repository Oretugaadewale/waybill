"use client";

import { submitWithoutReset } from "@/components/form/submit-without-reset";
import { useActionState } from "react";
import { initialFormState } from "@/lib/admin/form-state";
import { Field, FormMessage, SubmitButton, inputClass } from "../../_components/fields";
import { cancelShipment } from "../actions";

export function CancelForm({ trackingNumber }: { trackingNumber: string }) {
  const [state, formAction, pending] = useActionState(
    cancelShipment.bind(null, trackingNumber),
    initialFormState,
  );

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormMessage ok={state.ok} message={state.message} stamp={state.savedAt} />
      <Field
        id="reason"
        label="Reason"
        hint="For staff only. Customers see that it was cancelled, not why."
        error={state.errors.reason}
      >
        {(describedBy, invalid) => (
          <textarea
            id="reason"
            name="reason"
            rows={2}
            maxLength={300}
            defaultValue={state.values.reason ?? ""}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`${inputClass} py-3`}
          />
        )}
      </Field>
      <div>
        <SubmitButton pending={pending} pendingText="Cancelling" tone="danger">
          Cancel shipment
        </SubmitButton>
        <p className="mt-2 text-sm text-ink-soft">
          This cannot be undone. The shipment and its history stay on record.
        </p>
      </div>
    </form>
  );
}
