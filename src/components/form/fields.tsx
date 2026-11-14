import type { ReactNode } from "react";

export const inputClass =
  "mt-2 min-h-12 w-full rounded-sm border-2 border-ink bg-paper px-4 text-base aria-invalid:border-red-700";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
  className?: string;
}

/** Label, input, hint and error, wired together for screen readers. */
export function Field({ id, label, error, hint, children, className }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({
  ok,
  message,
}: {
  ok: boolean | null;
  message: string | null;
}) {
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "rounded-sm bg-signal-soft px-4 py-3 font-medium text-signal"
          : "rounded-sm border-2 border-red-700 bg-paper px-4 py-3 font-medium text-red-700"
      }
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingText,
  tone = "primary",
}: {
  pending: boolean;
  children: ReactNode;
  pendingText: string;
  tone?: "primary" | "danger" | "secondary";
}) {
  const tones = {
    primary: "bg-ink text-paper hover:bg-ink/90",
    danger: "bg-red-700 text-paper hover:bg-red-800",
    secondary: "border-2 border-ink bg-paper text-ink hover:bg-concrete",
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-12 rounded-sm px-6 font-semibold disabled:opacity-70 ${tones[tone]}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
