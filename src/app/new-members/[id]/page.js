import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { getJourneyById, listJourneyContacts } from "@/lib/new-member-store";
import { logContact, completeNewMemberJourney, dropNewMemberJourney } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { FlashBanner } from "@/components/flash-banner";
import Link from "next/link";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const journey = getJourneyById(id);
  return { title: journey ? `${journey.memberName} — Journey` : "Member Journey" };
}

const STAGE_STEPS = ["day_0","day_2","day_5","day_12","day_21","day_30","completed"];
const STAGE_LABELS = { day_0:"Joined", day_2:"Day 2", day_5:"Day 5", day_12:"Day 12", day_21:"Day 21", day_30:"Day 30", completed:"Integrated" };
const METHOD_ICONS = { call:"📞", text:"💬", visit:"🏠", "in-person":"🤝" };
const OUTCOME_COLORS = { reached:"text-moss", voicemail:"text-gold", "no-answer":"text-clay", visited:"text-moss" };

export default async function MemberJourneyPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireCurrentUser(["pastor","overseer","owner","branch_admin","general_overseer","hq_care_admin","regional_overseer","leader","volunteer"]);
  const journey = getJourneyById(id);
  if (!journey) notFound();
  const contacts = listJourneyContacts(id);
  const notice = typeof sp?.notice === "string" ? sp.notice : "";
  const error  = typeof sp?.error  === "string" ? sp.error  : "";
  const currentStepIndex = STAGE_STEPS.indexOf(journey.stage);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <div className="mb-6">
        <Link href="/new-members" className="text-sm text-muted hover:text-foreground transition">← Back to New Members</Link>
      </div>

      <FlashBanner notice={notice} error={error} noticeTitle="Saved" errorTitle="Error" />

      {/* Member card */}
      <section className="surface-card p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white" style={{ background:"linear-gradient(135deg,#2563eb,#4f46e5)", boxShadow:"0 4px 14px rgba(37,99,235,0.3)" }}>
              {getInitials(journey.memberName)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{journey.memberName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                {journey.gender !== "unspecified" && <span className="capitalize">{journey.gender}</span>}
                {journey.birthday && <span>🎂 {new Date(journey.birthday).toLocaleDateString("en-GB",{day:"numeric",month:"long"})}</span>}
                {journey.memberEmail && <span>{journey.memberEmail}</span>}
                {journey.memberPhone && <span>{journey.memberPhone}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="badge badge-new">{STAGE_LABELS[journey.stage] || journey.stage}</span>
                {journey.assignedVolunteerName
                  ? <span className="badge badge-routine">👤 {journey.assignedVolunteerName}</span>
                  : <span className="badge badge-urgent">No volunteer assigned</span>}
                <span className="badge badge-routine">{journey.contactCount} contacts made</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {journey.stage !== "completed" && journey.stage !== "dropped" && (
              <>
                <form action={completeNewMemberJourney}>
                  <input type="hidden" name="journeyId" value={journey.id} />
                  <button type="submit" className="btn-primary text-xs" style={{ minHeight:"2rem", padding:"0 0.75rem", background:"#059669" }}>Mark Integrated</button>
                </form>
                <form action={dropNewMemberJourney}>
                  <input type="hidden" name="journeyId" value={journey.id} />
                  <button type="submit" className="btn-ghost text-xs" style={{ color:"var(--clay)" }}>Mark Dropped</button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Journey progress bar */}
        <div className="mt-6">
          <p className="eyebrow mb-3">Journey progress</p>
          <div className="flex items-center gap-0">
            {STAGE_STEPS.map((step, i) => {
              const done = i < currentStepIndex;
              const current = i === currentStepIndex;
              return (
                <div key={step} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${done ? "bg-[var(--moss)] text-white" : current ? "border-2 border-[var(--moss)] bg-paper text-moss" : "border border-line bg-canvas text-muted"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className="mt-1 text-[0.6rem] text-center text-muted leading-tight">{STAGE_LABELS[step]}</span>
                  {i < STAGE_STEPS.length - 1 && (
                    <div className={`absolute mt-4 h-0.5 w-full ${done ? "bg-[var(--moss)]" : "bg-[var(--line)]"}`} style={{ display:"none" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Log a contact */}
      <section className="mt-6 surface-card p-6">
        <p className="eyebrow">Log a contact</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Record your follow-up</h2>
        <form action={logContact} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="journeyId" value={journey.id} />
          <input type="hidden" name="contactedByName" value={user.name} />
          <input type="hidden" name="contactedByUserId" value={user.id} />
          <input type="hidden" name="organizationId" value={journey.organizationId} />
          <input type="hidden" name="branchId" value={journey.branchId} />
          <div>
            <label className="block text-sm font-medium text-foreground">Method</label>
            <select name="contactMethod" className="mt-2 input-field">
              <option value="call">📞 Phone call</option>
              <option value="text">💬 Text message</option>
              <option value="in-person">🤝 In person</option>
              <option value="visit">🏠 Home visit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Outcome</label>
            <select name="outcome" className="mt-2 input-field">
              <option value="reached">✅ Reached them</option>
              <option value="voicemail">📬 Left voicemail</option>
              <option value="no-answer">📵 No answer</option>
              <option value="visited">🏠 Visited in person</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground">Notes</label>
            <textarea name="notes" rows={3} placeholder="How did the conversation go? Any prayer requests, concerns, or next steps?" className="mt-2 input-field" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton idleLabel="Log contact" pendingLabel="Saving…" className="btn-primary" />
          </div>
        </form>
      </section>

      {/* Contact log */}
      <section className="mt-6 surface-card p-6">
        <p className="eyebrow">Contact history</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{contacts.length} {contacts.length === 1 ? "contact" : "contacts"} logged</h2>
        {contacts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No contacts logged yet. Use the form above to record your first follow-up.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {contacts.map(c => (
              <div key={c.id} className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-line bg-canvas px-4 py-3">
                <span className="text-xl">{METHOD_ICONS[c.contactMethod] || "📋"}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{c.contactedByName}</p>
                    <span className={`text-xs font-semibold capitalize ${OUTCOME_COLORS[c.outcome] || "text-muted"}`}>{c.outcome.replace("-"," ")}</span>
                  </div>
                  {c.notes && <p className="mt-1 text-sm text-muted">{c.notes}</p>}
                  <p className="mt-1 text-xs text-muted">{new Date(c.contactedAt).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getInitials(name = "") {
  return name.split(" ").filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("");
}
