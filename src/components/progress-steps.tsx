import type { ProgressStep } from "@/lib/shipments/tracking";

/**
 * The six stages of the journey. This is a real sequence,
 * so it is an ordered list with numbered steps.
 */
export function ProgressSteps({ steps }: { steps: ProgressStep[] }) {
  const done = steps.filter((s) => s.state === "done").length;
  const currentIndex = steps.findIndex((s) => s.state === "current");
  const reached = currentIndex === -1 ? done : currentIndex + 1;
  const complete = done === steps.length;

  return (
    <div className="@container">
      <div
        role="progressbar"
        aria-label="Journey progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={reached}
        aria-valuetext={`Stage ${reached} of ${steps.length}`}
        className="h-3 w-full overflow-hidden rounded-sm bg-concrete"
      >
        <div
          className={complete ? "tape-in h-full bg-signal" : "tape-in h-full bg-tape"}
          style={{ width: `${(reached / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-3 @2xl:grid-cols-6">
        {steps.map((step, i) => (
          <li
            key={step.stage}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex items-start gap-2"
          >
            <span
              aria-hidden="true"
              className={
                step.state === "upcoming"
                  ? "grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule font-mono text-xs text-ink-soft"
                  : step.state === "current"
                    ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tape font-mono text-xs font-semibold text-ink ring-2 ring-ink"
                    : "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs text-paper"
              }
            >
              {i + 1}
            </span>
            <span
              className={
                step.state === "upcoming"
                  ? "text-sm leading-6 text-ink-soft"
                  : step.state === "current"
                    ? "text-sm font-semibold leading-6"
                    : "text-sm leading-6"
              }
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done"
                  ? " (completed)"
                  : step.state === "current"
                    ? " (current)"
                    : " (not yet)"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
