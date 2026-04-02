'use client';

import { useActionState } from "react";
import { reviewVolunteerApplicationAction } from "@/app/actions";

const initialState = { success: false, message: "" };

export function ReviewPanel({ applicationId, applicantName }) {
  const [state, formAction, pending] = useActionState(reviewVolunteerApplicationAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-muted">
        {state.status === "approved"
          ? `✓ Approved — ${applicantName} is now a volunteer.`
          : `✗ Application declined.`}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {state.message && (
        <p className="w-full text-sm text-clay">{state.message}</p>
      )}
      <form action={formAction} className="contents">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="decision" value="approve" />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-[0.9rem] border border-[rgba(73,106,77,0.25)] bg-[rgba(73,106,77,0.08)] px-5 py-2.5 text-sm font-semibold text-moss transition hover:bg-[rgba(73,106,77,0.15)] disabled:opacity-60"
        >
          {pending ? "Processing…" : "Approve"}
        </button>
      </form>
      <form action={formAction} className="contents">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="decision" value="reject" />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-[0.9rem] border border-line bg-canvas px-5 py-2.5 text-sm font-semibold text-muted transition hover:border-[rgba(220,38,38,0.3)] hover:bg-[rgba(220,38,38,0.04)] hover:text-clay disabled:opacity-60"
        >
          {pending ? "Processing…" : "Decline"}
        </button>
      </form>
    </div>
  );
}
