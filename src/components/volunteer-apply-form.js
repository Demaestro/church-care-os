'use client';

import { useActionState } from "react";
import { applyForVolunteer } from "@/app/actions";

const MINISTRY_AREAS = [
  { value: "care-visits", label: "Care visits", detail: "Visiting members who are ill, grieving, or isolated" },
  { value: "prayer", label: "Prayer team", detail: "Intercession and prayer support for care requests" },
  { value: "practical-support", label: "Practical support", detail: "Meals, transport, errands, home help" },
  { value: "counselling-support", label: "Counselling support", detail: "Alongside pastoral counselling sessions" },
  { value: "new-members", label: "New member welcome", detail: "Welcoming and orienting new members" },
  { value: "youth-care", label: "Youth & young adults", detail: "Care and mentoring for young people" },
  { value: "admin-support", label: "Admin & coordination", detail: "Behind-the-scenes scheduling and communication" },
  { value: "emergency-response", label: "Emergency response", detail: "Available for urgent or crisis situations" },
];

const AVAILABILITY_OPTIONS = [
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekday-evenings", label: "Weekday evenings" },
  { value: "flexible", label: "Flexible / as needed" },
  { value: "sunday-only", label: "Sundays only" },
];

const initialState = { message: "", submitted: false };

export function VolunteerApplyForm({ userName, userEmail }) {
  const [state, formAction, pending] = useActionState(applyForVolunteer, initialState);

  if (state.submitted) {
    return (
      <div className="rounded-[1.5rem] border border-[rgba(73,106,77,0.2)] bg-[rgba(73,106,77,0.06)] px-6 py-10 text-center">
        <p className="text-3xl">🙌</p>
        <p className="mt-4 text-xl font-semibold text-foreground">Application submitted!</p>
        <p className="mt-3 text-sm leading-7 text-muted max-w-sm mx-auto">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Identity chip */}
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-line bg-canvas px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--soft-fill)] text-sm font-bold text-moss">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{userName}</p>
          <p className="text-xs text-muted">{userEmail}</p>
        </div>
      </div>

      {/* Ministry areas */}
      <div>
        <p className="text-base font-semibold text-foreground">
          Where would you like to serve?
        </p>
        <p className="mt-1 text-sm text-muted">Select one or more areas that match your heart.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MINISTRY_AREAS.map((area) => (
            <AreaOption key={area.value} area={area} />
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-base font-semibold text-foreground">
          When are you generally available?
        </label>
        <select
          name="availability"
          className="mt-3 w-full rounded-[1.1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-moss"
        >
          <option value="">Select availability…</option>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div>
        <label className="block text-base font-semibold text-foreground">
          Anything else you&apos;d like your pastor to know?{" "}
          <span className="text-sm font-normal text-muted">(optional)</span>
        </label>
        <textarea
          name="note"
          rows={4}
          placeholder="Share your motivations, skills, experience, or any questions…"
          className="mt-3 w-full rounded-[1.1rem] border border-line bg-paper px-4 py-4 text-sm text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss resize-none"
        />
      </div>

      {state.message && !state.submitted && (
        <p className="rounded-[1rem] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-clay">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-[1.1rem] border border-line bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

function AreaOption({ area }) {
  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        name="areas"
        value={area.value}
        className="peer sr-only"
      />
      <span className="flex flex-col rounded-[1rem] border border-line bg-paper p-4 transition peer-checked:border-[rgba(73,106,77,0.3)] peer-checked:bg-[rgba(73,106,77,0.08)] hover:bg-canvas">
        <span className="text-sm font-semibold text-foreground">{area.label}</span>
        <span className="mt-1 text-xs leading-5 text-muted">{area.detail}</span>
      </span>
    </label>
  );
}
