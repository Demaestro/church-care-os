'use client';

import Link from "next/link";
import { useActionState } from "react";
import { completePasswordReset } from "@/app/actions";

const initialState = {
  message: "",
  errors: {},
  submitted: false,
};

export function PasswordResetForm({ formCopy, pageCopy, token }) {
  const [state, formAction, pending] = useActionState(
    completePasswordReset,
    initialState
  );
  const resetCopy = formCopy;

  if (state.submitted) {
    return (
      <div className="rounded-[1.8rem] border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] p-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-moss">
          {resetCopy.successKicker}
        </p>
        <h2 className="mt-4 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
          {resetCopy.successTitle}
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">{resetCopy.successBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f]"
          >
            {pageCopy.backToSignIn}
          </Link>
          <Link
            href="/account-recovery"
            className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
          >
            {pageCopy.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <Field
        label={resetCopy.passwordLabel}
        name="password"
        type="password"
        placeholder={resetCopy.passwordPlaceholder}
        error={state.errors.password}
      />
      <Field
        label={resetCopy.confirmPasswordLabel}
        name="confirmPassword"
        type="password"
        placeholder={resetCopy.confirmPasswordPlaceholder}
        error={state.errors.confirmPassword}
      />

      {state.message ? (
        <p className="rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-4 py-3 text-sm text-clay">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-[1.15rem] bg-foreground px-6 py-4 text-lg font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? resetCopy.submitting : resetCopy.submit}
      </button>
    </form>
  );
}

function Field({ label, name, placeholder, error, type }) {
  return (
    <label className="block">
      <span className="text-base font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-4 text-base text-foreground outline-none transition focus:border-moss"
      />
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
    </label>
  );
}
