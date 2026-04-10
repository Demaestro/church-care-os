"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and listens for sync messages.
 * Mount once in the root layout for staff users.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Listen for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — silent update in background
              newWorker.postMessage({ type: "skipWaiting" });
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed silently — app still works online
      });

    // Handle messages from SW (sync complete, etc.)
    const handler = (event) => {
      if (event.data?.type === "sync-complete") {
        // Could dispatch a toast notification here if needed
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  return null;
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
