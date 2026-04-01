'use client';

import { useActionState } from "react";
import { login } from "@/app/actions";

const initialState = {
  message: "",
  errors: {},
};

export function LoginForm({ copy }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const loginCopy = copy;

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label={loginCopy.emailLabel}
        name="email"
        type="email"
        placeholder={loginCopy.emailPlaceholder}
        error={state.errors?.email}
      />
      <Field
        label={loginCopy.passwordLabel}
        name="password"
        type="password"
        placeholder={loginCopy.passwordPlaceholder}
        error={state.errors?.password}
      />

      {state.message ? (
        <p className="rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-4 py-3 text-sm text-clay">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? loginCopy.signingIn : loginCopy.signIn}
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
