import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, FlipHorizontal, Square, Upload } from 'lucide-react';
import { soundsApi, type Sound } from '../api/sounds';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { enqueueSoundTokUpload } from '../lib/soundtokUploadQueue';

const FONT_IMPORT = '';

const MAX_SECONDS = 30;
const MAX_BYTES = 50 * 1024 * 1024;

const css = `
${FONT_IMPORT}

.sr-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: #050505;
  color: #f0ede8;
  font-family: 'Syne', sans-serif;
  display: flex;
  flex-direction: column;
}

.sr-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #000;
  overflow: hidden;
}

.sr-video, .sr-preview {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
}

/* Full-screen look without cropping the live frame (crop = fake zoom) */
.sr-video--bg {
  position: absolute;
  inset: 0;
  object-fit: cover;
  filter: blur(28px) saturate(1.05) brightness(0.55);
  transform: scale(1.12);
  z-index: 0;
}
.sr-video--fg {
  position: absolute;
  inset: 0;
  object-fit: contain;
  z-index: 1;
}
.sr-video--bg.is-mirrored {
  transform: scale(1.12) scaleX(-1);
}
.sr-video--fg.is-mirrored {
  transform: scaleX(-1);
}

.sr-preview {
  object-fit: contain;
}

.sr-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background:
    linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 22%),
    linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 28%);
}

.sr-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: auto;
  z-index: 2;
}

.sr-icon-btn {
  appearance: none;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(10,10,10,0.55);
  color: #f0ede8;
  display: grid;
  place-items: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.sr-sound-chip {
  flex: 1;
  min-width: 0;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(10,10,10,0.55);
  backdrop-filter: blur(10px);
  padding: 6px 12px 6px 6px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sr-sound-chip img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: #1a1a1a;
}
.sr-sound-chip-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sr-sound-chip-author {
  display: block;
  font-size: 10px;
  color: rgba(240,237,232,0.55);
  margin-top: 1px;
}

.sr-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 16px;
  pointer-events: auto;
  z-index: 2;
}

.sr-timer {
  align-self: center;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(240,237,232,0.8);
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 999px;
  padding: 6px 12px;
}

.sr-timer.live {
  color: #ff6b6b;
  border-color: rgba(255,107,107,0.35);
}

.sr-controls {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}

.sr-side {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.sr-zoom {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 16px;
  background: rgba(10,10,10,0.55);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
}
.sr-zoom label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: rgba(240,237,232,0.7);
  letter-spacing: 0.06em;
}
.sr-zoom input[type='range'] {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 28px;
  height: 120px;
  accent-color: #f0ede8;
  cursor: pointer;
}

.sr-rec {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.85);
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  appearance: none;
  transition: transform 0.15s;
}
.sr-rec:active { transform: scale(0.96); }
.sr-rec-inner {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #ff3b5c;
  transition: border-radius 0.15s, width 0.15s, height 0.15s;
}
.sr-rec.recording .sr-rec-inner {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #ff3b5c;
}

.sr-progress {
  height: 3px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
}
.sr-progress > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #e8b4d8, #9b7fd4);
  width: 0%;
}

.sr-form {
  background: #0d0d0d;
  border-top: 1px solid #1f1f1f;
  padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sr-input {
  width: 100%;
  appearance: none;
  border: 1px solid #2a2a2a;
  background: #141414;
  color: #f0ede8;
  border-radius: 12px;
  padding: 12px 14px;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  resize: none;
  min-height: 72px;
}
.sr-input:focus {
  outline: none;
  border-color: #4a4a4a;
}

.sr-publish {
  appearance: none;
  border: none;
  border-radius: 14px;
  padding: 14px 16px;
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #f0ede8, #d9d2c8);
  color: #111;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.sr-publish:disabled {
  opacity: 0.55;
  cursor: wait;
}

.sr-error {
  color: #ff8a8a;
  font-size: 13px;
  text-align: center;
  padding: 0 16px 8px;
}

.sr-hint {
  text-align: center;
  font-size: 13px;
  color: rgba(240,237,232,0.65);
}
`;

