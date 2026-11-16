"use client";

import { submitWithoutReset } from "@/components/form/submit-without-reset";
import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/admin/form-state";
import {
  AIR_ORIGINS,
  SEA_DESTINATIONS,
  SEA_ORIGINS,
  SERVICE_LEVELS,
} from "@/lib/shipments/rules";
import type { ServiceLevel } from "@/lib/shipments/types";
import { Field, FormMessage, SubmitButton, inputClass } from "../../_components/fields";
import { PlacePicker } from "../../_components/place-picker";
import { createShipment } from "../actions";

const fieldset =
  "grid gap-5 rounded-sm border-2 border-ink bg-paper p-5 sm:grid-cols-2 sm:p-6";
const legend = "px-2 text-lg font-bold";

export function NewShipmentForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(createShipment, initialFormState);
  const v = state.values;
  const e = state.errors;
  const [service, setService] = useState<ServiceLevel | "">(
    (v.service as ServiceLevel) ?? "",
  );
  const sea = service === "Sea Freight";

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      noValidate
      className="flex flex-col gap-8"
    >
      <FormMessage ok={state.ok} message={state.message} stamp={state.savedAt} />

      <Field
        id="service"
        label="Service"
        hint="Air ships from Nigeria or China to any country. Sea ships from Nigeria to the United States, Canada and the United Kingdom."
        error={e.service}
        className="max-w-md"
      >
        {(describedBy, invalid) => (
          <select
            id="service"
            name="service"
            value={service}
            onChange={(ev) => setService(ev.target.value as ServiceLevel)}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClass}
          >
            <option value="">Choose a service</option>
            {SERVICE_LEVELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className={fieldset}>
        <legend className={legend}>From</legend>
        <PlacePicker
          key={`origin-${sea}`}
          idPrefix="origin"
          names={{ country: "originCountry", timeZone: "originTimeZone" }}
          countryLabel="Country"
          countryCodes={sea ? SEA_ORIGINS : AIR_ORIGINS}
          defaultCountry={v.originCountry ?? "NG"}
          defaultTimeZone={v.originTimeZone}
          errors={e}
        />
        <TextField
          id="originCity"
          label="City"
          values={v}
          errors={e}
          autoComplete="off"
        />
        <HubField id="originHub" values={v} errors={e} example="LOS" />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>To</legend>
        <PlacePicker
          key={`destination-${sea}`}
          idPrefix="destination"
          names={{ country: "destinationCountry", timeZone: "destinationTimeZone" }}
          countryLabel="Country"
          countryCodes={sea ? SEA_DESTINATIONS : undefined}
          defaultCountry={v.destinationCountry}
          errors={e}
        />
        <TextField
          id="destinationCity"
          label="City"
          values={v}
          errors={e}
          autoComplete="off"
        />
        <HubField id="destinationHub" values={v} errors={e} example="LHR" />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Package</legend>
        <TextField
          id="carrier"
          label="Carrier"
          hint="Who flies or ships it, e.g. DHL Express."
          values={v}
          errors={e}
        />
        <TextField
          id="contents"
          label="Contents"
          hint="What the customer sees on the tracking page."
          values={v}
          errors={e}
        />
        <TextField
          id="weightKg"
          label="Weight (kg)"
          inputMode="decimal"
          values={v}
          errors={e}
        />
        <TextField id="pieces" label="Pieces" inputMode="numeric" values={v} errors={e} />
        <TextField
          id="estimatedDelivery"
          label="Estimated delivery"
          type="date"
          min={today}
          values={v}
          errors={e}
        />
      </fieldset>

      <div>
        <SubmitButton pending={pending} pendingText="Creating shipment">
          Create shipment
        </SubmitButton>
        <p className="mt-3 text-sm text-ink-soft">
          Waybill gives it a tracking number and posts the first Booked scan.
        </p>
      </div>
    </form>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  hint?: string;
  values: Record<string, string>;
  errors: Record<string, string>;
  type?: string;
  inputMode?: "decimal" | "numeric";
  min?: string;
  autoComplete?: string;
}

function TextField({
  id,
  label,
  hint,
  values,
  errors,
  type = "text",
  ...rest
}: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={errors[id]}>
      {(describedBy, invalid) => (
        <input
          id={id}
          name={id}
          type={type}
          defaultValue={values[id] ?? ""}
          required
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={inputClass}
          {...rest}
        />
      )}
    </Field>
  );
}

function HubField({
  id,
  values,
  errors,
  example,
}: {
  id: string;
  values: Record<string, string>;
  errors: Record<string, string>;
  example: string;
}) {
  return (
    <Field
      id={id}
      label="Hub code"
      hint={`The airport or port code, e.g. ${example}.`}
      error={errors[id]}
    >
      {(describedBy, invalid) => (
        <input
          id={id}
          name={id}
          defaultValue={values[id] ?? ""}
          maxLength={3}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          required
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${inputClass} max-w-32 font-mono uppercase`}
        />
      )}
    </Field>
  );
}
