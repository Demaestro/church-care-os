import "server-only";

import { createHash } from "node:crypto";

const DEFAULT_TTL_SECONDS = 30;
const GLOBAL_CACHE_KEY = "__cco_runtime_cache__";

function getCacheStore() {
  if (!globalThis[GLOBAL_CACHE_KEY]) {
    globalThis[GLOBAL_CACHE_KEY] = new Map();
  }

  return globalThis[GLOBAL_CACHE_KEY];
}

export function hashCacheKey(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeTTL(ttlSeconds) {
  if (!Number.isFinite(ttlSeconds)) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.max(5, Math.min(300, Math.trunc(ttlSeconds)));
}

export async function getCachedValue(key) {
  const store = getCacheStore();
  const entry = store.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry.value;
}

export async function setCachedValue(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const store = getCacheStore();
  const ttl = normalizeTTL(ttlSeconds);
  store.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function withRuntimeCache(key, ttlSeconds, loader) {
  const cached = await getCachedValue(key);
  if (cached) {
    return cached;
  }

  const value = await loader();
  await setCachedValue(key, value, ttlSeconds);
  return value;
}
