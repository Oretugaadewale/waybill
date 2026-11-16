import type { TrackingEvent } from "@/lib/shipments/types";
import { STAGE_LABELS, formatEventTime, lagosTimeHint } from "@/lib/shipments/tracking";

/** Every scan on the journey, newest first. */
export function Timeline({ events }: { events: TrackingEvent[] }) {
  return (
    <ol className="relative">
      {events.map((event, i) => {
        const { date, time } = formatEventTime(event.at);
        const lagos = lagosTimeHint(event.at);
        const latest = i === 0;
        return (
          <li
            key={`${event.at}-${i}`}
            className="relative grid grid-cols-[1.25rem_1fr] gap-x-4 pb-6 last:pb-0"
          >
            <span aria-hidden="true" className="relative flex justify-center">
              <span
                className={
                  latest && event.stage === "delivered"
                    ? "z-10 mt-1 h-4 w-4 rounded-full border-2 border-signal bg-signal-soft"
                    : latest
                      ? "z-10 mt-1 h-4 w-4 rounded-full border-2 border-ink bg-tape"
                      : "z-10 mt-1.5 h-3 w-3 rounded-full bg-ink"
                }
              />
              {i < events.length - 1 ? (
                <span className="absolute top-4 bottom-[-1.5rem] w-0.5 bg-rule" />
              ) : null}
            </span>
            <div>
              <p className="font-semibold">{STAGE_LABELS[event.stage]}</p>
              <p className="mt-0.5 text-ink">{event.note}</p>
              <p className="mt-1 text-sm text-ink-soft">
                <time dateTime={event.at}>
                  {date}, {time}
                </time>{" "}
                local time, {event.location}
                {lagos ? <span className="block text-xs">({lagos})</span> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
