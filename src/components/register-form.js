'use client';

import Image from "next/image";
import { useState, useTransition } from "react";
import { selfRegister } from "@/app/actions";

const STEPS = ["Church", "Details", "Done"];

export function RegisterForm({
  orgs = [],
  preselectedOrgId = "",
}) {
  const [step, setStep] = useState(preselectedOrgId ? 2 : 1);
  const [orgId, setOrgId] = useState(preselectedOrgId);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verificationPath, setVerificationPath] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedOrg = orgs.find((org) => org.id === orgId) || null;

  function handleChurchStepSubmit(event) {
    event.preventDefault();

    if (!orgId) {
      setError("Please choose your church first.");
      return;
    }

    setError("");
    setStep(2);
  }

  function handleDetailsSubmit(event) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.target);
    formData.set("organizationId", orgId);

    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (!email) {
      setError("Email address is required.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await selfRegister(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        result?.message ||
          "Check your email for a verification link before you sign in."
      );
      setVerificationPath(result?.verificationPath || "");
      setStep(3);
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const done = step > stepNumber;
          const active = step === stepNumber;

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-moss text-white"
                    : active
                      ? "border-2 border-moss text-moss"
                      : "border border-line text-muted"
                }`}
              >
                {done ? "OK" : stepNumber}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-foreground" : "text-muted"
                }`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && <div className="h-px w-6 bg-line" />}
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <form onSubmit={handleChurchStepSubmit} className="space-y-5">
          <div>
            <p className="mb-5 text-sm font-semibold text-foreground">
              Which church should this member account belong to?
            </p>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Church</span>
              <select
                value={orgId}
                onChange={(event) => setOrgId(event.target.value)}
                className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
              >
                <option value="">Select your church...</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedOrg ? (
              <div className="mt-4 rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] p-4">
                <div className="flex items-center gap-3">
                  {selectedOrg.logoHref ? (
                    <Image
                      src={selectedOrg.logoHref}
                      alt={`${selectedOrg.name} logo`}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-2xl border border-line bg-paper object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper text-xs font-bold uppercase text-moss">
                      {(selectedOrg.shortName || selectedOrg.name).slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedOrg.name}
                    </p>
                    {selectedOrg.pastorName ? (
                      <p className="text-xs text-muted">
                        Pastor: {selectedOrg.pastorName}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-[0.9rem] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Continue
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          {selectedOrg ? (
            <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3">
              {selectedOrg.logoHref ? (
                <Image
                  src={selectedOrg.logoHref}
                  alt={`${selectedOrg.name} logo`}
                  width={44}
                  height={44}
                  unoptimized
                  className="h-11 w-11 rounded-2xl border border-line bg-paper object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper text-xs font-bold uppercase text-moss">
                  {(selectedOrg.shortName || selectedOrg.name).slice(0, 2)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                  Member account
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedOrg.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-auto text-xs text-muted underline"
              >
                Change
              </button>
            </div>
          ) : null}

          <p className="text-sm font-semibold text-foreground">Your details</p>

          <FormField
            label="Full name"
            name="name"
            placeholder="Your full name"
            autoComplete="name"
            required
          />
          <FormField
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          <FormField
            label="Phone number"
            name="phone"
            type="tel"
            placeholder="+2348012345678"
            autoComplete="tel"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Birthday"
              name="birthday"
              type="date"
              autoComplete="bday"
            />
            <SelectField
              label="Gender"
              name="gender"
              defaultValue="unspecified"
              options={[
                { value: "unspecified", label: "Prefer not to say" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </div>

          <SelectField
            label="How should the church describe your connection right now?"
            name="memberType"
            defaultValue="member"
            options={[
              { value: "member", label: "Member" },
              { value: "new_member", label: "New member" },
              { value: "visitor", label: "Visitor" },
            ]}
          />

          <FormField
            label="Password"
            name="password"
            type="password"
            placeholder="Choose a strong password"
            autoComplete="new-password"
            required
          />
          <FormField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />

          {error ? (
            <p className="rounded-[0.9rem] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating account..." : "Create member account"}
          </button>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft-fill)] text-2xl text-moss">
            OK
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">Check your email</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{successMessage}</p>
          </div>
          {verificationPath ? (
            <a
              href={verificationPath}
              className="inline-flex items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-5 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
            >
              Verify email now
            </a>
          ) : null}
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-[1rem] border border-line bg-paper px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-canvas"
          >
            Continue to sign in
          </a>
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  name,
  placeholder,
  type = "text",
  autoComplete,
  autoCapitalize,
  spellCheck,
  required = false,
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        required={required}
        className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
      />
    </label>
  );
}

function SelectField({ label, name, defaultValue, options = [] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
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
