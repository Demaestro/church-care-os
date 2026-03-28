'use client';

import { useActionState } from "react";
import { requestAccountRecovery } from "@/app/actions";

const initialState = {
  message: "",
  errors: {},
  values: {
    requesterName: "",
    email: "",
    note: "",
  },
  submitted: false,
};

export function AccountRecoveryForm() {
  const [state, formAction, pending] = useActionState(
    requestAccountRecovery,
    initialState
  );

  if (state.submitted) {
    return (
      <div className="rounded-[1.8rem] border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] p-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-moss">
          Recovery request logged
        </p>
        <h2 className="mt-4 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
          A care admin will review this manually.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        aria-hidden="true"
      />

      <Field
        label="Your name (optional)"
        name="requesterName"
        placeholder="Name of the person requesting help"
        defaultValue={state.values.requesterName}
      />
      <Field
        label="Account email"
        name="email"
        type="email"
        placeholder="you@example.com"
        defaultValue={state.values.email}
        error={state.errors.email}
      />
      <Field
        label="What would help us verify this request? (optional)"
        name="note"
        placeholder="For example: your ministry role, last login, or safest way to reach you"
        defaultValue={state.values.note}
        multiline
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
        {pending ? "Sending request..." : "Request account recovery"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  error,
  multiline = false,
  type = "text",
}) {
  const classes =
    "mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss";

  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={4}
          placeholder={placeholder}
          className={`${classes} resize-y`}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={classes}
        />
      )}
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
    </label>
  );
}
