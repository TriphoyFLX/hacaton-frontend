/**
 * Soft, calm in-app notification chime (Web Audio — no asset file).
 * Debounced so bursts of events don't spam.
 */

const MIN_GAP_MS = 900;
const MUTE_KEY = 'sl_notification_sound_muted_v1';

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

  // Soft attack / calm decay
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.04);
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

/** Gentle two-note chime — quiet and non-jarring. */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  if (isNotificationSoundMuted()) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;

  void (async () => {
    try {
      const ctx = await ensureRunning();
      if (!ctx) return;

      const t0 = ctx.currentTime + 0.03;
      // Soft ascending fifth — calm “ding-dong” (audible but gentle)
      tone(ctx, 523.25, t0, 0.48, 0.14); // C5
      tone(ctx, 659.25, t0 + 0.16, 0.62, 0.11); // E5
    } catch {
      /* blocked until a user gesture */
    }
  })();
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
