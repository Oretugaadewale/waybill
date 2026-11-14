"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/admin/form-state";
import { Field, FormMessage, SubmitButton, inputClass } from "../../_components/fields";
import { updateShipmentDetails } from "../actions";

interface EditDetailsFormProps {
  trackingNumber: string;
  current: {
    carrier: string;
    weightKg: number;
    pieces: number;
    contents: string;
    estimatedDelivery: string;
  };
}

export function EditDetailsForm({ trackingNumber, current }: EditDetailsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateShipmentDetails.bind(null, trackingNumber),
    initialFormState,
  );
  const value = (name: keyof EditDetailsFormProps["current"]) =>
    state.values[name] ?? String(current[name]);

  const fields: {
    name: keyof EditDetailsFormProps["current"];
    label: string;
    type?: string;
    inputMode?: "decimal" | "numeric";
  }[] = [
    { name: "estimatedDelivery", label: "Estimated delivery", type: "date" },
    { name: "carrier", label: "Carrier" },
    { name: "weightKg", label: "Weight (kg)", inputMode: "decimal" },
    { name: "pieces", label: "Pieces", inputMode: "numeric" },
    { name: "contents", label: "Contents" },
  ];

  return (
    <form action={formAction} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage ok={state.ok} message={state.message} />
      </div>
      {fields.map((f) => (
        <Field
          key={f.name}
          id={`detail-${f.name}`}
          label={f.label}
          error={state.errors[f.name]}
          className={f.name === "contents" ? "sm:col-span-2" : undefined}
        >
          {(describedBy, invalid) => (
            <input
              id={`detail-${f.name}`}
              name={f.name}
              type={f.type ?? "text"}
              inputMode={f.inputMode}
              defaultValue={value(f.name)}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className={inputClass}
            />
          )}
        </Field>
      ))}
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} pendingText="Saving" tone="secondary">
          Save details
        </SubmitButton>
      </div>
    </form>
  );
}
