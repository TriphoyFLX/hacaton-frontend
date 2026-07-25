/**
 * Soft, calm in-app notification chime (Web Audio — no asset file).
 * Debounced so bursts of events don't spam.
 */

const MIN_GAP_MS = 1100;
const MUTE_KEY = 'sl_notification_sound_muted_v1';

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peak: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, start);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, start);
  filter.Q.setValueAtTime(0.7, start);

  // Soft attack / long calm decay
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function isNotificationSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    /* ignore */
  }
}

/** Gentle two-note chime — quiet and non-jarring. */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  if (isNotificationSoundMuted()) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;

  try {
    const ctx = getCtx();
    if (!ctx) return;

    void ctx.resume().catch(() => undefined);

    const t0 = ctx.currentTime + 0.02;
    // Soft ascending fifth — calm “ding-dong”
    tone(ctx, 523.25, t0, 0.42, 0.055); // C5
    tone(ctx, 659.25, t0 + 0.14, 0.55, 0.045); // E5
  } catch {
    /* autoplay / AudioContext blocked until a gesture — ignore */
  }
}

/** Call once on a user gesture so later socket sounds are allowed. */
export function unlockNotificationSound(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume().catch(() => undefined);
  } catch {
    /* ignore */
  }
}
