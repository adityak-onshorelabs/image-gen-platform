"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction, type LoginState } from "./actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form
      action={action}
      className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl"
    >
      <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
      <p className="mb-6 text-sm text-neutral-400">Image Gen Platform — admin</p>

      <input type="hidden" name="next" value={next} />

      <label className="mb-1 block text-sm text-neutral-300">Email</label>
      <input
        name="email"
        type="email"
        autoComplete="username"
        required
        className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 outline-none focus:border-sky-500"
      />

      <label className="mb-1 block text-sm text-neutral-300">Password</label>
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 outline-none focus:border-sky-500"
      />

      {state.error && (
        <p className="mb-4 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-sky-500 px-4 py-2 font-medium text-neutral-950 transition hover:bg-sky-400 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
