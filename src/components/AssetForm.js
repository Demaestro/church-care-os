"use client";

import { useActionState, useId, useRef } from "react";
import { saveAsset, logUtility } from "@/app/actions";

const CATEGORIES = [
  { value: "audio",      label: "Audio / Sound" },
  { value: "projection", label: "Projection / Visual" },
  { value: "instrument", label: "Instruments" },
  { value: "furniture",  label: "Furniture / Décor" },
  { value: "vehicle",    label: "Vehicles" },
  { value: "tech",       label: "Tech / IT" },
  { value: "generator",  label: "Generator / Power" },
  { value: "equipment",  label: "General Equipment" },
];

export default function AssetForm({ organizationId, branchId }) {
  const [state, action, pending] = useActionState(saveAsset, null);
  // Stable idempotency key per form mount — survives retries, resets on success
  const idempotencyKey = useRef(crypto.randomUUID());
  if (state?.success === true) idempotencyKey.current = crypto.randomUUID();

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey.current} />

      {state?.success === false && (
        <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {state.message || "Something went wrong."}
        </p>
      )}
      {state?.success === true && (
        <p className="sm:col-span-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Asset registered successfully.
        </p>
      )}

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Asset name *
        </label>
        <input
          name="name"
          required
          placeholder="e.g. Yamaha MG10 Mixer"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Category *
        </label>
        <select
          name="category"
          required
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Serial number
        </label>
        <input
          name="serialNumber"
          placeholder="Optional"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Location
        </label>
        <input
          name="location"
          placeholder="e.g. Sound booth"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Acquisition date
        </label>
        <input
          name="acquisitionDate"
          type="date"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Cost (₦)
        </label>
        <input
          name="acquisitionCost"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">
          Description / Notes
        </label>
        <textarea
          name="description"
          rows={2}
          placeholder="Additional details about this asset"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--base)] px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--gold-pure)]/30 resize-none"
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
          {pending ? "Saving…" : "Register asset"}
        </button>
      </div>
    </form>
  );
}
