"use client";

import { submitWithoutReset } from "@/components/form/submit-without-reset";
import { useActionState } from "react";
import { initialFormState } from "@/lib/admin/form-state";
import { Field, FormMessage, SubmitButton, inputClass } from "../../_components/fields";
import { convertBooking, declineBooking, markRefunded } from "../actions";

export function ConvertBookingForm({
  reference,
  defaults,
}: {
  reference: string;
  defaults: { originHub: string; carrier: string; estimatedDelivery: string };
}) {
  const [state, formAction, pending] = useActionState(
    convertBooking.bind(null, reference),
    initialFormState,
  );
  const value = (name: string, fallback = "") => state.values[name] ?? fallback;

  const input = (
    name: string,
    label: string,
    opts: { hint?: string; type?: string; fallback?: string; code?: boolean } = {},
  ) => (
    <Field
      id={`convert-${name}`}
      label={label}
      hint={opts.hint}
      error={state.errors[name]}
    >
      {(describedBy, invalid) => (
        <input
          id={`convert-${name}`}
          name={name}
          type={opts.type ?? "text"}
          defaultValue={value(name, opts.fallback)}
          maxLength={opts.code ? 3 : undefined}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={
            opts.code ? `${inputClass} max-w-32 font-mono uppercase` : inputClass
          }
        />
      )}
    </Field>
  );

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      noValidate
      className="grid gap-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <FormMessage ok={state.ok} message={state.message} stamp={state.savedAt} />
      </div>
      {input("originHub", "From hub", { code: true, fallback: defaults.originHub })}
      {input("destinationHub", "To hub", {
        code: true,
        hint: "Airport or port code, e.g. LHR.",
      })}
      {input("carrier", "Carrier", { fallback: defaults.carrier })}
      {input("estimatedDelivery", "Estimated delivery", {
        type: "date",
        fallback: defaults.estimatedDelivery,
      })}
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} pendingText="Creating shipment">
          Create shipment
        </SubmitButton>
        <p className="mt-2 text-sm text-ink-soft">
          Gives it a tracking number and posts the first Booked scan.
        </p>
      </div>
    </form>
  );
}

export function DeclineBookingForm({ reference }: { reference: string }) {
  const [state, formAction, pending] = useActionState(
    declineBooking.bind(null, reference),
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
        id="decline-reason"
        label="Reason"
        hint="For the record, e.g. prohibited item or duplicate booking."
        error={state.errors.reason}
      >
        {(describedBy, invalid) => (
          <textarea
            id="decline-reason"
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
        <SubmitButton pending={pending} pendingText="Declining" tone="danger">
          Decline booking
        </SubmitButton>
      </div>
    </form>
  );
}

export function MarkRefundedButton({
  reference,
  paystackReference,
}: {
  reference: string;
  paystackReference: string;
}) {
  const [state, formAction, pending] = useActionState(
    markRefunded.bind(null, reference, paystackReference),
    initialFormState,
  );
  return (
    <form onSubmit={submitWithoutReset(formAction)} className="mt-3 flex flex-col gap-2">
      <FormMessage ok={state.ok} message={state.message} stamp={state.savedAt} />
      <SubmitButton pending={pending} pendingText="Saving" tone="secondary">
        Mark as refunded
      </SubmitButton>
    </form>
  );
}
