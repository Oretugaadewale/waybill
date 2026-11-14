import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "../actions";

/** Page frame for every signed-in admin page. */
export function AdminShell({
  title,
  back,
  email,
  actions,
  children,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  email?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      {email ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4 text-sm">
          <nav aria-label="Admin">
            <ul className="flex gap-5 font-semibold">
              <li>
                <Link href="/admin" className="underline-offset-4 hover:underline">
                  Shipments
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/bookings"
                  className="underline-offset-4 hover:underline"
                >
                  Bookings
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-ink-soft">
              Signed in as <span className="font-medium text-ink">{email}</span>
            </p>
            <SignOutButton />
          </div>
        </div>
      ) : null}
      {back ? (
        <Link
          href={back.href}
          className="text-sm font-medium underline underline-offset-4"
        >
          {back.label}
        </Link>
      ) : null}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {actions}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="min-h-11 rounded-sm border-2 border-ink px-4 font-semibold hover:bg-concrete"
      >
        Sign out
      </button>
    </form>
  );
}

export function NotAdmin({ email }: { email: string }) {
  return (
    <AdminShell title="Admin">
      <h2 className="text-xl font-bold">This account is not an admin</h2>
      <p className="mt-2 max-w-prose text-ink-soft">
        You are signed in as {email}, but this account has not been given admin access.
        Ask the project owner to add it.
      </p>
      <div className="mt-4">
        <SignOutButton />
      </div>
    </AdminShell>
  );
}

export function NotConnected() {
  return (
    <AdminShell title="Admin">
      <p>The database is not connected, so the admin area is unavailable.</p>
    </AdminShell>
  );
}

export function AdminLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14" aria-busy="true">
      <p className="text-ink-soft">{label}</p>
    </div>
  );
}

export const primaryLinkClass =
  "inline-flex min-h-12 items-center rounded-sm bg-ink px-6 font-semibold text-paper hover:bg-ink/90";