function pickRecorderMime(withAudio: boolean): string | undefined {
  const candidates = withAudio
    ? [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/mp4',
        'video/webm',
      ]
    : [
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm',
        'video/mp4',
      ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

export default function SoundRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const freeMode = !id;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoBgRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const mixCtxRef = useRef<AudioContext | null>(null);
  const mixSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mixedTrackRef = useRef<MediaStreamTrack | null>(null);
  const mixBedRef = useRef<HTMLAudioElement | null>(null);

  const [sound, setSound] = useState<Sound | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState<{ min: number; max: number; step: number } | null>(null);

  const maxSeconds = Math.max(
    1,
    Math.min(
      MAX_SECONDS,
      !freeMode && Number.isFinite(Number(sound?.duration)) && Number(sound?.duration) > 0
        ? Number(sound?.duration)
        : MAX_SECONDS
    )
  );
  const progress = Math.min(100, (elapsed / maxSeconds) * 100);

  const teardownSoundMix = useCallback(() => {
    const stream = streamRef.current;
    const mixed = mixedTrackRef.current;
    if (stream && mixed) {
      try {
        stream.removeTrack(mixed);
      } catch {
        /* ignore */
      }
    }
    try {
      mixed?.stop();
    } catch {
      /* ignore */
    }
    mixedTrackRef.current = null;
    mixSourceRef.current = null;
    const bed = mixBedRef.current;
    mixBedRef.current = null;
    if (bed) {
      try {
        bed.pause();
        bed.removeAttribute('src');
        bed.load();
      } catch {
        /* ignore */
      }
    }
    const ctx = mixCtxRef.current;
    mixCtxRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => undefined);
    }
  }, []);

  const stopStream = useCallback(() => {
    teardownSoundMix();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setZoomCaps(null);
  }, [teardownSoundMix]);

  const forceNormalZoom = useCallback(async (track: MediaStreamTrack) => {
    const caps = track.getCapabilities?.() as {
      zoom?: { min: number; max: number; step?: number };
    };
    const reportedMin =
      caps?.zoom && Number.isFinite(Number(caps.zoom.min)) ? Number(caps.zoom.min) : null;
    const reportedMax =
      caps?.zoom && Number.isFinite(Number(caps.zoom.max)) ? Number(caps.zoom.max) : null;
    const step =
      caps?.zoom?.step && caps.zoom.step > 0 ? caps.zoom.step : 0.05;

    // Prefer optical 1× (same feel as desktop webcam), not ultra-wide / tele.
    const candidates: number[] = [];
    for (const v of [1, 1.0, 1.1, 1.2, 0.9]) {
      if (reportedMin != null && v + 0.001 < reportedMin) continue;
      if (reportedMax != null && v - 0.001 > reportedMax) continue;
      candidates.push(v);
    }
    if (reportedMin != null && reportedMax != null) {
      // Fallback: clamp 1 into range, else mid of range closest to 1
      const clamped = Math.min(reportedMax, Math.max(reportedMin, 1));
      candidates.unshift(clamped);
    }

    const unique = [...new Set(candidates.map((v) => Math.round(v * 1000) / 1000))];

    let applied: number | null = null;
    for (const z of unique) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: z } as never] });
        const after = track.getSettings?.() as { zoom?: number };
        applied = typeof after?.zoom === 'number' ? after.zoom : z;
        break;
      } catch {
        try {
          await track.applyConstraints({ zoom: z } as never);
          const after = track.getSettings?.() as { zoom?: number };
          applied = typeof after?.zoom === 'number' ? after.zoom : z;
          break;
        } catch {
          /* try next */
        }
      }
    }

    if (caps?.zoom && reportedMin != null && reportedMax != null && reportedMax > reportedMin) {
      setZoomCaps({ min: reportedMin, max: reportedMax, step });
    } else if (applied != null && reportedMax != null && reportedMax > applied) {
      setZoomCaps({ min: reportedMin ?? applied, max: reportedMax, step });
    } else {
      setZoomCaps(null);
    }

    setZoom(applied ?? 1);
    return applied;
  }, []);

  const syncZoomCaps = useCallback(
    async (stream: MediaStream) => {
      const track = stream.getVideoTracks()[0];
      if (!track) {
        setZoomCaps(null);
        return;
      }
      await forceNormalZoom(track);
      // Some phones reset zoom after play — pin 1× again
      window.setTimeout(() => {
        if (streamRef.current?.getVideoTracks()[0] === track) {
          void forceNormalZoom(track);
        }
      }, 120);
      window.setTimeout(() => {
        if (streamRef.current?.getVideoTracks()[0] === track) {
          void forceNormalZoom(track);
        }
      }, 400);
    },
    [forceNormalZoom],
  );

  const applyZoom = useCallback(async (value: number) => {
    setZoom(value);
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value } as never] });
    } catch {
      try {
        await track.applyConstraints({ zoom: value } as never);
      } catch {
        /* zoom unsupported */
      }
    }
  }, []);

  const pickMainCameraDeviceId = async (mode: 'user' | 'environment') => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      if (cams.length === 0) return undefined;

      const scored = cams.map((cam) => {
        const label = (cam.label || '').toLowerCase();
        let score = 0;
        if (mode === 'user') {
          if (/front|user|face|selfie/i.test(label)) score += 5;
          if (/back|rear|environment/i.test(label)) score -= 5;
        } else {
          if (/back|rear|environment/i.test(label)) score += 5;
          if (/front|user|face|selfie/i.test(label)) score -= 5;
        }
        // Prefer main / 1× lens — same framing as desktop, not ultra-wide or tele
        if (/main|wide(?!.*ultra)|camera 0|задняя|основн/i.test(label)) score += 6;
        if (/ultra|uw|0\.5|0,5|широкий|fisheye/i.test(label)) score -= 10;
        if (/tele|zoom|перископ|теле|2x|3x|5x/i.test(label)) score -= 10;
        return { id: cam.deviceId, score, label };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best && best.score > 0 && best.id) return best.id;
    } catch {
      /* ignore */
    }
    return undefined;
  };

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    stopStream();
    setError(null);
    try {
      // Unlock device labels (needed to pick the main lens)
      try {
        const warm = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: mode } },
        });
        warm.getTracks().forEach((t) => t.stop());
      } catch {
        /* continue */
      }

      const mainId = await pickMainCameraDeviceId(mode);

      // Vertical 9:16 like desktop record stage; normal 1× zoom (not cropped tele)
      const videoConstraints: MediaTrackConstraints = mainId
        ? {
            deviceId: { exact: mainId },
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: { ideal: 9 / 16 },
          }
        : {
            facingMode: { ideal: mode },
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: { ideal: 9 / 16 },
          };

      try {
        Object.assign(videoConstraints, { zoom: { ideal: 1 } });
      } catch {
        /* ignore */
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: freeMode
            ? {
                echoCancellation: true,
                noiseSuppression: true,
              }
            : false,
          video: videoConstraints,
        });
      } catch {
        // Fallback without deviceId / zoom
        stream = await navigator.mediaDevices.getUserMedia({
          audio: freeMode
            ? {
                echoCancellation: true,
                noiseSuppression: true,
              }
            : false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: { ideal: 9 / 16 },
          },
        });
      }

      streamRef.current = stream;
      const attach = async (el: HTMLVideoElement | null) => {
        if (!el) return;
        el.srcObject = stream;
        await el.play().catch(() => undefined);
      };
      await Promise.all([attach(videoRef.current), attach(videoBgRef.current)]);
      await syncZoomCaps(stream);
      setCameraReady(true);
    } catch {
      setError(
        freeMode
          ? 'Нет доступа к камере/микрофону. Разрешите съёмку в браузере.'
          : 'Нет доступа к камере. Разрешите съёмку в браузере.',
      );
      setCameraReady(false);
    }
  }, [stopStream, freeMode, syncZoomCaps]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await soundsApi.getSound(id);
        setSound(data);
      } catch {
        setError('Звук не найден');
      }
    })();
  }, [id]);

  useEffect(() => {
    void startCamera(facing);
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount + facing via flip
  }, []);

  useEffect(() => {
    if (!previewUrl || !previewRef.current) return;
    const el = previewRef.current;
    el.src = previewUrl;
    el.muted = false;
    el.volume = 1;
    void el.play().catch(() => {
      // Autoplay with sound may be blocked — keep controls via tap on video
      el.controls = true;
    });
  }, [previewUrl]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    recorderRef.current = null;
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.pause();
      audio.currentTime = 0;
    }
    teardownSoundMix();
  }, [teardownSoundMix]);

  const startRecording = async () => {
    if (!streamRef.current || recording) return;
    if (!freeMode && !sound) return;
    setError(null);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    chunksRef.current = [];

    // Free mode must keep a live mic track in the recorded file
    if (freeMode) {
      const liveAudio = streamRef.current.getAudioTracks().filter((t) => t.readyState === 'live');
      if (liveAudio.length === 0) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
            video: false,
          });
          mic.getAudioTracks().forEach((track) => {
            track.enabled = true;
            streamRef.current?.addTrack(track);
          });
        } catch {
          setError('Нет доступа к микрофону — разрешите звук для записи');
          return;
        }
      } else {
        liveAudio.forEach((t) => {
          t.enabled = true;
        });
      }
    } else {
      // Remix: bake the chosen soundtrack into the recording so playback
      // doesn't depend on a fragile separate <audio> bed after publish.
      teardownSoundMix();
      const soundUrl = resolveMediaUrl(sound?.audioUrl);
      if (soundUrl && streamRef.current) {
        try {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AC();
          mixCtxRef.current = ctx;
          if (ctx.state === 'suspended') await ctx.resume();
          const bed = new Audio();
          bed.crossOrigin = 'anonymous';
          bed.preload = 'auto';
          bed.src = soundUrl;
          mixBedRef.current = bed;
          await new Promise<void>((resolve, reject) => {
            const onReady = () => {
              bed.removeEventListener('canplay', onReady);
              bed.removeEventListener('error', onErr);
              resolve();
            };
            const onErr = () => {
              bed.removeEventListener('canplay', onReady);
              bed.removeEventListener('error', onErr);
              reject(new Error('sound load failed'));
            };
            bed.addEventListener('canplay', onReady);
            bed.addEventListener('error', onErr);
            bed.load();
          });
          const src = ctx.createMediaElementSource(bed);
          mixSourceRef.current = src;
          const dest = ctx.createMediaStreamDestination();
          src.connect(dest);
          src.connect(ctx.destination);
          const track = dest.stream.getAudioTracks()[0];
          if (track) {
            mixedTrackRef.current = track;
            streamRef.current.addTrack(track);
          }
        } catch {
          // Fall back to preview-only soundtrack (legacy silent video + bed)
          teardownSoundMix();
        }
      }
    }

    const withAudio = (streamRef.current?.getAudioTracks().length ?? 0) > 0;
    if (freeMode && !withAudio) {
      setError('Микрофон недоступен — звук не запишется');
      return;
    }

    const mimeType = pickRecorderMime(withAudio);
    let recorder: MediaRecorder;
    try {
      if (mimeType) {
        const recOpts: MediaRecorderOptions = {
          mimeType,
          videoBitsPerSecond: 2_500_000,
        };
        if (withAudio) recOpts.audioBitsPerSecond = 128_000;
        recorder = new MediaRecorder(streamRef.current, recOpts);
      } else {
        recorder = new MediaRecorder(streamRef.current);
      }
    } catch {
      setError('Запись видео не поддерживается в этом браузере');
      return;
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'video/webm';
      const fileBlob = new Blob(chunksRef.current, { type });
      if (fileBlob.size < 1000) {
        setError('Клип пустой — попробуйте записать ещё раз');
        setBlob(null);
        return;
      }
      setBlob(fileBlob);
      const url = URL.createObjectURL(fileBlob);
      setPreviewUrl(url);
    };

    recorderRef.current = recorder;
    // One continuous blob — timeslices create VFR/timestamp mess that plays as stutter.
    recorder.start();
    setRecording(true);
    startedAtRef.current = Date.now();
    setElapsed(0);

    const limit =
      !freeMode && Number.isFinite(Number(sound?.duration)) && Number(sound?.duration) > 0
        ? Math.min(MAX_SECONDS, Number(sound?.duration))
        : MAX_SECONDS;

    const audio = audioRef.current;
    if (!freeMode) {
      const mixedBed = mixBedRef.current;
      if (mixedBed) {
        mixedBed.onended = () => {
          stopRecording();
        };
        mixedBed.currentTime = 0;
        void mixedBed.play().catch(() => undefined);
      } else if (audio) {
        audio.onended = () => {
          stopRecording();
        };
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
    }

    timerRef.current = window.setInterval(() => {
      const sec = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(sec);
      if (sec >= limit) {
        stopRecording();
      }
    }, 100);
  };

  const flipCamera = async () => {
    if (recording) return;
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    await startCamera(next);
  };

  const retake = async () => {
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setElapsed(0);
    await startCamera(facing);
  };

  const publish = () => {
    if (!blob || uploading) return;
    if (!freeMode && !sound) return;
    if (blob.size < 1000) {
      setError('Клип пустой — запишите ещё раз');
      return;
    }
    if (blob.size > MAX_BYTES) {
      setError('Файл слишком большой — максимум 50 MB. Снимите короче.');
      return;
    }
    setUploading(true);
    setError(null);
    // Normalize phone recorder MIME (Android often sends video/x-matroska)
    const rawType = (blob.type || '').toLowerCase().split(';')[0].trim();
    const isMp4 =
      rawType.includes('mp4') ||
      rawType.includes('quicktime') ||
      rawType.includes('m4v') ||
      rawType.includes('3gpp');
    const ext = isMp4 ? 'mp4' : 'webm';
    const mime = isMp4 ? 'video/mp4' : 'video/webm';
    const file = new File([blob], `soundtok-${Date.now()}.${ext}`, { type: mime });
    // Never re-encode camera clips — keeps microphone audio intact
    enqueueSoundTokUpload({
      description: description.trim() || (sound?.title ?? 'Мой SoundTok'),
      file,
      soundId: sound?.id,
      forceCompress: false,
    });
    stopStream();
    navigate('/soundtok', { replace: true });
  };

  return (
    <div className="sr-root">
      <style>{css}</style>
      <div className="sr-stage">
        {previewUrl ? (
          <video
            ref={previewRef}
            className="sr-preview"
            playsInline
            disablePictureInPicture
            loop
            // Play with sound so user can check mic was recorded
            muted={false}
            onClick={(e) => {
              const v = e.currentTarget;
              if (v.paused) void v.play().catch(() => undefined);
            }}
          />
        ) : (
          <>
            <video
              ref={videoBgRef}
              className={`sr-video sr-video--bg${facing === 'user' ? ' is-mirrored' : ''}`}
              playsInline
              disablePictureInPicture
              muted
              autoPlay
              aria-hidden
            />
            <video
              ref={videoRef}
              className={`sr-video sr-video--fg${facing === 'user' ? ' is-mirrored' : ''}`}
              playsInline
              disablePictureInPicture
              muted
              autoPlay
            />
          </>
        )}
        <div className="sr-hud" />

        <div className="sr-top">
          <button
            type="button"
            className="sr-icon-btn"
            onClick={() => {
              stopRecording();
              stopStream();
              navigate(-1);
            }}
            aria-label="Назад"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="sr-sound-chip">
            {!freeMode && resolveMediaUrl(sound?.author?.avatar) ? (
              <img src={resolveMediaUrl(sound?.author?.avatar) || ''} alt="" />
            ) : null}
            <div className="sr-sound-chip-text">
              {freeMode
                ? 'Свой клип'
                : sound?.title || 'Загрузка звука…'}
              {freeMode ? (
                <span className="sr-sound-chip-author">Камера + микрофон</span>
              ) : sound?.author?.username ? (
                <span className="sr-sound-chip-author">@{sound.author.username}</span>
              ) : null}
            </div>
          </div>
          {!previewUrl && (
            <button
              type="button"
              className="sr-icon-btn"
              onClick={() => void flipCamera()}
              aria-label="Перевернуть камеру"
              disabled={recording}
            >
              <FlipHorizontal size={18} />
            </button>
          )}
        </div>

        {!previewUrl && zoomCaps && (
          <div className="sr-zoom">
            <label htmlFor="sr-zoom-range">{zoom.toFixed(1)}×</label>
            <input
              id="sr-zoom-range"
              type="range"
              min={zoomCaps.min}
              max={zoomCaps.max}
              step={zoomCaps.step}
              value={zoom}
              disabled={recording}
              onChange={(e) => void applyZoom(Number(e.target.value))}
              aria-label="Зум камеры"
            />
          </div>
        )}

        {!previewUrl && (
          <div className="sr-bottom">
            <div className={`sr-timer ${recording ? 'live' : ''}`}>
              {recording ? 'REC ' : ''}
              {Math.min(maxSeconds, Math.floor(elapsed)).toString().padStart(2, '0')}s /{' '}
              {Math.ceil(maxSeconds).toString().padStart(2, '0')}s
            </div>
            <div className="sr-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="sr-controls">
              <div className="sr-side" />
              <button
                type="button"
                className={`sr-rec ${recording ? 'recording' : ''}`}
                onClick={() => {
                  if (recording) stopRecording();
                  else void startRecording();
                }}
                disabled={!cameraReady || (!freeMode && !sound)}
                aria-label={recording ? 'Стоп' : 'Запись'}
              >
                <span className="sr-rec-inner" />
              </button>
              <div className="sr-side">
                {recording ? <Square size={18} color="rgba(255,255,255,0.5)" /> : <Camera size={18} color="rgba(255,255,255,0.5)" />}
              </div>
            </div>
            <div className="sr-hint">
              {freeMode
                ? 'Со звуком микрофона · весь кадр · мин. зум'
                : 'Звук пишется в клип · весь кадр · мин. зум'}
            </div>
          </div>
        )}
      </div>

      {!freeMode && sound && (
        <audio ref={audioRef} src={resolveMediaUrl(sound.audioUrl) || undefined} preload="auto" />
      )}

      {error && <div className="sr-error">{error}</div>}

      {previewUrl && (
        <div className="sr-form">
          <textarea
            className="sr-input"
            placeholder="Описание (необязательно)"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="button" className="sr-publish" disabled={uploading} onClick={() => publish()}>
            <Upload size={16} />
            Выложить в фоне
          </button>
          <button
            type="button"
            className="sr-publish"
            style={{ background: 'transparent', color: '#c5c0b8', border: '1px solid #2a2a2a' }}
            disabled={uploading}
            onClick={() => void retake()}
          >
            Переснять
          </button>
        </div>
      )}
    </div>
  );
}
