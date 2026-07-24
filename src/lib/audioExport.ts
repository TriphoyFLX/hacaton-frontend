/** Encode AudioBuffer as 16-bit PCM WAV. */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const ab = new ArrayBuffer(44 + length);
  const view = new DataView(ab);
  const channels: Float32Array[] = [];
  let pos = 0;

  const writeU16 = (v: number) => {
    view.setUint16(pos, v, true);
    pos += 2;
  };
  const writeU32 = (v: number) => {
    view.setUint32(pos, v, true);
    pos += 4;
  };

  writeU32(0x46464952); // RIFF
  writeU32(36 + length);
  writeU32(0x45564157); // WAVE
  writeU32(0x20746d66); // fmt
  writeU32(16);
  writeU16(1);
  writeU16(numChannels);
  writeU32(sampleRate);
  writeU32(sampleRate * 2 * numChannels);
  writeU16(numChannels * 2);
  writeU16(16);
  writeU32(0x61746164); // data
  writeU32(length);

  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

  let offset = 0;
  while (offset < buffer.length) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = Math.max(-1, Math.min(1, channels[ch][offset] ?? 0));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(pos, s, true);
      pos += 2;
    }
    offset += 1;
  }

  return new Blob([ab], { type: 'audio/wav' });
}

export function pickRecorderMime(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

export async function decodeBlobToAudioBuffer(blob: Blob, ctx: AudioContext): Promise<AudioBuffer> {
  const ab = await blob.arrayBuffer();
  return ctx.decodeAudioData(ab.slice(0));
}

export async function mediaRecorderBlobToWavFile(
  recorded: Blob,
  ctx: AudioContext,
  fileName: string,
): Promise<File> {
  const buffer = await decodeBlobToAudioBuffer(recorded, ctx);
  const wav = audioBufferToWavBlob(buffer);
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'beat';
  return new File([wav], `${safe}.wav`, { type: 'audio/wav' });
}

/** Tag used to list published MIDI beats on /projects */
export const BEAT_POST_TAG = 'beat';
