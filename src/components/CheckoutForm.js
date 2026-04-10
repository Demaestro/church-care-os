"use client";

import { useActionState } from "react";
import { logUtility } from "@/app/actions";

const UTILITY_TYPES = [
  { value: "generator",   label: "Generator hours" },
  { value: "diesel",      label: "Diesel / fuel" },
  { value: "water",       label: "Water" },
  { value: "electricity", label: "Electricity (kWh)" },
  { value: "gas",         label: "Gas" },
  { value: "other",       label: "Other utility" },
];

const UNITS = {
  generator:   "hours",
  diesel:      "litres",
  water:       "litres",
  electricity: "kWh",
  gas:         "kg",
  other:       "units",
};

export default function CheckoutForm({ organizationId, type = "utility" }) {
  const [state, action, pending] = useActionState(logUtility, null);

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />

      {state?.success === false && (
        <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {state.message || "Something went wrong."}
        </p>
      )}
      {state?.success === true && (
        <p className="sm:col-span-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Utility log recorded.
        </p>
      )}

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Utility type *
        </label>
        <select
          name="utilityType"
          required
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        >
          {UTILITY_TYPES.map(u => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Amount *
        </label>
        <input
          name="value"
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="0"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Cost (₦)
        </label>
        <input
          name="cost"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Event / occasion
        </label>
        <input
          name="eventName"
          placeholder="e.g. Sunday Service, Convention"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Date *
        </label>
        <input
          name="loggedAt"
          type="date"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Note
        </label>
        <input
          name="note"
          placeholder="Optional note"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--gold-pure) 0%, var(--gold-text) 100%)",
            boxShadow: "0 2px 8px rgba(212,175,55,0.25)",
          }}
        >
          {pending ? "Saving…" : "Log entry"}
        </button>
      </div>
    </form>
  );
}
