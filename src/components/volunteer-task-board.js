'use client';

import { useState } from "react";
import {
  acceptVolunteerTask,
  addVolunteerTaskNote,
  completeVolunteerTask,
  declineVolunteerTask,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const badgeClasses = {
  high: "bg-[rgba(184,101,76,0.10)] text-clay",
  watch: "bg-[rgba(179,138,69,0.14)] text-[#7a6128]",
  routine: "bg-[rgba(34,28,22,0.06)] text-muted",
  done: "bg-[rgba(73,106,77,0.10)] text-moss",
};

const avatarClasses = [
  "bg-[rgba(77,115,193,0.12)] text-[#365aa2]",
  "bg-[rgba(73,106,77,0.12)] text-moss",
  "bg-[rgba(179,138,69,0.14)] text-[#8a6b2b]",
  "bg-[rgba(184,101,76,0.12)] text-clay",
];

export function VolunteerTaskBoard({ preview, initialTab = "assigned", copy }) {
  const [tab, setTab] = useState(
    initialTab === "completed" ? "completed" : "assigned"
  );
  const sections = Object.entries(preview.assigned);
  const hasAssignedTasks = sections.some(([, tasks]) => tasks.length > 0);
  const volunteerCopy = copy.volunteer;

  return (
    <section className="space-y-8">
      <div className="max-w-4xl">
        <p className="text-4xl leading-tight tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
          {volunteerCopy.hero}
        </p>
      </div>

      <div>
        <h1 className="text-4xl tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
          {volunteerCopy.title}
        </h1>
        <p className="mt-2 text-lg text-muted">
          {preview.volunteer.name} - {preview.volunteer.team}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <TabButton
          label={`${volunteerCopy.assigned} (${preview.tabs.assigned})`}
          active={tab === "assigned"}
          onClick={() => setTab("assigned")}
        />
        <TabButton
          label={`${volunteerCopy.completed} (${preview.tabs.completed})`}
          active={tab === "completed"}
          onClick={() => setTab("completed")}
        />
      </div>

      {tab === "assigned" ? (
        hasAssignedTasks ? (
          <div className="space-y-8">
            {sections.map(([key, tasks]) =>
              tasks.length > 0 ? (
                <section key={key}>
                  <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted">
                    {volunteerCopy.sections[key]}
                  </p>
                  <div className="mt-4 space-y-5">
                    {tasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        avatarClass={avatarClasses[index % avatarClasses.length]}
                        copy={volunteerCopy}
                      />
                    ))}
                  </div>
                </section>
              ) : null
            )}
          </div>
        ) : (
            <article className="surface-card rounded-[1.75rem] border border-dashed border-line bg-paper p-6">
              <h2 className="text-2xl text-foreground [font-family:var(--font-display)]">
                {volunteerCopy.emptyAssignedTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {volunteerCopy.emptyAssignedBody}
              </p>
            </article>
        )
      ) : (
        <section>
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted">
            {volunteerCopy.sections.completed}
          </p>
          {preview.completed.length > 0 ? (
            <div className="mt-4 space-y-5">
              {preview.completed.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  avatarClass={avatarClasses[(index + 1) % avatarClasses.length]}
                  copy={volunteerCopy}
                />
              ))}
            </div>
          ) : (
            <article className="surface-card mt-4 rounded-[1.75rem] border border-dashed border-line bg-paper p-6">
              <h2 className="text-2xl text-foreground [font-family:var(--font-display)]">
                {volunteerCopy.emptyCompletedTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {volunteerCopy.emptyCompletedBody}
              </p>
            </article>
          )}
        </section>
      )}
    </section>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1rem] border px-6 py-3 text-2xl font-medium transition sm:text-3xl ${
        active
          ? "border-[rgba(34,28,22,0.16)] bg-paper text-foreground"
          : "border-line bg-transparent text-muted hover:bg-paper"
      }`}
    >
      {label}
    </button>
  );
}

function TaskCard({ task, avatarClass, copy }) {
  const [expandedPanel, setExpandedPanel] = useState("");
  const showNoteForm = expandedPanel === "note";
  const showDeclineForm = expandedPanel === "decline";

  function togglePanel(panel) {
    setExpandedPanel((current) => (current === panel ? "" : panel));
  }

  return (
    <article className="surface-card rounded-[1.75rem] border border-line bg-paper p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {task.title}
          </h2>
          <div className="mt-4 flex items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-semibold ${avatarClass}`}
            >
              {task.initials}
            </span>
            <div>
              <p className="text-2xl font-medium text-foreground">{task.memberName}</p>
              <p className="text-lg text-muted">{task.detail}</p>
            </div>
          </div>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-4 py-2 text-lg font-medium ${badgeClasses[task.badgeTone]}`}
        >
          {task.badge}
        </span>
      </div>

      <div className="mt-5 rounded-[1.25rem] bg-canvas px-4 py-5 text-lg leading-8 text-foreground">
        {task.instruction}
      </div>

      {task.accepted ? (
        <p className="mt-4 text-sm text-muted">
          {copy.accepted(task.acceptedLabel)}
        </p>
      ) : null}

      {task.canAccept || task.canComplete || task.canAddNote ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {task.canAccept ? (
            <form
              action={acceptVolunteerTask.bind(
                null,
                task.id,
                task.householdSlug,
                task.volunteerName
              )}
              className="flex-1 min-w-[12rem]"
            >
              <SubmitButton
                idleLabel={copy.acceptTask}
                pendingLabel={copy.accepting}
                className="w-full rounded-[1rem] border border-line bg-paper px-4 py-4 text-xl font-medium text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          ) : (
            <div />
          )}

          {task.canComplete ? (
            <form
              action={completeVolunteerTask.bind(
                null,
                task.id,
                task.householdSlug,
                task.volunteerName
              )}
              className="flex-1 min-w-[12rem]"
            >
              <SubmitButton
                idleLabel={copy.markComplete}
                pendingLabel={copy.completing}
                className="w-full rounded-[1rem] border border-line bg-paper px-4 py-4 text-xl font-medium text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          ) : null}

          {task.canAddNote ? (
            <button
              type="button"
              onClick={() => togglePanel("note")}
              className="min-w-[12rem] flex-1 rounded-[1rem] border border-line bg-paper px-4 py-4 text-xl font-medium text-foreground transition hover:bg-[#f4ecde]"
            >
              {showNoteForm ? copy.hideNote : copy.addNote}
            </button>
          ) : null}

          {task.canDecline ? (
            <button
              type="button"
              onClick={() => togglePanel("decline")}
              className="min-w-[12rem] flex-1 rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-4 py-4 text-xl font-medium text-clay transition hover:bg-[rgba(184,101,76,0.14)]"
            >
              {showDeclineForm ? copy.keepTask : copy.declineTask}
            </button>
          ) : null}
        </div>
      ) : null}

      {showNoteForm ? (
        <form
          action={addVolunteerTaskNote.bind(
            null,
            task.id,
            task.householdSlug,
            task.volunteerName
          )}
          className="mt-4 space-y-3 rounded-[1.25rem] border border-line bg-canvas p-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              {copy.noteLabel}
            </span>
            <textarea
              name="body"
              rows={3}
              placeholder={copy.notePlaceholder}
              required
              className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-moss"
            />
          </label>
          <SubmitButton
            idleLabel={copy.saveNote}
            pendingLabel={copy.savingNote}
            className="inline-flex items-center rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#f4ecde] disabled:cursor-not-allowed disabled:opacity-70"
          />
        </form>
      ) : null}

      {showDeclineForm ? (
        <form
          action={declineVolunteerTask.bind(
            null,
            task.id,
            task.householdSlug,
            task.volunteerName
          )}
          className="mt-4 space-y-3 rounded-[1.25rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] p-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              {copy.declineReason}
            </span>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder={copy.declinePlaceholder}
              className="mt-2 w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition focus:border-clay"
            />
          </label>
          <SubmitButton
            idleLabel={copy.reroute}
            pendingLabel={copy.rerouting}
            className="inline-flex items-center rounded-[1rem] border border-[rgba(184,101,76,0.18)] bg-paper px-4 py-3 text-sm font-semibold text-clay transition hover:bg-[#f8efe9] disabled:cursor-not-allowed disabled:opacity-70"
          />
        </form>
      ) : null}
    </article>
  );
}
