"use client";

import Link from "next/link";
import { useActionState } from "react";
import { toggleDiscipleshipMilestone } from "@/app/actions";

/**
 * Individual member discipleship card — shows their milestone progress visually,
 * like a fitness-app achievement tracker.
 */
export default function DiscipleshipMilestoneCard({
  record,
  stage,
  milestones,
  progress,
  overall,
  isStuck,
}) {
  const [state, action, pending] = useActionState(toggleDiscipleshipMilestone, null);

  // Milestones relevant to this member's stage and below
  const stageOrder = ["new_believer", "foundation", "growing", "serving", "mentoring"];
  const currentStageIdx = stageOrder.indexOf(record.stage || "new_believer");
  const visibleMilestones = milestones.filter((m) => {
    const mStageIdx = stageOrder.indexOf(m.stage);
    return mStageIdx <= currentStageIdx + 1; // show current + next
  });

  return (
    <div
      className={`relative rounded-2xl border bg-paper p-4 shadow-[var(--shadow-sm)] transition-all hover:shadow-md ${
        isStuck
          ? "border-amber-200 ring-1 ring-amber-200/60"
          : "border-[var(--line)]"
      }`}
    >
      {/* Stuck badge */}
      {isStuck && (
        <span className="absolute -top-2 right-3 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-200">
          Needs attention
        </span>
      )}

      {/* Member header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/households/${record.householdSlug}`}
            className="text-sm font-semibold text-foreground hover:text-[var(--gold-text)] transition-colors truncate block"
          >
            {record.householdName}
          </Link>
          {record.assignedLeaderName && (
            <p className="text-[10px] text-muted truncate mt-0.5">
              Under {record.assignedLeaderName}
            </p>
          )}
        </div>
        {/* Overall % badge */}
        <div className="shrink-0 ml-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              background: overall >= 80
                ? "linear-gradient(135deg, var(--gold-pure), var(--gold-text))"
                : overall >= 40
                ? "rgba(212,175,55,0.12)"
                : "rgba(18,18,18,0.05)",
              color: overall >= 80 ? "#fff" : "var(--gold-text)",
              border: "1.5px solid rgba(212,175,55,0.2)",
            }}
          >
            {overall}%
          </div>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${stage.badge} rounded px-1.5 py-0.5`}>
            {stage.label}
          </span>
          <span className="text-[10px] text-muted">{progress}% this stage</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[rgba(18,18,18,0.06)]">
          <div
            className={`h-1.5 rounded-full bg-gradient-to-r ${stage.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Milestone checkboxes */}
      <form action={action} className="space-y-1.5">
        <input type="hidden" name="recordId" value={record.id} />
        <input type="hidden" name="householdSlug" value={record.householdSlug} />

        {visibleMilestones.map((m) => {
          const checked = record[m.field] || false;
          return (
            <label
              key={m.key}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors ${
                checked
                  ? "bg-[rgba(212,175,55,0.06)] text-foreground"
                  : "hover:bg-[rgba(18,18,18,0.03)] text-muted"
              }`}
            >
              <input
                type="checkbox"
                name={m.field}
                value="1"
                defaultChecked={checked}
                onChange={(e) => {
                  // Submit form on change
                  e.target.form.requestSubmit();
                }}
                className="h-3.5 w-3.5 rounded border-[var(--line)] accent-[var(--gold-text)]"
                disabled={pending}
              />
              <svg
                className={`h-3 w-3 shrink-0 ${checked ? "text-[var(--gold-text)]" : "text-muted/50"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
              </svg>
              <span className={`text-[11px] font-medium ${checked ? "text-foreground" : ""}`}>
                {m.label}
              </span>
              {checked && (
                <svg className="ml-auto h-3 w-3 text-[var(--gold-text)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          );
        })}
      </form>

      {/* Next step */}
      {record.nextStep && (
        <p className="mt-3 text-[10px] italic text-muted border-t border-[var(--line)] pt-2">
          Next: {record.nextStep}
        </p>
      )}
    </div>
  );
}
