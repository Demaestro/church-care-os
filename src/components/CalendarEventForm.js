"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMinistryEvent } from "@/app/actions";

export function CalendarEventForm({ organizationId, branchId, editEvent, eventTypeLabels }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveMinistryEvent(data);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/calendar");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {editEvent && <input type="hidden" name="id" value={editEvent.id} />}
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="branchId" value={branchId} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
            Event title *
          </label>
          <input
            name="title"
            required
            defaultValue={editEvent?.title || ""}
            placeholder="e.g. Annual Church Convention 2025"
            className="w-full rounded-[0.85rem] border border-line bg-canvas px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
            Date *
          </label>
          <input
            name="eventDate"
            type="date"
            required
            min={today}
            defaultValue={editEvent?.event_date || ""}
            className="w-full rounded-[0.85rem] border border-line bg-canvas px-4 py-2.5 text-sm text-foreground focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
            Time (optional)
          </label>
          <input
            name="eventTime"
            type="time"
            defaultValue={editEvent?.event_time || ""}
            className="w-full rounded-[0.85rem] border border-line bg-canvas px-4 py-2.5 text-sm text-foreground focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
            Event type *
          </label>
          <select
            name="eventType"
            defaultValue={editEvent?.event_type || "service"}
            className="w-full rounded-[0.85rem] border border-line bg-canvas px-4 py-2.5 text-sm text-foreground focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
          >
            {Object.entries(eventTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
            Location (optional)
          </label>
          <input
            name="location"
            defaultValue={editEvent?.location || ""}
            placeholder="e.g. Main Auditorium, Lagos"
            className="w-full rounded-[0.85rem] border border-line bg-canvas px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
            Description (optional)
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={editEvent?.description || ""}
            placeholder="Brief description of the event programme..."
            className="w-full resize-none rounded-[0.85rem] border border-line bg-canvas px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-[0.7rem] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.05)] px-4 py-2.5 text-sm text-[var(--error)]">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[var(--charcoal)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gold-text)] disabled:opacity-50"
        >
          {isPending ? "Saving…" : editEvent ? "Save changes" : "Add event"}
        </button>
        <a
          href="/calendar"
          className="rounded-full border border-line bg-canvas px-5 py-2.5 text-sm font-semibold text-muted transition hover:text-foreground"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
