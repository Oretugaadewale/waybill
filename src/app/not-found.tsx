import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        This page does not exist
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        The link may be broken or the page may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center rounded-sm bg-ink px-6 font-semibold text-paper"
      >
        Go to tracking
      </Link>
    </div>
  );
}
