'use client';

import { useActionState } from "react";
import { login } from "@/app/actions";

const initialState = {
  message: "",
  errors: {},
  values: {
    email: "",
  },
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
        defaultValue={state.values?.email || ""}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />
      <Field
        label={loginCopy.passwordLabel}
        name="password"
        type="password"
        placeholder={loginCopy.passwordPlaceholder}
        error={state.errors?.password}
        autoComplete="current-password"
        spellCheck={false}
      />

      {state.message ? (
        <p className="rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-4 py-3 text-sm text-clay">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[#FF6600] px-6 py-4 text-sm font-bold tracking-wide text-white shadow-sm transition hover:bg-[#e55c00] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? loginCopy.signingIn : loginCopy.signIn}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  error,
  type,
  defaultValue = "",
  autoComplete,
  autoCapitalize,
  spellCheck,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete || (type === "password" ? "current-password" : "username")}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-[#020266] focus:ring-2 focus:ring-[#020266]/10"
      />
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
    </label>
  );
}
