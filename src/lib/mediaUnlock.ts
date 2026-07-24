const UNLOCKED_KEY = 'soundlab_media_unlocked';
const SOUNDTOK_SOUND_KEY = 'soundtok_sound';

let unlockedInSession = false;

/** Tiny silent WAV as ArrayBuffer — turned into a blob: URL (CSP-safe vs data:). */
function createSilentWavBlobUrl(): string {
  const sampleRate = 8000;
  const numSamples = 8;
  const bytes = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

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
    const silenceUrl = createSilentWavBlobUrl();
    const silence = new Audio(silenceUrl);
    silence.volume = 0.01;
    void silence
      .play()
      .then(() => {
        silence.pause();
      })
      .catch(() => undefined)
      .finally(() => {
        URL.revokeObjectURL(silenceUrl);
      });
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
