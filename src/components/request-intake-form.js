'use client';

import Link from "next/link";
import { useActionState } from "react";
import { createCareRequest } from "@/app/actions";
import { intakeSupportOptions, intakeUrgencyOptions } from "@/lib/role-previews";

const initialState = {
  message: "",
  errors: {},
  values: {
    need: "",
    summary: "",
    responseWindow: "no-rush",
    submittedBy: "",
    contactEmail: "",
    preferredContact: "",
    keepNamePrivate: false,
    markSensitive: true,
    allowContact: true,
  },
  submitted: false,
  trackingCode: "",
};

export function RequestIntakeForm() {
  const [state, formAction, pending] = useActionState(
    createCareRequest,
    initialState
  );

  if (state.submitted) {
    return (
      <div className="rounded-[2rem] border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] p-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-moss">
          Request received
        </p>
        <h2 className="mt-4 text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
          Your care request has been sent.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          {state.message}
        </p>
        {state.trackingCode ? (
          <div className="mt-6 space-y-4">
            <div className="inline-flex rounded-full border border-[rgba(73,106,77,0.18)] bg-paper px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-moss">
              Tracking code: {state.trackingCode}
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              Use this code any time you want to check the status of this request
              without signing in.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/requests/status?code=${encodeURIComponent(state.trackingCode)}`}
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                Track this request
              </Link>
              <Link
                href="/requests/new"
                className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
              >
                Submit another request
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="requestFor" value="self" />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        aria-hidden="true"
      />

      <section className="space-y-5">
        <div>
          <h2 className="text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
            Request care or support
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-8 text-muted">
            This is a private space. Share what you&apos;re comfortable
            sharing. Your pastor and care team are here to help, not judge.
          </p>
        </div>

        <div>
          <p className="text-lg font-semibold text-foreground">
            What kind of support do you need?
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {intakeSupportOptions.map((option) => (
              <SupportOption
                key={option}
                label={option}
                defaultChecked={state.values.need === option}
              />
            ))}
          </div>
          {state.errors.need ? (
            <p className="mt-3 text-sm text-clay">{state.errors.need}</p>
          ) : null}
        </div>

        <Field
          label="Tell us a bit more (optional)"
          name="summary"
          placeholder="Share as much or as little as you're comfortable with. You can always add more later."
          defaultValue={state.values.summary}
          multiline
        />

        <SelectField
          label="How urgent is this?"
          name="responseWindow"
          defaultValue={state.values.responseWindow || "no-rush"}
          options={intakeUrgencyOptions}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Your name (optional)"
          name="submittedBy"
          placeholder="Leave blank if you want a pastor to review first"
          defaultValue={state.values.submittedBy}
          error={state.errors.submittedBy}
        />
        <Field
          label="Email for updates (optional, only if contact is allowed)"
          name="contactEmail"
          type="email"
          placeholder="you@example.com"
          defaultValue={state.values.contactEmail}
          error={state.errors.contactEmail}
        />
        <Field
          label="Best contact method (optional)"
          name="preferredContact"
          placeholder="Phone number, email, or what works best"
          defaultValue={state.values.preferredContact}
          error={state.errors.preferredContact}
        />
      </section>

      <section className="rounded-[1.75rem] bg-canvas p-6">
        <p className="max-w-3xl text-base leading-8 text-muted">
          You control who sees this request. These choices apply to this
          submission only.
        </p>

        <div className="mt-6 space-y-5">
          <ToggleField
            name="keepNamePrivate"
            title="Keep my name private"
            detail="Only your pastor will know this came from you."
            defaultChecked={state.values.keepNamePrivate ?? false}
          />
          <ToggleField
            name="markSensitive"
            title="Mark as sensitive"
            detail="Visible only to pastor until they decide what should be shared more widely."
            defaultChecked={state.values.markSensitive ?? true}
          />
          <ToggleField
            name="allowContact"
            title="I consent to being contacted"
            detail="Allow the care team to reach out by phone, text, or visit when follow-up is needed."
            defaultChecked={state.values.allowContact ?? true}
          />
        </div>
      </section>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-[1.15rem] border border-line bg-paper px-6 py-4 text-lg font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Submitting care request..." : "Submit care request"}
        </button>
        <p aria-live="polite" className="text-center text-sm text-muted">
          {state.message ||
            "Only the people you consent to share with will see this request inside the app."}
        </p>
      </div>
    </form>
  );
}

function SupportOption({ label, defaultChecked }) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name="need"
        value={label}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex min-h-14 items-center justify-center rounded-[1rem] border border-line bg-paper px-4 py-4 text-center text-lg font-medium text-foreground transition peer-checked:border-[rgba(73,106,77,0.24)] peer-checked:bg-[rgba(73,106,77,0.10)] peer-checked:text-moss hover:bg-[#f4ecde]">
        {label}
      </span>
    </label>
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
    "mt-2 w-full rounded-[1.15rem] border border-line bg-paper px-4 py-4 text-base text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss";

  return (
    <label className="block">
      <span className="text-lg font-semibold text-foreground">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={5}
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

function SelectField({ label, name, defaultValue, options }) {
  return (
    <label className="block">
      <span className="text-lg font-semibold text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-[1.15rem] border border-line bg-paper px-4 py-4 text-base text-foreground outline-none transition focus:border-moss"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ name, title, detail, defaultChecked }) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="max-w-2xl">
        <span className="block text-xl font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-base leading-7 text-muted">{detail}</span>
      </span>
      <span className="relative mt-1 inline-flex h-8 w-14 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-[#c8c3bc] transition peer-checked:bg-[#4a87d9]" />
        <span className="absolute left-1 h-6 w-6 rounded-full bg-paper transition peer-checked:left-7" />
      </span>
    </label>
  );
}
