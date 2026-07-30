/**
 * Soft, calm in-app notification chime (Web Audio — no asset file).
 * Debounced so bursts of events don't spam.
 * Volume: 0 = mute, 1 = loud (persisted in localStorage).
 */

const MIN_GAP_MS = 900;
const MUTE_KEY = 'sl_notification_sound_muted_v1';
const VOLUME_KEY = 'sl_notification_sound_volume_v1';

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.7;
  return Math.min(1, Math.max(0, value));
}

export function getNotificationSoundVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw == null) {
      // Migrate legacy mute flag → volume 0
      if (localStorage.getItem(MUTE_KEY) === '1') return 0;
      return 0.7;
    }
    return clampVolume(Number(raw));
  } catch {
    return 0.7;
  }
}

export function setNotificationSoundVolume(volume: number) {
  const next = clampVolume(volume);
  try {
    localStorage.setItem(VOLUME_KEY, String(next));
    if (next <= 0.001) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    /* ignore */
  }
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
  filter.frequency.setValueAtTime(2200, start);
  filter.Q.setValueAtTime(0.6, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function isNotificationSoundMuted(): boolean {
  return getNotificationSoundVolume() <= 0.001;
}

export function setNotificationSoundMuted(muted: boolean) {
  if (muted) setNotificationSoundVolume(0);
  else if (getNotificationSoundVolume() <= 0.001) setNotificationSoundVolume(0.7);
}

async function ensureRunning(): Promise<AudioContext | null> {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === 'running' ? ctx : null;
}

function playChime(volume: number, force = false): void {
  if (typeof window === 'undefined') return;
  const vol = clampVolume(volume);
  if (vol <= 0.001) return;

  const now = Date.now();
  if (!force && now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;

  void (async () => {
    try {
      const ctx = await ensureRunning();
      if (!ctx) return;

      const t0 = ctx.currentTime + 0.03;
      // Wide perceptual range: quiet near 0, clearly loud near 1 (squared curve).
      const shaped = vol * vol;
      const peakA = 0.012 + shaped * 0.52;
      const peakB = 0.01 + shaped * 0.4;
      tone(ctx, 523.25, t0, 0.48, peakA); // C5
      tone(ctx, 659.25, t0 + 0.16, 0.62, peakB); // E5
    } catch {
      /* blocked until a user gesture */
    }
  })();
}

/** Gentle two-note chime — quiet and non-jarring. */
export function playNotificationSound(): void {
  playChime(getNotificationSoundVolume(), false);
}

/**
 * Preview at an explicit volume (slider drag). Bypasses mute/volume store read
 * but still uses the given level; skips debounce gap for snappy feedback.
 */
export function previewNotificationSound(volume: number): void {
  unlockNotificationSound();
  playChime(volume, true);
}

/**
 * Call inside a user gesture so Chrome/Safari allow later notification chimes.
 * Plays a silent buffer to fully unlock the audio pipeline.
 */
export function unlockNotificationSound(): void {
  if (unlocked) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx
      .resume()
      .then(() => {
        unlocked = true;
        try {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  } catch {
    /* ignore */
  }
}
