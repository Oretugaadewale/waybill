"use client";

import { submitWithoutReset } from "@/components/form/submit-without-reset";
import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/admin/form-state";
import { DEFAULT_NOTES } from "@/lib/shipments/rules";
import { STAGE_LABELS } from "@/lib/shipments/tracking";
import type { ShipmentStage } from "@/lib/shipments/types";
import { Field, FormMessage, SubmitButton, inputClass } from "../../_components/fields";
import { PlacePicker } from "../../_components/place-picker";
import { addTrackingEvent } from "../actions";

interface AddEventFormProps {
  trackingNumber: string;
  stages: ShipmentStage[];
  defaultCountry: string;
}

export function AddEventForm({
  trackingNumber,
  stages,
  defaultCountry,
}: AddEventFormProps) {
  const [state, formAction, pending] = useActionState(
    addTrackingEvent.bind(null, trackingNumber),
    initialFormState,
  );
  const v = state.values;
  const e = state.errors;
  const [stage, setStage] = useState<ShipmentStage>(
    (v.stage as ShipmentStage) ?? stages[0],
  );

  return (
    // A new key after each save gives a fresh, empty form.
    <form
      key={state.savedAt}
      onSubmit={submitWithoutReset(formAction)}
      noValidate
      className="grid gap-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <FormMessage ok={state.ok} message={state.message} stamp={state.savedAt} />
      </div>

      <Field id="stage" label="Stage" error={e.stage} className="sm:col-span-2">
        {(describedBy, invalid) => (
          <select
            id="stage"
            name="stage"
            value={stage}
            onChange={(ev) => setStage(ev.target.value as ShipmentStage)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="event-city"
        label="Place"
        hint="City, hub or warehouse, e.g. Murtala Muhammed Airport, Lagos."
        error={e.city}
      >
        {(describedBy, invalid) => (
          <input
            id="event-city"
            name="city"
            defaultValue={v.city ?? ""}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </Field>

      <PlacePicker
        idPrefix="event"
        names={{ country: "country", timeZone: "timeZone" }}
        countryLabel="Country"
        defaultCountry={v.country ?? defaultCountry}
        defaultTimeZone={v.timeZone}
        errors={e}
      />

      <Field
        id="occurredAt"
        label="Local time of the scan"
        hint="Leave blank to use the time right now."
        error={e.occurredAt}
      >
        {(describedBy, invalid) => (
          <input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            defaultValue={v.occurredAt ?? ""}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </Field>

      <Field
        id="note"
        label="Note for the customer"
        hint="Optional. Leave blank to use the suggestion."
        error={e.note}
        className="sm:col-span-2"
      >
        {(describedBy, invalid) => (
          <textarea
            id="note"
            name="note"
            rows={2}
            maxLength={300}
            defaultValue={v.note ?? ""}
            placeholder={DEFAULT_NOTES[stage]}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`${inputClass} py-3`}
          />
        )}
      </Field>

      <div className="sm:col-span-2">
        <SubmitButton pending={pending} pendingText="Posting update">
          Post update
        </SubmitButton>
      </div>
    </form>
  );
}
