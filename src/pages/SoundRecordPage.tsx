import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, FlipHorizontal, Square, Upload } from 'lucide-react';
import { soundsApi, type Sound } from '../api/sounds';
import { soundTokApi } from '../api/soundtok';
import { resolveMediaUrl } from '../lib/mediaUrl';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const MAX_SECONDS = 30;
const MAX_BYTES = 15 * 1024 * 1024;

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
  object-fit: cover;
  display: block;
  background: #000;
}

.sr-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
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
  padding: 8px 14px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

function pickRecorderMime(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

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

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    stopStream();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch {
      setError('Нет доступа к камере. Разрешите съёмку в браузере.');
      setCameraReady(false);
    }
  }, [stopStream]);

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
    previewRef.current.src = previewUrl;
    void previewRef.current.play().catch(() => undefined);
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
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const startRecording = async () => {
    if (!streamRef.current || recording || !sound) return;
    setError(null);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    chunksRef.current = [];

    const mimeType = pickRecorderMime();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 2_500_000 })
        : new MediaRecorder(streamRef.current);
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
      setBlob(fileBlob);
      const url = URL.createObjectURL(fileBlob);
      setPreviewUrl(url);
    };

    recorderRef.current = recorder;
    recorder.start(200);
    setRecording(true);
    startedAtRef.current = Date.now();
    setElapsed(0);

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }

    timerRef.current = window.setInterval(() => {
      const sec = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(sec);
      if (sec >= MAX_SECONDS) {
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

  const publish = async () => {
    if (!blob || !sound || uploading) return;
    if (blob.size > MAX_BYTES) {
      setError('Файл слишком большой — максимум 15 MB. Снимите короче.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `soundtok-${Date.now()}.${ext}`, { type: blob.type || `video/${ext}` });
      await soundTokApi.createSoundTok(description.trim() || sound.title, file, { soundId: sound.id });
      navigate('/soundtok', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 413) setError(msg || 'Файл слишком большой — максимум 15 MB');
      else if (status === 401) setError('Сессия истекла — войдите снова');
      else setError(msg || 'Не удалось опубликовать');
    } finally {
      setUploading(false);
    }
  };

  const progress = Math.min(100, (elapsed / MAX_SECONDS) * 100);

  return (
    <div className="sr-root">
      <style>{css}</style>
      <div className="sr-stage">
        {previewUrl ? (
          <video ref={previewRef} className="sr-preview" playsInline loop muted />
        ) : (
          <video
            ref={videoRef}
            className="sr-video"
            playsInline
            muted
            autoPlay
            style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
          />
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
          <div className="sr-sound-chip">{sound?.title || 'Загрузка звука…'}</div>
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

        {!previewUrl && (
          <div className="sr-bottom">
            <div className={`sr-timer ${recording ? 'live' : ''}`}>
              {recording ? 'REC ' : ''}
              {Math.min(MAX_SECONDS, Math.floor(elapsed)).toString().padStart(2, '0')}s / {MAX_SECONDS}s
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
                disabled={!cameraReady || !sound}
                aria-label={recording ? 'Стоп' : 'Запись'}
              >
                <span className="sr-rec-inner" />
              </button>
              <div className="sr-side">
                {recording ? <Square size={18} color="rgba(255,255,255,0.5)" /> : <Camera size={18} color="rgba(255,255,255,0.5)" />}
              </div>
            </div>
            <div className="sr-hint">Звук играет во время съёмки — видео без микрофона</div>
          </div>
        )}
      </div>

      {sound && (
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
          <button type="button" className="sr-publish" disabled={uploading} onClick={() => void publish()}>
            <Upload size={16} />
            {uploading ? 'Публикация…' : 'Выложить'}
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
