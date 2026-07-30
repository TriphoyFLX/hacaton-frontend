import { soundTokApi, type SoundTok } from '../api/soundtok';
import { prepareSoundTokVideoForUpload } from './compressVideoForUpload';

export type SoundTokUploadPhase = 'compress' | 'upload' | 'done' | 'error' | 'cancelled';

export type SoundTokUploadJob = {
  id: string;
  description: string;
  fileName: string;
  soundId?: string;
  phase: SoundTokUploadPhase;
  percent: number;
  error?: string;
  result?: SoundTok;
  createdAt: number;
  consumed?: boolean;
};

type Listener = () => void;

const jobs = new Map<string, SoundTokUploadJob>();
const controllers = new Map<string, AbortController>();
const listeners = new Set<Listener>();
const MAX_BYTES = 50 * 1024 * 1024;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

function patch(id: string, partial: Partial<SoundTokUploadJob>) {
  const prev = jobs.get(id);
  if (!prev) return;
  jobs.set(id, { ...prev, ...partial });
  notify();
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; name?: string; message?: string };
  return (
    e.code === 'ERR_CANCELED' ||
    e.name === 'CanceledError' ||
    e.name === 'AbortError' ||
    /abort|cancel/i.test(e.message || '')
  );
}

export function subscribeSoundTokUploads(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSoundTokUploadJobs(): SoundTokUploadJob[] {
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getActiveSoundTokUploads(): SoundTokUploadJob[] {
  return getSoundTokUploadJobs().filter((j) => j.phase === 'compress' || j.phase === 'upload');
}

export function dismissSoundTokUpload(id: string) {
  controllers.get(id)?.abort();
  controllers.delete(id);
  jobs.delete(id);
  notify();
}

/** Cancel an in-flight compress/upload. */
export function cancelSoundTokUpload(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  if (job.phase !== 'compress' && job.phase !== 'upload') {
    dismissSoundTokUpload(id);
    return;
  }
  controllers.get(id)?.abort();
  controllers.delete(id);
  jobs.set(id, {
    ...job,
    phase: 'cancelled',
    percent: 0,
    error: 'Публикация отменена',
    consumed: false,
  });
  notify();
  window.setTimeout(() => {
    if (jobs.get(id)?.phase === 'cancelled') {
      jobs.delete(id);
      notify();
    }
  }, 2500);
}

/** Take finished jobs once (safe across remounts). */
export function consumeFinishedSoundTokUploads(): {
  done: SoundTok[];
  errors: string[];
  cancelled: string[];
} {
  const done: SoundTok[] = [];
  const errors: string[] = [];
  const cancelled: string[] = [];
  for (const job of jobs.values()) {
    if (job.consumed) continue;
    if (job.phase === 'done' && job.result) {
      job.consumed = true;
      done.push(job.result);
    } else if (job.phase === 'error' && job.error) {
      job.consumed = true;
      errors.push(job.error);
    } else if (job.phase === 'cancelled') {
      job.consumed = true;
      cancelled.push(job.error || 'Публикация отменена');
    }
  }
  return { done, errors, cancelled };
}

export function enqueueSoundTokUpload(opts: {
  description: string;
  file: File;
  soundId?: string;
  /**
   * true = force re-encode (gallery)
   * false = never re-encode (in-app camera — keeps mic audio)
   * omit = auto
   */
  forceCompress?: boolean;
}): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const controller = new AbortController();
  controllers.set(id, controller);
  const skipCompress = opts.forceCompress === false;

  jobs.set(id, {
    id,
    description: opts.description,
    fileName: opts.file.name,
    soundId: opts.soundId,
    phase: skipCompress ? 'upload' : 'compress',
    percent: 0,
    createdAt: Date.now(),
  });
  notify();

  void (async () => {
    try {
      if (opts.file.size > MAX_BYTES) {
        patch(id, {
          phase: 'error',
          error: 'Файл слишком большой — максимум 50 MB',
          percent: 0,
        });
        return;
      }

      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      let uploadFile = opts.file;
      if (!skipCompress) {
        patch(id, { phase: 'compress', percent: 0 });
        try {
          const prepared = await prepareSoundTokVideoForUpload(opts.file, {
            force: opts.forceCompress === true ? true : undefined,
            signal: controller.signal,
            onCompressProgress: (ratio) => {
              if (controller.signal.aborted) return;
              patch(id, { phase: 'compress', percent: Math.round(ratio * 100) });
            },
          });
          if (
            prepared.compressed &&
            prepared.file.size >= 8_000 &&
            prepared.file.size <= MAX_BYTES
          ) {
            uploadFile = prepared.file;
          }
        } catch (compressError) {
          if (isAbortError(compressError) || controller.signal.aborted) {
            throw compressError;
          }
          uploadFile = opts.file;
        }
      }

      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      if (uploadFile.size > MAX_BYTES) {
        patch(id, {
          phase: 'error',
          error: 'Файл слишком большой — максимум 50 MB',
          percent: 0,
        });
        return;
      }

      if (uploadFile.size < 1000) {
        patch(id, {
          phase: 'error',
          error: 'Пустой файл — запишите клип ещё раз',
          percent: 0,
        });
        return;
      }

      patch(id, { phase: 'upload', percent: 0 });
      const created = await soundTokApi.createSoundTok(opts.description, uploadFile, {
        soundId: opts.soundId,
        signal: controller.signal,
        onUploadProgress: ({ loaded, total }) => {
          if (!total || total <= 0 || controller.signal.aborted) return;
          patch(id, {
            phase: 'upload',
            percent: Math.min(100, Math.round((loaded / total) * 100)),
          });
        },
      });

      if (controller.signal.aborted) return;

      controllers.delete(id);
      patch(id, { phase: 'done', percent: 100, result: created });
      window.setTimeout(() => {
        if (jobs.get(id)?.phase === 'done') {
          jobs.delete(id);
          notify();
        }
      }, 4500);
    } catch (error) {
      controllers.delete(id);
      if (isAbortError(error) || controller.signal.aborted) {
        const current = jobs.get(id);
        if (current && current.phase !== 'cancelled') {
          patch(id, {
            phase: 'cancelled',
            error: 'Публикация отменена',
            percent: 0,
          });
          window.setTimeout(() => {
            if (jobs.get(id)?.phase === 'cancelled') {
              jobs.delete(id);
              notify();
            }
          }, 2500);
        }
        return;
      }
      const status = (error as { response?: { status?: number; data?: { error?: string } } })
        ?.response?.status;
      const serverError = (error as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      let message = serverError || 'Не удалось загрузить видео';
      if (status === 413) message = serverError || 'Файл слишком большой — максимум 50 MB';
      if (status === 401) message = 'Сессия истекла — войдите снова';
      if (status === 429) message = 'Слишком много загрузок — подождите немного';
      patch(id, { phase: 'error', error: message, percent: 0 });
    }
  })();

  return id;
}
