'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const MAX_VIEWS = 6;

function normalizeSavedViews(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.label === "string" &&
          typeof item.href === "string"
      )
      .slice(0, MAX_VIEWS);
  } catch {
    return [];
  }
}

function loadSavedViews(storageKey) {
  if (typeof window === "undefined") {
    return [];
  }

  return normalizeSavedViews(window.localStorage.getItem(storageKey));
}

function persistSavedViews(storageKey, values) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(values));
}

function buildViewId(label, href) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${href}`;
}

export function SavedViewStrip({
  storageKey,
  currentHref,
  currentLabel,
  presets = [],
  title = "Saved views",
  body = "Keep your most-used filtered views close so you can return to them in one click.",
  emptyMessage = "Save the current view once you have a filter combination you want to keep.",
}) {
  const [savedViews, setSavedViews] = useState([]);
  const [draftLabel, setDraftLabel] = useState("");
  const normalizedCurrentHref = useMemo(
    () => String(currentHref || "").trim() || "/",
    [currentHref]
  );
  const normalizedCurrentLabel = useMemo(
    () => String(currentLabel || "").trim() || "Current view",
    [currentLabel]
  );

  useEffect(() => {
    setSavedViews(loadSavedViews(storageKey));
  }, [storageKey]);

  const canSave = Boolean(normalizedCurrentHref);
  const hasSavedCurrentView = savedViews.some(
    (item) => item.href === normalizedCurrentHref
  );

  function handleSave(event) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    const label = draftLabel.trim() || normalizedCurrentLabel;
    const nextItem = {
      id: buildViewId(label, normalizedCurrentHref),
      label,
      href: normalizedCurrentHref,
    };

    setSavedViews((current) => {
      const next = [nextItem, ...current.filter((item) => item.href !== normalizedCurrentHref)]
        .slice(0, MAX_VIEWS);
      persistSavedViews(storageKey, next);
      return next;
    });
    setDraftLabel("");
  }

  function handleRemove(viewId) {
    setSavedViews((current) => {
      const next = current.filter((item) => item.id !== viewId);
      persistSavedViews(storageKey, next);
      return next;
    });
  }

  return (
    <section className="rounded-[1.45rem] border border-line bg-canvas p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {title}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
        </div>
        <form onSubmit={handleSave} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor={`${storageKey}-view-name`}>
            Name this saved view
          </label>
          <input
            id={`${storageKey}-view-name`}
            type="text"
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            placeholder={normalizedCurrentLabel}
            className="min-w-[16rem] rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-[#8b847d] focus:border-moss"
          />
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {hasSavedCurrentView ? "Update current view" : "Save current view"}
          </button>
        </form>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Link
            key={preset.href}
            href={preset.href}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ${
              preset.href === normalizedCurrentHref
                ? "border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss"
                : "border-line bg-paper text-foreground hover:bg-[#f4ecde]"
            }`}
            title={preset.description || preset.label}
          >
            {preset.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {savedViews.length > 0 ? (
          savedViews.map((view) => (
            <div
              key={view.id}
              className="flex flex-col gap-3 rounded-[1rem] border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                href={view.href}
                className="min-w-0 flex-1 text-sm font-semibold text-foreground transition hover:text-moss"
              >
                <span className="block truncate">{view.label}</span>
                <span className="mt-1 block truncate text-xs font-normal text-muted">
                  {view.href}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(view.id)}
                className="inline-flex min-h-10 items-center justify-center rounded-[0.9rem] border border-line bg-canvas px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted transition hover:bg-[#f4ecde] hover:text-foreground"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-[1rem] border border-dashed border-line bg-paper px-4 py-4 text-sm leading-7 text-muted">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}
