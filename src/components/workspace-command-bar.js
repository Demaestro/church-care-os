'use client';

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const RECENT_KEY = "cco-command-recent";
const PINNED_KEY = "cco-command-pinned";
const MAX_RECENT = 8;

function normalizeStoredIds(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item)
      : [];
  } catch {
    return [];
  }
}

function loadStoredIds(key) {
  if (typeof window === "undefined") {
    return [];
  }

  return normalizeStoredIds(window.localStorage.getItem(key));
}

function storeIds(key, values) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(values));
}

function matchesQuery(item, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.label,
    item.description,
    item.section,
    ...(item.keywords || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function dedupeItems(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const id = item.id || item.href;
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function groupItems(items = []) {
  return items.reduce((result, item) => {
    const key = item.section || "Results";
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
}

export function WorkspaceCommandBar({
  items = [],
  quickActions = [],
  placeholder = "Jump to a person, request, branch, or workflow",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const normalizedItems = useMemo(() => dedupeItems(items), [items]);
  const deferredPathname = useDeferredValue(pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const itemMap = useMemo(
    () =>
      new Map(
        normalizedItems.map((item) => [item.id || item.href, item])
      ),
    [normalizedItems]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRecentIds(loadStoredIds(RECENT_KEY));
      setPinnedIds(loadStoredIds(PINNED_KEY));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKeydown(event) {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (!isEditable && event.key === "/") {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    const matchedItem = normalizedItems.find((item) => {
      if (!item.href) {
        return false;
      }

      if (item.href === "/") {
        return deferredPathname === "/";
      }

      return (
        deferredPathname === item.href ||
        deferredPathname.startsWith(`${item.href}/`)
      );
    });

    if (!matchedItem) {
      return;
    }

    rememberRecent(matchedItem.id || matchedItem.href, setRecentIds);
  }, [deferredPathname, normalizedItems]);

  const filteredItems = useMemo(
    () => normalizedItems.filter((item) => matchesQuery(item, deferredQuery)),
    [deferredQuery, normalizedItems]
  );
  const groupedResults = useMemo(() => groupItems(filteredItems), [filteredItems]);
  const pinnedItems = pinnedIds
    .map((id) => itemMap.get(id))
    .filter(Boolean);
  const recentItems = recentIds
    .map((id) => itemMap.get(id))
    .filter(Boolean)
    .filter((item) => !pinnedIds.includes(item.id || item.href));

  function handleNavigate(item) {
    rememberRecent(item.id || item.href, setRecentIds);
    setQuery("");
    setOpen(false);
    startTransition(() => {
      router.push(item.href);
    });
  }

  function handlePinToggle(itemId) {
    setPinnedIds((current) => {
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [itemId, ...current].slice(0, MAX_RECENT);
      storeIds(PINNED_KEY, next);
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="command-bar-trigger"
        aria-label="Open command bar"
      >
        <span className="flex min-w-0 items-center gap-3">
          <SearchGlyph />
          <span className="truncate">{placeholder}</span>
        </span>
        <span className="command-bar-shortcut">/</span>
      </button>

      {open ? (
        <div className="command-bar-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close command bar"
            onClick={() => setOpen(false)}
          />
          <div className="command-bar-panel">
            <div className="command-bar-header">
              <div className="flex items-center gap-3">
                <SearchGlyph />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={placeholder}
                  className="command-bar-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="command-bar-close"
              >
                Esc
              </button>
            </div>

            <div className="command-bar-body">
              {!deferredQuery ? (
                <>
                  <CommandSection
                    title="Quick actions"
                    items={quickActions}
                    emptyMessage="Add your most-used actions here."
                    pinnedIds={pinnedIds}
                    onNavigate={handleNavigate}
                    onPinToggle={handlePinToggle}
                  />
                  <CommandSection
                    title="Pinned"
                    items={pinnedItems}
                    emptyMessage="Pin a workspace or person to keep it close."
                    pinnedIds={pinnedIds}
                    onNavigate={handleNavigate}
                    onPinToggle={handlePinToggle}
                  />
                  <CommandSection
                    title="Recent"
                    items={recentItems}
                    emptyMessage="Recent workspaces will appear here as you move through the app."
                    pinnedIds={pinnedIds}
                    onNavigate={handleNavigate}
                    onPinToggle={handlePinToggle}
                  />
                </>
              ) : (
                Object.entries(groupedResults).map(([section, sectionItems]) => (
                  <CommandSection
                    key={section}
                    title={section}
                    items={sectionItems}
                    emptyMessage="No matches yet."
                    pinnedIds={pinnedIds}
                    onNavigate={handleNavigate}
                    onPinToggle={handlePinToggle}
                  />
                ))
              )}

              {deferredQuery && filteredItems.length === 0 ? (
                <div className="command-bar-empty">
                  <p className="font-semibold text-foreground">No matches yet</p>
                  <p className="mt-2 text-sm text-muted">
                    Try a household name, request code, branch, or workflow name.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CommandSection({
  title,
  items = [],
  emptyMessage,
  pinnedIds = [],
  onNavigate,
  onPinToggle,
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="command-bar-section-title">{title}</p>
        {items.length > 0 ? (
          <span className="rounded-full border border-line bg-canvas px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">
            {items.length}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="command-bar-empty subtle">
          <p className="text-sm text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const itemId = item.id || item.href;
            const pinned = pinnedIds.includes(itemId);

            return (
              <div key={itemId} className="command-result-row">
                <button
                  type="button"
                  onClick={() => onNavigate(item)}
                  className="command-result-main"
                >
                  <span className="command-result-icon">
                    <ResultGlyph type={item.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="mt-1 block truncate text-xs text-muted">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onPinToggle(itemId)}
                  className={`command-result-pin ${pinned ? "is-pinned" : ""}`}
                  aria-label={pinned ? "Unpin item" : "Pin item"}
                >
                  <PinGlyph pinned={pinned} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function rememberRecent(itemId, setRecentIds) {
  setRecentIds((current) => {
    const next = [itemId, ...current.filter((value) => value !== itemId)].slice(
      0,
      MAX_RECENT
    );
    storeIds(RECENT_KEY, next);
    return next;
  });
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ResultGlyph({ type }) {
  switch (type) {
    case "household":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      );
    case "request":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "branch":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-5h6v5" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      );
  }
}

function PinGlyph({ pinned }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={pinned ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 17-5 4 2-6-4-4 6-.5L12 4l3 6.5 6 .5-4 4 2 6z" />
    </svg>
  );
}
