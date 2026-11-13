"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

const initialState: SignInState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div>
        <label htmlFor="email" className="block font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="mt-2 min-h-12 w-full rounded-sm border-2 border-ink bg-paper px-4 text-base"
        />
      </div>
      <div>
        <label htmlFor="password" className="block font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="mt-2 min-h-12 w-full rounded-sm border-2 border-ink bg-paper px-4 text-base"
        />
      </div>
      {state.error ? (
        <p id="login-error" role="alert" className="text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-sm bg-ink px-6 font-semibold text-paper hover:bg-ink/90 disabled:opacity-70"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
