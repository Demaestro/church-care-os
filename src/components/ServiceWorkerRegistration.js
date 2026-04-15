"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and shows an "Update available" banner
 * when a new version is ready. Mount once in the root layout.
 */
export default function ServiceWorkerRegistration() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // SW registration failed silently — app still works online
      });

    // Listen for messages from the SW (update ready, sync complete)
    const handler = (event) => {
      if (event.data?.type === "sw-updated") {
        setUpdateReady(true);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 sm:bottom-6"
      style={{ width: "min(calc(100vw - 2rem), 420px)" }}
    >
      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 text-white shadow-xl"
        style={{ background: "linear-gradient(135deg, #020266 0%, #0a0a7a 100%)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🔄</span>
          <div>
            <p className="text-sm font-semibold leading-tight">New version available</p>
            <p className="text-xs text-white/70 mt-0.5">Tap Refresh to get the latest updates</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold tracking-wide transition hover:bg-white/25 active:scale-95"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

/**
 * Utility: queue a failed form submission for background sync replay.
 * Call this in a form's catch block when offline.
 */
export async function queueOfflineRequest({ url, method = "POST", headers = {}, body = "" }) {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  navigator.serviceWorker.controller.postMessage({
    type: "queue-request",
    id,
    url,
    method,
    headers,
    body,
  });

  // Register a sync event so the SW replays when online
  if ("SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register("offline-queue-replay").catch(() => {});
  }

  return id;
}
