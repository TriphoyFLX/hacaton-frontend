/**
 * In-memory page data cache so revisiting tabs paints instantly
 * while a background refetch updates quietly.
 */

type Entry<T> = { data: T; at: number };

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 60_000;

export function getCachedPageData<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > maxAgeMs) return null;
  return entry.data as T;
}

/** Returns stale data even if TTL expired (for instant paint + silent refresh). */
export function getStalePageData<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function setCachedPageData<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
}

export function invalidatePageData(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function isPageDataFresh(key: string, maxAgeMs = DEFAULT_TTL_MS): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.at <= maxAgeMs;
}
