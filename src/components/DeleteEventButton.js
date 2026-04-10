"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteMinistryEvent } from "@/app/actions";

export function DeleteEventButton({ eventId }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this event?")) return;
    startTransition(async () => {
      await deleteMinistryEvent(eventId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-[11px] font-medium text-[var(--error)] hover:underline disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
