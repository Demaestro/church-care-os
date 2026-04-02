'use client';

import Link from "next/link";
import { useActionState } from "react";
import { createCareRequest } from "@/app/actions";
import { intakeSupportOptions, intakeUrgencyOptions } from "@/lib/role-previews";
import { translateSupportNeed, translateUrgencyOption } from "@/lib/i18n";

const initialState = {
  message: "",
  errors: {},
  values: {
    need: "",
    summary: "",
    responseWindow: "no-rush",
    submittedBy: "",
    contactEmail: "",
    contactPhone: "",
    preferredContact: "",
    keepNamePrivate: false,
    markSensitive: true,
    allowContact: true,
  },
  submitted: false,
  trackingCode: "",
};

export function RequestIntakeForm({ language = "en", copy, currentUser = null }) {
  const [state, formAction, pending] = useActionState(
    createCareRequest,
    initialState
  );
  const intakeCopy = copy;

  if (state.submitted) {
    return (
      <div className="rounded-[2rem] border border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] p-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-moss">
          {intakeCopy.successKicker}
        </p>
        <h2 className="mt-4 text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
          {intakeCopy.successTitle}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          {state.message}
        </p>
        {state.trackingCode ? (
          <div className="mt-6 space-y-4">
            <div className="inline-flex rounded-full border border-[rgba(73,106,77,0.18)] bg-paper px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-moss">
              {intakeCopy.trackingCodeLabel}: {state.trackingCode}
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              {intakeCopy.trackingCodeHelp}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/requests/status?code=${encodeURIComponent(state.trackingCode)}`}
                className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde]"
              >
                {intakeCopy.trackThisRequest}
              </Link>
              <Link
                href="/requests/new"
                className="inline-flex items-center justify-center rounded-[1rem] border border-[rgba(34,28,22,0.08)] bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-foreground"
              >
                {intakeCopy.submitAnother}
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {intakeCopy.steps.support}
          </p>
          <h2 className="text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)] sm:text-3xl">
            {intakeCopy.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
            {intakeCopy.intro}
          </p>
        </div>

        <div>
          <p className="text-lg font-semibold text-foreground">
            {intakeCopy.supportQuestion}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {intakeSupportOptions.map((option) => (
              <SupportOption
                key={option}
                label={translateSupportNeed(option, language)}
                value={option}
                defaultChecked={state.values.need === option}
              />
            ))}
          </div>
          {state.errors.need ? (
            <p className="mt-3 text-sm text-clay">{state.errors.need}</p>
          ) : null}
        </div>

        <Field
          label={intakeCopy.summaryLabel}
          name="summary"
          placeholder={intakeCopy.summaryPlaceholder}
          defaultValue={state.values.summary}
          multiline
        />

        <SelectField
          label={intakeCopy.urgencyLabel}
          name="responseWindow"
          defaultValue={state.values.responseWindow || "no-rush"}
          options={intakeUrgencyOptions.map((option) => ({
            ...option,
            label: translateUrgencyOption(option.value, language, option.label),
          }))}
        />
      </section>

      {currentUser ? (
        <SignedInContactSection
          user={currentUser}
          defaultPreferred={state.values.preferredContact}
          intakeCopy={intakeCopy}
        />
      ) : (
        <GuestContactSection
          state={state}
          intakeCopy={intakeCopy}
          language={language}
        />
      )}

      <section className="rounded-[1.75rem] bg-canvas p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          {intakeCopy.steps.privacy}
        </p>
        <p className="max-w-3xl text-base leading-8 text-muted">
          {intakeCopy.privacyIntro}
        </p>

        <div className="mt-6 space-y-5">
          <ToggleField
            name="keepNamePrivate"
            title={intakeCopy.keepPrivateTitle}
            detail={intakeCopy.keepPrivateDetail}
            defaultChecked={state.values.keepNamePrivate ?? false}
          />
          <ToggleField
            name="markSensitive"
            title={intakeCopy.sensitiveTitle}
            detail={intakeCopy.sensitiveDetail}
            defaultChecked={state.values.markSensitive ?? true}
          />
          <ToggleField
            name="allowContact"
            title={intakeCopy.allowContactTitle}
            detail={intakeCopy.allowContactDetail}
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
          {pending ? intakeCopy.submitting : intakeCopy.submit}
        </button>
        <p aria-live="polite" className="text-center text-sm text-muted">
          {state.message || intakeCopy.footerHelp}
        </p>
      </div>
    </form>
  );
}

// Signed-in: just ask how to reach them
function SignedInContactSection({ user, defaultPreferred, intakeCopy }) {
  const hasPhone = Boolean(user.phone);
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-line bg-canvas px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--soft-fill)] text-sm font-bold text-moss">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{user.name}</p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>
      </div>

      {/* hidden fields so the action has the identity */}
      <input type="hidden" name="submittedBy" value={user.name} />
      <input type="hidden" name="contactEmail" value={user.email} />
      {hasPhone && <input type="hidden" name="contactPhone" value={user.phone} />}

      <div>
        <p className="text-lg font-semibold text-foreground">How should we reach you?</p>
        <p className="mt-1 text-sm text-muted">Choose your preferred contact method and we will use that when following up.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ContactOption
            value="email"
            label="Email"
            detail={user.email}
            name="preferredContact"
            defaultChecked={!defaultPreferred || defaultPreferred === "email"}
          />
          {hasPhone && (
            <ContactOption
              value="phone"
              label="Phone call"
              detail={user.phone}
              name="preferredContact"
              defaultChecked={defaultPreferred === "phone"}
            />
          )}
          <ContactOption
            value="in-person"
            label="In person"
            detail="A pastor will find a time to connect with you"
            name="preferredContact"
            defaultChecked={defaultPreferred === "in-person"}
          />
        </div>
      </div>
    </section>
  );
}

// Guest: full contact fields (unauthenticated)
function GuestContactSection({ state, intakeCopy }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          {intakeCopy.steps.contact}
        </p>
      </div>
      <Field
        label={intakeCopy.nameLabel}
        name="submittedBy"
        placeholder={intakeCopy.namePlaceholder}
        defaultValue={state.values.submittedBy}
        error={state.errors.submittedBy}
      />
      <Field
        label={intakeCopy.emailLabel}
        name="contactEmail"
        type="email"
        placeholder={intakeCopy.emailPlaceholder}
        defaultValue={state.values.contactEmail}
        error={state.errors.contactEmail}
      />
      <Field
        label={intakeCopy.phoneLabel}
        name="contactPhone"
        type="tel"
        placeholder={intakeCopy.phonePlaceholder}
        defaultValue={state.values.contactPhone}
        error={state.errors.contactPhone}
      />
      <Field
        label={intakeCopy.contactLabel}
        name="preferredContact"
        placeholder={intakeCopy.contactPlaceholder}
        defaultValue={state.values.preferredContact}
        error={state.errors.preferredContact}
      />
    </section>
  );
}

function ContactOption({ value, label, detail, name, defaultChecked }) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex min-h-16 flex-col justify-center rounded-[1rem] border border-line bg-paper px-4 py-3 transition peer-checked:border-[rgba(73,106,77,0.24)] peer-checked:bg-[rgba(73,106,77,0.08)] hover:bg-canvas">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 text-xs text-muted">{detail}</span>
      </span>
    </label>
  );
}

function SupportOption({ label, value, defaultChecked }) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name="need"
        value={value}
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
