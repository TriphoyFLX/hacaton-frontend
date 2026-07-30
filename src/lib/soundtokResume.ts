const RESUME_KEY = 'soundtok:resumeId';

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
