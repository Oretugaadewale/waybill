"use client";

import { useEffect, useRef } from "react";

interface FormMessageProps {
  ok: boolean | null;
  message: string | null;
  /** Changes with every result, so a repeated message still shows and fades again. */
  stamp?: number | string;
}

/**
 * The message above a form. Errors take focus and scroll into view, so they
 * are seen even when the button was far down the page. Success messages
 * fade away after a few seconds, so old news does not sit next to new news.
 */
export function FormMessage({ ok, message, stamp }: FormMessageProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message && ok === false) {
      ref.current?.focus({ preventScroll: true });
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [message, ok, stamp]);

  if (!message) return null;
  return (
    <p
      key={`${stamp ?? ""}-${message}`}
      ref={ref}
      tabIndex={-1}
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "flash-out rounded-sm bg-signal-soft px-4 py-3 font-medium text-signal"
          : "rounded-sm border-2 border-red-700 bg-paper px-4 py-3 font-medium text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      }
    >
      {message}
    </p>
  );
}
