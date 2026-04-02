'use client';

import { useMemo, useState } from "react";

function buildWatermarkRows(value) {
  return Array.from({ length: 5 }, (_, index) => `${value} · ${index + 1}`);
}

export function PrivacyShield({
  eyebrow,
  title,
  body,
  watermark = "Confidential care view",
  quickHideLabel = "Hide details",
  revealLabel = "Show details",
  hiddenTitle = "Details hidden for privacy",
  hiddenBody = "Use the button above when you are ready to reveal this view again.",
  defaultHidden = false,
  className = "",
  children,
}) {
  const [hidden, setHidden] = useState(defaultHidden);
  const watermarkRows = useMemo(() => buildWatermarkRows(watermark), [watermark]);

  return (
    <section
      className={`rounded-[1.85rem] border border-line bg-paper/90 p-5 shadow-[var(--shadow)] ${className}`.trim()}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-2xl tracking-[-0.03em] text-foreground [font-family:var(--font-display)]">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-moss">
            {watermark}
          </span>
          <button
            type="button"
            aria-pressed={hidden}
            onClick={() => setHidden((current) => !current)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-hover)]"
          >
            {hidden ? revealLabel : quickHideLabel}
          </button>
        </div>
      </div>

      <div
        data-private-hidden={hidden ? "true" : "false"}
        className="privacy-stage mt-5 overflow-hidden rounded-[1.5rem] border border-line bg-canvas"
      >
        <div className="privacy-watermark-grid" aria-hidden="true">
          {watermarkRows.map((row) => (
            <span key={row}>{row}</span>
          ))}
        </div>

        <div className="privacy-content relative z-[1]">{children}</div>

        <div className="privacy-cover" aria-hidden={hidden ? "false" : "true"}>
          <div className="rounded-[1.35rem] border border-line bg-paper/95 px-5 py-4 text-center shadow-[var(--shadow)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              {hiddenTitle}
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground">{hiddenBody}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
