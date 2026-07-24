const UNLOCKED_KEY = 'soundlab_media_unlocked';
const SOUNDTOK_SOUND_KEY = 'soundtok_sound';

let unlockedInSession = false;

function readFlag(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

/** Call inside a user gesture (nav click) to unlock unmuted media playback. */
export function unlockMediaPlayback(): void {
  if (unlockedInSession) return;
  unlockedInSession = true;
  writeFlag(UNLOCKED_KEY, '1');

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      void ctx.resume().catch(() => undefined);
    }
  } catch {
    // ignore
  }

  try {
    const silence = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
    );
    silence.volume = 0.01;
    void silence.play().then(() => {
      silence.pause();
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

export function isMediaUnlocked(): boolean {
  return unlockedInSession || readFlag(UNLOCKED_KEY) === '1';
}

/** Prefer SoundTok audio unless this session previously blocked unmuted autoplay. */
export function shouldPreferSoundTokAudio(): boolean {
  return readFlag(SOUNDTOK_SOUND_KEY) !== '0';
}

export function setSoundTokAudioPreference(enabled: boolean): void {
  writeFlag(SOUNDTOK_SOUND_KEY, enabled ? '1' : '0');
  if (enabled) unlockMediaPlayback();
}
