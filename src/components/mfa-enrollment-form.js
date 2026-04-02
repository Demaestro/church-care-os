'use client';

import { useActionState } from "react";
import { completeMfaEnrollment } from "@/app/actions";

const initialState = {
  message: "",
};

export function MfaEnrollmentForm() {
  const [state, formAction, pending] = useActionState(
    completeMfaEnrollment,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-base font-medium text-foreground">
          Confirm the current 6-digit code
        </span>
        <input
          type="text"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-4 text-base text-foreground outline-none transition focus:border-moss"
        />
      </label>

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
        {pending ? "Finishing setup..." : "Finish MFA setup"}
      </button>
    </form>
  );
}
