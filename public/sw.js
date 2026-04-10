/**
 * Church Care OS — Service Worker
 *
 * Strategy:
 *   Static assets (_next/static, icons, manifest) → cache-first, update in bg
 *   Navigation pages                               → network-first, fallback to cache
 *   API routes                                     → network-only (no caching)
 *   Offline queue                                  → form submissions stored in IDB
 *                                                    and replayed on reconnection
 */

const STATIC_CACHE  = "church-care-os-static-v3";
const PAGES_CACHE   = "church-care-os-pages-v3";
const OFFLINE_STORE = "church-care-os-offline-queue";

const SAFE_STATIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/app-icon-maskable-512.png",
]);

// Pages to pre-cache on install so the shell works offline
const SHELL_PAGES = ["/offline"];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE)
      .then((cache) => cache.addAll(SHELL_PAGES).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — prune old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Skip non-GET (POST etc. handled by sync queue separately)
  if (request.method !== "GET") return;

  // API routes → network-only, never cache
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (_next/static/, icons, manifest) → cache-first + bg update
  const isFrameworkStatic = url.pathname.startsWith("/_next/static/");
  const isSafeStaticPath  = SAFE_STATIC_PATHS.has(url.pathname);

  if (isFrameworkStatic || isSafeStaticPath) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML navigation → network-first with stale fallback, then offline page
  const isNavigation = request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache a copy of successful navigation responses
          if (res.ok) {
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(async () => {
          // Try stale cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fall back to offline shell
          const offline = await caches.match("/offline");
          if (offline) return offline;
          // Last resort
          return new Response(
            `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
              <h2>You are offline</h2>
              <p>Church Care OS is not reachable right now. Your work will be saved
              locally and synced when connection is restored.</p>
              <a href="javascript:location.reload()">Retry</a>
            </body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
  }
});

// ── Background Sync — offline queue replay ────────────────────────────────────
// When a form submission fails because the device is offline, the client
// stores it in IndexedDB under "offline-queue". On reconnection this fires.
self.addEventListener("sync", (event) => {
  if (event.tag === "offline-queue-replay") {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue() {
  const db = await openIdb();
  const items = await getAllQueueItems(db);

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: "include",
      });

      if (res.ok || res.status < 500) {
        // Success or client error (not a transient server error) — remove from queue
        await deleteQueueItem(db, item.id);
        notifyClients({ type: "sync-complete", itemId: item.id, status: res.status });
      }
    } catch {
      // Still offline — leave in queue
    }
  }
}

// ── Message handler — clients can push items into the queue ───────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "queue-request") {
    const { id, url, method, headers, body } = event.data;
    openIdb().then((db) => putQueueItem(db, { id, url, method, headers, body, queuedAt: Date.now() }));
  }
});

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_STORE, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("queue", { keyPath: "id" });
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

function getAllQueueItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function putQueueItem(db, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const req = tx.objectStore("queue").put(item);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

function deleteQueueItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const req = tx.objectStore("queue").delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

function notifyClients(message) {
  self.clients.matchAll({ type: "window" }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}
