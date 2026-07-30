const RESUME_KEY = 'soundtok:resumeId';
const FEED_SNAPSHOT_KEY = 'soundtok:feedSnapshot';

export function saveSoundTokResume(id: string | null | undefined) {
  if (typeof sessionStorage === 'undefined') return;
  if (!id) return;
  try {
    sessionStorage.setItem(RESUME_KEY, id);
  } catch {
    /* ignore */
  }
}

export function peekSoundTokResume(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(RESUME_KEY);
  } catch {
    return null;
  }
}

export function clearSoundTokResume() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}

/** Keep the in-memory feed so deep scroll position survives profile round-trip. */
export function saveSoundTokFeedSnapshot(items: Array<{ id: string }> | null | undefined) {
  if (typeof sessionStorage === 'undefined') return;
  if (!items || items.length === 0) return;
  try {
    sessionStorage.setItem(FEED_SNAPSHOT_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function peekSoundTokFeedSnapshot<T extends { id: string }>(): T[] | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FEED_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function clearSoundTokFeedSnapshot() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(FEED_SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}
