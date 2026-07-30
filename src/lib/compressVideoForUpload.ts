/**
 * Re-encode gallery videos so PC Chrome can play them immediately
 * (phone MP4 often has moov at end / HEVC — buffers for minutes with no audio).
 */

const SOFT_THRESHOLD_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 720;
const TARGET_BITRATE = 2_500_000;
const COMPRESS_BUDGET_MS = 45_000;

function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  // Prefer widely-playable VP8/Opus over VP9
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function needsForceCompress(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (name.endsWith('.mov') || type.includes('quicktime')) return true;
  if (type.includes('hevc') || type.includes('h265') || name.includes('hevc')) return true;
  if (file.size > SOFT_THRESHOLD_BYTES) return true;
  return false;
}

function canCaptureStream(video: HTMLVideoElement): video is HTMLVideoElement & {
  captureStream: (frameRate?: number) => MediaStream;
} {
  return typeof (video as HTMLVideoElement & { captureStream?: unknown }).captureStream === 'function';
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    // Must NOT stay muted — Chrome silences captureStream audio when muted
    video.muted = false;
    video.volume = 0.0001;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.crossOrigin = 'anonymous';
    video.src = url;

    video.onloadedmetadata = () => {
      (video as HTMLVideoElement & { __objectUrl?: string }).__objectUrl = url;
      resolve(video);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать видео'));
    };
  });
}

function revoke(video: HTMLVideoElement) {
  const objectUrl = (video as HTMLVideoElement & { __objectUrl?: string }).__objectUrl;
  video.pause();
  video.removeAttribute('src');
  video.load();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}

async function encodeViaCanvas(
  file: File,
  outW: number,
  outH: number,
  mimeType: string,
  onProgress?: (ratio: number) => void,
): Promise<File | null> {
  const video = await loadVideo(file);
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (duration > 90) {
    revoke(video);
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || typeof canvas.captureStream !== 'function') {
    revoke(video);
    return null;
  }

  const stream = canvas.captureStream(30);
  try {
    if (canCaptureStream(video)) {
      const src = video.captureStream();
      src.getAudioTracks().forEach((track) => {
        stream.addTrack(track);
      });
    }
  } catch {
    /* optional audio */
  }

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: TARGET_BITRATE,
      audioBitsPerSecond: 128_000,
    });
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    revoke(video);
    return null;
  }

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        /* ignore */
      }
      reject(new Error('compress timeout'));
    }, COMPRESS_BUDGET_MS);

    recorder.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('recorder error'));
    };
    recorder.onstop = () => {
      window.clearTimeout(timer);
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    };
  });

  video.currentTime = 0;
  await video.play().catch(() => undefined);
  recorder.start(250);

  let raf = 0;
  const draw = () => {
    try {
      ctx.drawImage(video, 0, 0, outW, outH);
    } catch {
      /* ignore */
    }
    if (duration > 0 && onProgress) {
      onProgress(Math.min(0.99, video.currentTime / duration));
    }
    if (!video.ended && !video.paused) {
      raf = requestAnimationFrame(draw);
    }
  };
  raf = requestAnimationFrame(draw);

  await new Promise<void>((resolve) => {
    if (video.ended) return resolve();
    video.onended = () => resolve();
  });

  cancelAnimationFrame(raf);
  if (recorder.state !== 'inactive') recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  revoke(video);

  const blob = await done;
  onProgress?.(1);
  if (blob.size < 1024) return null;
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  return new File([blob], `soundtok-${Date.now()}.${ext}`, {
    type: blob.type || `video/${ext}`,
  });
}

async function encodeFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<File | null> {
  const mimeType = pickRecorderMime();
  if (!mimeType) return null;

  const probe = await loadVideo(file);
  const vw = probe.videoWidth || 720;
  const vh = probe.videoHeight || 1280;
  const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
  revoke(probe);

  if (duration > 90) return null;

  const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh));
  const outW = Math.max(2, Math.round((vw * scale) / 2) * 2);
  const outH = Math.max(2, Math.round((vh * scale) / 2) * 2);

  // Always canvas-scale — guarantees downscale + audio mix path
  return encodeViaCanvas(file, outW, outH, mimeType, onProgress);
}

/**
 * Returns a PC-friendly webm/mp4 when possible. Falls back to the original
 * only if encoding is unsupported or fails.
 */
export async function prepareSoundTokVideoForUpload(
  file: File,
  opts?: {
    /** true = always try encode; false = never encode; omit = auto for large/MOV */
    force?: boolean;
    signal?: AbortSignal;
    onCompressProgress?: (ratio: number) => void;
  },
): Promise<{ file: File; compressed: boolean }> {
  // Explicit false = in-app recordings — keep mic audio, do not re-encode
  if (opts?.force === false) {
    return { file, compressed: false };
  }

  const force = opts?.force === true || needsForceCompress(file);
  const signal = opts?.signal;

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  };

  throwIfAborted();

  // Tiny already-webm clips from in-app recorder — skip
  if (!force && file.type.includes('webm') && file.size <= 12 * 1024 * 1024) {
    return { file, compressed: false };
  }

  if (!force && file.size <= SOFT_THRESHOLD_BYTES) {
    return { file, compressed: false };
  }

  if (typeof MediaRecorder === 'undefined') {
    return { file, compressed: false };
  }

  try {
    throwIfAborted();
    const encoded = await encodeFile(file, (ratio) => {
      throwIfAborted();
      opts?.onCompressProgress?.(ratio);
    });
    throwIfAborted();
    if (!encoded || encoded.size < 8_000) return { file, compressed: false };
    // Accept encode even if only slightly smaller — streamable webm fixes PC playback
    if (force && encoded.size > 8_000) {
      return { file: encoded, compressed: true };
    }
    if (encoded.size < file.size * 0.95) {
      return { file: encoded, compressed: true };
    }
    if (force) return { file: encoded, compressed: true };
    return { file, compressed: false };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      (error as { name?: string }).name === 'AbortError'
    ) {
      throw error;
    }
    return { file, compressed: false };
  }
}
