"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form/fields";
import { startPayment, type PayState } from "./actions";

export function PayButton({ reference, label }: { reference: string; label: string }) {
  const [state, formAction, pending] = useActionState(
    startPayment.bind(null, reference),
    {
      error: null,
    } as PayState,
  );
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage ok={false} message={state.error} />
      <SubmitButton pending={pending} pendingText="Opening Paystack">
        {label}
      </SubmitButton>
    </form>
  );
}
