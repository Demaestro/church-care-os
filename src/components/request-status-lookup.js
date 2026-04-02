'use client';

import { useActionState } from "react";
import Link from "next/link";
import { lookupRequestStatus } from "@/app/actions";
import { PrivacyShield } from "@/components/privacy-shield";
import { translateSupportNeed } from "@/lib/i18n";

const statusToneClasses = {
  done: "border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss",
  active: "border-[rgba(74,135,217,0.18)] bg-[rgba(74,135,217,0.10)] text-[#2f67b4]",
  pastoral: "border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay",
  watch: "border-[rgba(179,138,69,0.18)] bg-[rgba(179,138,69,0.12)] text-[#7a6128]",
  quiet: "border-[rgba(34,28,22,0.08)] bg-[rgba(34,28,22,0.04)] text-muted",
};

function buildInitialState(initialCode, initialResult) {
  return {
    message: "",
    errors: {},
    lookupCode: initialCode || "",
    result: initialResult || null,
  };
}

export function RequestStatusLookup({
  initialCode = "",
  initialResult = null,
  copy,
  privacyCopy,
  language = "en",
}) {
  const [state, formAction, pending] = useActionState(
    lookupRequestStatus,
    buildInitialState(initialCode, initialResult)
  );
  const result = state.result;
  const statusCopy = copy;

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="surface-card rounded-[1.8rem] border border-line bg-paper p-6"
      >
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            {statusCopy.trackingCodeLabel}
          </span>
          <input
            type="text"
            name="trackingCode"
            defaultValue={state.lookupCode}
            placeholder="CCO-1234ABCD"
            className="mt-3 w-full rounded-[1.1rem] border border-line bg-canvas px-4 py-4 text-base uppercase tracking-[0.12em] text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss"
          />
        </label>

        {state.errors?.trackingCode ? (
          <p className="mt-3 text-sm text-clay">{state.errors.trackingCode}</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-7 text-muted">
            {statusCopy.helper}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-[1rem] bg-foreground px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#2b251f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? statusCopy.checkingStatus : statusCopy.checkStatus}
          </button>
        </div>
      </form>

      {state.message && !result ? (
        <div className="rounded-[1.35rem] border border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] px-5 py-4 text-sm leading-7 text-clay">
          {state.message}
        </div>
      ) : null}

      {result ? (
        <PrivacyShield
          eyebrow={statusCopy.privacyShield.eyebrow}
          title={statusCopy.privacyShield.title}
          body={statusCopy.privacyShield.body}
          watermark={statusCopy.privacyShield.watermark}
          quickHideLabel={privacyCopy?.quickHide || "Hide details"}
          revealLabel={privacyCopy?.reveal || "Show details"}
          hiddenTitle={privacyCopy?.hiddenTitle || "Details hidden for privacy"}
          hiddenBody={
            privacyCopy?.hiddenBody ||
            "Sensitive details are now covered. Use the button above whenever you are ready to reveal them again."
          }
        >
          <section className="surface-card rounded-[2rem] p-6 lg:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
                  {statusCopy.requestLocated}
                </p>
                <h2 className="mt-3 text-3xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  {result.householdName}
                </h2>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-muted">
                  {result.trackingCode}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] ${statusToneClasses[result.statusTone]}`}
              >
                {result.statusLabel}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                label={statusCopy.infoCards.supportNeed}
                value={translateSupportNeed(result.need, language)}
              />
              <InfoCard label={statusCopy.infoCards.created} value={result.createdLabel} />
              <InfoCard
                label={statusCopy.infoCards.responseWindow}
                value={result.dueLabel}
              />
              <InfoCard label={statusCopy.infoCards.privacy} value={result.privacyLabel} />
            </div>

            <div className="mt-6 rounded-[1.35rem] bg-canvas p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {statusCopy.currentUpdate}
              </p>
              <p className="mt-3 text-base leading-8 text-foreground">
                {result.statusDetail}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted">{result.summary}</p>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
                  {statusCopy.timelineTitle}
                </h3>
                <Link
                  href="/requests/new"
                  className="text-sm font-medium text-[#356fbe] transition hover:text-[#29578f]"
                >
                  {statusCopy.submitAnotherRequest}
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {result.timeline.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-[1.25rem] border border-line bg-canvas p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-lg font-semibold text-foreground">{event.label}</p>
                      <p className="text-sm text-muted">{event.createdLabel}</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">{event.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </PrivacyShield>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <HelperCard
            title={statusCopy.helperCards.visibleTitle}
            body={statusCopy.helperCards.visibleBody}
          />
          <HelperCard
            title={statusCopy.helperCards.noCodeTitle}
            body={statusCopy.helperCards.noCodeBody}
          />
        </section>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-sm leading-7 text-foreground">{value}</p>
    </article>
  );
}

function HelperCard({ title, body }) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-paper p-5">
      <h3 className="text-xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
    </article>
  );
}
