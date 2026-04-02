'use client';

import { useActionState } from "react";
import { verifyLoginChallenge } from "@/app/actions";

const initialState = {
  message: "",
};

export function LoginChallengeForm() {
  const [state, formAction, pending] = useActionState(
    verifyLoginChallenge,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Authenticator code"
        name="code"
        placeholder="123456"
        inputMode="numeric"
        autoComplete="one-time-code"
      />
      <Field
        label="Or backup code"
        name="backupCode"
        placeholder="ABCD-EFGH"
        autoComplete="off"
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
        {pending ? "Verifying..." : "Verify sign-in"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  inputMode = "text",
  autoComplete = "off",
}) {
  return (
    <label className="block">
      <span className="text-base font-medium text-foreground">{label}</span>
      <input
        type="text"
        name={name}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-4 text-base text-foreground outline-none transition focus:border-moss"
      />
    </label>
  );
}
