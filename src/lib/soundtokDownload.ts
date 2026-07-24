import { resolveMediaUrl } from './mediaUrl';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load watermark logo'));
    img.src = src;
  });
}

function pickRecorderMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

function waitForEvent(target: EventTarget, event: string, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(`Media error while waiting for ${event}`));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, onOk);
      target.removeEventListener('error', onErr);
    };
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener('error', onErr, { once: true });
  });
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  logo: HTMLImageElement
) {
  const pad = Math.max(12, Math.round(Math.min(width, height) * 0.035));
  const logoSize = Math.max(28, Math.round(Math.min(width, height) * 0.075));
  const gap = Math.max(8, Math.round(logoSize * 0.22));
  const fontSize = Math.max(13, Math.round(logoSize * 0.42));
  const x = pad;
  const y = height - pad - logoSize;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 8;
  ctx.drawImage(logo, x, y, logoSize, logoSize);

  ctx.font = `700 ${fontSize}px Syne, system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('SoundLab Studio', x + logoSize + gap, y + logoSize / 2);
  ctx.restore();
}

export type SoundTokDownloadOptions = {
  videoUrl: string;
  /** When the clip uses a borrowed SoundTok sound, pass its audio URL. */
  audioUrl?: string | null;
  filename?: string;
  onProgress?: (ratio: number) => void;
};

/**
 * Re-encodes a SoundTok with a bottom-left SoundLab watermark (logo + "SoundLab Studio").
 * Must be called from a user gesture.
 */
export async function downloadSoundTokWithWatermark(
  opts: SoundTokDownloadOptions
): Promise<void> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Скачивание с водяным знаком не поддерживается в этом браузере');
  }

  const videoSrc = resolveMediaUrl(opts.videoUrl);
  if (!videoSrc) throw new Error('Нет видео для скачивания');

  const externalAudioSrc =
    opts.audioUrl && opts.audioUrl !== opts.videoUrl ? resolveMediaUrl(opts.audioUrl) : null;

  const video = document.createElement('video');
  video.playsInline = true;
  video.preload = 'auto';
  if (!videoSrc.startsWith(window.location.origin) && /^https?:\/\//i.test(videoSrc)) {
    video.crossOrigin = 'anonymous';
  }
  video.src = videoSrc;
  video.muted = Boolean(externalAudioSrc);

  const audio = externalAudioSrc ? document.createElement('audio') : null;
  if (audio && externalAudioSrc) {
    audio.preload = 'auto';
    if (
      !externalAudioSrc.startsWith(window.location.origin) &&
      /^https?:\/\//i.test(externalAudioSrc)
    ) {
      audio.crossOrigin = 'anonymous';
    }
    audio.src = externalAudioSrc;
  }

  await Promise.all([
    waitForEvent(video, 'loadedmetadata'),
    audio ? waitForEvent(audio, 'loadedmetadata') : Promise.resolve(),
  ]);

  const width = Math.max(2, video.videoWidth || 720);
  const height = Math.max(2, video.videoHeight || 1280);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const logo = await loadImage('/icons/icon-192.png');
  const canvasStream = canvas.captureStream(30);

  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio unavailable');

  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();
  const silent = audioCtx.createGain();
  silent.gain.value = 0;
  silent.connect(audioCtx.destination);

  const mediaEl = audio ?? video;
  const sourceNode = audioCtx.createMediaElementSource(mediaEl);
  sourceNode.connect(dest);
  sourceNode.connect(silent);

  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = pickRecorderMime();
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Ошибка записи видео'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' }));
  });

  video.currentTime = 0;
  if (audio) audio.currentTime = 0;
  await audioCtx.resume();
  recorder.start(250);

  let raf = 0;
  let finished = false;

  const finish = async () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    if (recorder.state !== 'inactive') recorder.stop();
    video.pause();
    audio?.pause();
  };

  const tick = () => {
    if (finished) return;
    ctx.drawImage(video, 0, 0, width, height);
    drawWatermark(ctx, width, height, logo);
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (duration > 0) opts.onProgress?.(Math.min(1, video.currentTime / duration));
    if (video.ended) {
      void finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  video.addEventListener(
    'ended',
    () => {
      void finish();
    },
    { once: true }
  );

  await video.play();
  if (audio) {
    try {
      await audio.play();
    } catch {
      // keep going with video frames even if bed audio is blocked
    }
  }
  raf = requestAnimationFrame(tick);

  // Safety timeout: duration + buffer, or 3 minutes max
  const maxMs =
    Number.isFinite(video.duration) && video.duration > 0
      ? Math.min(180_000, Math.ceil(video.duration * 1000) + 4000)
      : 180_000;
  window.setTimeout(() => {
    void finish();
  }, maxMs);

  const blob = await stopped;
  combined.getTracks().forEach((track) => track.stop());
  try {
    await audioCtx.close();
  } catch {
    // ignore
  }

  if (!blob.size) {
    throw new Error('Пустой файл после обработки');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = opts.filename || `soundlab-soundtok-${Date.now()}.webm`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
