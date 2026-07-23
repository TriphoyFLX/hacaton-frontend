import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoFeed from '../components/VideoFeed';
import { SoundTok, soundTokApi } from '../api/soundtok';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const css = `
${FONT_IMPORT}

.st-root {
  --bg: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --bg-hover: #141414;
  --border: #1a1a1a;
  --border-mid: #232323;
  --border-hover: #2e2e2e;
  --text-primary: #f0ede8;
  --text-secondary: #c5c0b8;
  --text-muted: #5a5a5a;
  --text-faint: #2e2e2e;
  --accent: #f0ede8;
  --accent-dim: #c5c0b8;
  --purple: #9b7fd4;
  --purple-dim: #1e1530;
  --pink: #e8b4d8;
  --pink-dim: #2a1f3a;
  --green: #4a8c4a;
  --green-dim: #0f1a0f;
  --red: #c0392b;
  --red-dim: #1a0f0f;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text-primary);
}

.st-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── HEADER ── */
.st-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.st-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.st-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--purple), var(--pink));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.st-logo svg {
  width: 18px;
  height: 18px;
  color: var(--text-primary);
  stroke-width: 2;
}

.st-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.st-subtitle {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-top: 2px;
}

.st-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.st-count {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 6px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 6px;
}

/* ── BUTTONS ── */
.st-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  font-weight: 500;
}

.st-btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  stroke-width: 1.8;
}

.st-btn-primary {
  background: var(--text-primary);
  border-color: var(--text-primary);
  color: #0a0a0a;
}

.st-btn-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
  transform: translateY(-1px);
}

.st-btn-ghost {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);
}

.st-btn-ghost:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}

.st-btn-gradient {
  background: linear-gradient(135deg, var(--purple), var(--pink));
  border-color: transparent;
  color: var(--text-primary);
}

.st-btn-gradient:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(155, 127, 212, 0.15);
}

.st-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* ── EMPTY STATE ── */
.st-empty {
  position: relative;
  overflow: hidden;
  min-height: 420px;
  border: 1px solid var(--border-mid);
  border-radius: 20px;
  padding: 56px 24px 40px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(155, 127, 212, 0.20), transparent 42%),
    linear-gradient(145deg, #15121d, var(--bg-surface) 58%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.st-empty-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, var(--purple), var(--pink));
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  box-shadow: 0 16px 40px rgba(155, 127, 212, 0.28);
  transform: rotate(-5deg);
}

.st-empty-icon svg {
  width: 30px;
  height: 30px;
}

.st-empty-title {
  max-width: 430px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.04em;
  margin-bottom: 10px;
}

.st-empty-desc {
  font-family: 'DM Mono', monospace;
  max-width: 390px;
  font-size: 11px;
  line-height: 1.65;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
  margin: 0 0 24px;
}

.st-empty-hint {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 14px 0 0;
}

.st-empty-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 28px;
}

.st-empty-step {
  min-width: 104px;
  padding: 10px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.03em;
}

.st-empty-step strong {
  display: block;
  margin-bottom: 3px;
  color: var(--pink);
  font-size: 10px;
}

@media (max-width: 768px) {
  .st-wrapper {
    padding-top: 20px;
  }

  .st-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
  }

  .st-header-left {
    gap: 12px;
  }

  .st-title {
    font-size: 22px;
  }

  .st-logo {
    width: 36px;
    height: 36px;
  }

  .st-empty {
    min-height: calc(100dvh - var(--app-bottom-nav) - 174px);
    padding: 36px 18px 28px;
    border-radius: 16px;
  }

  .st-empty-title {
    font-size: 24px;
    line-height: 1.12;
  }

  .st-empty-desc {
    font-size: 10px;
  }

  .st-empty-steps {
    width: 100%;
    gap: 6px;
  }

  .st-empty-step {
    min-width: 0;
    flex: 1;
    padding: 9px 4px;
    font-size: 8px;
  }
}

/* ── MODAL ── */
.st-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(8px);
  animation: st-fade-in 0.2s ease;
}

@keyframes st-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.st-modal {
  background:
    radial-gradient(circle at 12% 0%, rgba(155, 127, 212, 0.15), transparent 35%),
    var(--bg-surface);
  border: 1px solid var(--border-hover);
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  padding: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  animation: st-scale-in 0.2s ease;
}

@keyframes st-scale-in {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.st-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.st-modal-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.035em;
}

.st-modal-subtitle {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 4px;
  letter-spacing: 0.07em;
}

.st-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-muted);
}

.st-modal-close:hover {
  border-color: var(--border-hover);
  background: var(--bg-hover);
  color: var(--text-primary);
}

.st-modal-close svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.5;
}

/* ── FORM ── */
.st-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.st-field {
  display: flex;
  flex-direction: column;
}

.st-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.st-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  border-radius: 12px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 13px 14px;
  resize: none;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.st-textarea:focus {
  border-color: var(--purple);
  box-shadow: 0 0 0 1px var(--purple-dim);
}

.st-textarea::placeholder {
  color: var(--text-muted);
}

.st-file-upload {
  position: relative;
}

.st-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.st-file-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 176px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px dashed var(--border-hover);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.st-file-label:hover {
  border-color: var(--purple);
  background: rgba(155, 127, 212, 0.08);
}

.st-file-label.has-file {
  border-style: solid;
  border-color: var(--purple);
  background: rgba(155, 127, 212, 0.08);
}

.st-file-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--purple), var(--pink));
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-primary);
  box-shadow: 0 10px 28px rgba(155, 127, 212, 0.2);
}

.st-file-icon svg {
  width: 22px;
  height: 22px;
}

.st-file-info {
  flex: 1;
  min-width: 0;
}

.st-file-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.st-file-hint {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.st-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.st-actions .st-btn {
  min-height: 46px;
  flex: 1;
  justify-content: center;
}

.st-upload-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(155, 127, 212, 0.1);
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.04em;
}

.st-upload-progress::before {
  content: '✓';
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 50%;
  background: var(--purple);
  color: #fff;
  font-size: 10px;
}

/* ── LOADING ── */
.st-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.st-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: st-spin 0.8s linear infinite;
}

@keyframes st-spin {
  to { transform: rotate(360deg); }
}

.st-loading-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ── FAB ── */
.st-root--feed {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #0a0a0a;
}

.st-feed-mode {
  position: absolute;
  inset: 0;
  background: #0a0a0a;
}

.st-fab {
  position: absolute;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: 52px;
  height: 52px;
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 50;
  color: #0a0a0a;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.st-feed-mode .st-fab {
  z-index: 30;
}

.st-fab:hover {
  transform: translateX(-50%) scale(1.06);
  background: var(--accent-dim);
  border-color: var(--accent-dim);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.st-fab svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

/* ── TOAST ── */
.st-toast {
  position: fixed;
  bottom: calc(var(--app-bottom-nav) + 16px);
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  z-index: 60;
  animation: st-toast-in 0.3s ease;
}

@keyframes st-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 768px) {
  .st-header {
    flex-direction: column;
    gap: 16px;
    margin-bottom: 28px;
  }

  .st-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .st-fab {
    left: auto;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    transform: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--purple), var(--pink));
    border-color: transparent;
    color: #fff;
  }

  .st-fab:hover {
    transform: scale(1.06);
  }

  .st-overlay {
    align-items: center;
    padding: 16px;
    padding-bottom: calc(var(--app-bottom-nav) + 16px);
  }

  .st-modal {
    max-height: calc(100dvh - var(--app-bottom-nav) - 32px);
    overflow-y: auto;
    padding: 18px;
    border-radius: 16px;
  }

  .st-textarea {
    font-size: 16px;
  }

  .st-file-label {
    flex-direction: row;
    min-height: 112px;
    padding: 14px;
    text-align: left;
  }

  .st-file-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
  }

  .st-file-icon svg {
    width: 18px;
    height: 18px;
  }

  .st-file-name {
    font-size: 12px;
  }
}

.st-toast-success {
  background: var(--green-dim);
  border: 1px solid var(--green);
  color: var(--green);
}

.st-toast-error {
  background: var(--red-dim);
  border: 1px solid var(--red);
  color: var(--red);
}
`;

// ── ICONS ──
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l2 7h7l-5.5 4 2.5 7-6-4.5L6 21l2.5-7L3 10h7z" />
  </svg>
);

export default function SoundTok() {
  const [searchParams] = useSearchParams();
  const [soundToks, setSoundToks] = useState<SoundTok[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const PAGE_SIZE = 20;

  const sharedVideoId = searchParams.get('v');

  const orderedSoundToks = useMemo(() => {
    if (!sharedVideoId || soundToks.length === 0) return soundToks;
    const index = soundToks.findIndex((tok) => tok.id === sharedVideoId);
    if (index <= 0) return soundToks;
    const selected = soundToks[index];
    return [selected, ...soundToks.slice(0, index), ...soundToks.slice(index + 1)];
  }, [soundToks, sharedVideoId]);

  const initialIndex = 0;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSoundToks = async () => {
    try {
      const data = await soundTokApi.getSoundToks({ limit: PAGE_SIZE, offset: 0 });
      setSoundToks(data.items);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error('Failed to fetch SoundToks:', error);
      showToast('Не удалось загрузить видео', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSoundToks = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await soundTokApi.getSoundToks({
        limit: PAGE_SIZE,
        offset: soundToks.length,
      });
      setSoundToks((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...data.items.filter((t) => !seen.has(t.id))];
      });
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error('Failed to load more SoundToks:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, soundToks.length]);

  useEffect(() => {
    fetchSoundToks();
  }, []);

  const handleLike = async (id: string) => {
    const soundTok = soundToks.find(tok => tok.id === id);
    if (!soundTok) return;

    const wasLiked = !!soundTok.isLiked;

    setSoundToks(prev =>
      prev.map(tok => {
        if (tok.id === id) {
          return {
            ...tok,
            likes: wasLiked ? Math.max(0, tok.likes - 1) : tok.likes + 1,
            isLiked: !wasLiked
          };
        }
        return tok;
      })
    );

    try {
      if (wasLiked) {
        await soundTokApi.unlikeSoundTok(id);
      } else {
        await soundTokApi.likeSoundTok(id);
      }
    } catch (error) {
      setSoundToks(prev =>
        prev.map(tok => {
          if (tok.id === id) {
            return {
              ...tok,
              likes: wasLiked ? tok.likes + 1 : Math.max(0, tok.likes - 1),
              isLiked: wasLiked
            };
          }
          return tok;
        })
      );
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        showToast('Сессия истекла — войдите снова', 'error');
      } else {
        showToast(wasLiked ? 'Не удалось убрать лайк' : 'Не удалось поставить лайк', 'error');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    const maxBytes = 15 * 1024 * 1024;
    if (videoFile.size > maxBytes) {
      showToast('Файл слишком большой — максимум 15 MB', 'error');
      return;
    }

    setUploading(true);
    try {
      await soundTokApi.createSoundTok(description, videoFile);
      setDescription('');
      setVideoFile(null);
      setShowUpload(false);
      await fetchSoundToks();
      showToast('Видео опубликовано!', 'success');
    } catch (error) {
      console.error('Failed to upload:', error);
      const status = (error as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
      const serverError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 413) {
        showToast(serverError || 'Файл слишком большой — максимум 15 MB', 'error');
      } else if (status === 401) {
        showToast('Сессия истекла — войдите снова', 'error');
      } else {
        showToast(serverError || 'Не удалось загрузить видео', 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="st-root">
        <style>{css}</style>
        <div className="st-loading">
          <div className="st-spinner" />
          <span className="st-loading-text">Загрузка видео...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`st-root ${soundToks.length > 0 ? 'st-root--feed' : ''}`}>
      <style>{css}</style>

      {/* Toast notifications */}
      {toast && (
        <div className={`st-toast st-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Empty state */}
      {soundToks.length === 0 ? (
        <div className="st-wrapper">
          <div className="st-header">
            <div className="st-header-left">
              <div className="st-logo">
                <IconPlay />
              </div>
              <div>
                <h1 className="st-title">SoundTok</h1>
                <div className="st-subtitle">Короткие музыкальные видео</div>
              </div>
            </div>
            <div className="st-header-right">
              <div className="st-count">0 видео</div>
              <button className="st-btn st-btn-gradient" onClick={() => setShowUpload(true)}>
                <IconPlus />
                Создать
              </button>
            </div>
          </div>

          <div className="st-empty">
            <div className="st-empty-icon">
              <IconPlay />
            </div>
            <div className="st-empty-title">Запусти свой первый музыкальный клип</div>
            <div className="st-empty-desc">
              Поделись треком, покажи процесс создания или собери первые реакции от сообщества.
            </div>
            <button className="st-btn st-btn-gradient" onClick={() => setShowUpload(true)}>
              <IconUpload />
              Опубликовать видео
            </button>
            <div className="st-empty-hint">MP4 · MOV · WebM</div>
            <div className="st-empty-steps" aria-label="Как начать">
              <div className="st-empty-step"><strong>01</strong>Выбери клип</div>
              <div className="st-empty-step"><strong>02</strong>Добавь описание</div>
              <div className="st-empty-step"><strong>03</strong>Получи фидбек</div>
            </div>
          </div>
        </div>
      ) : (
        /* Video feed with content */
        <div className="st-feed-mode">
          <VideoFeed
            soundToks={orderedSoundToks}
            initialIndex={initialIndex}
            onLike={handleLike}
            onNearEnd={loadMoreSoundToks}
            onCommentCountChange={(id, count) => {
              setSoundToks((prev) =>
                prev.map((tok) => (tok.id === id ? { ...tok, commentsCount: count } : tok))
              );
            }}
          />
          
          <button
            className="st-fab"
            onClick={() => setShowUpload(true)}
            title="Загрузить видео"
          >
            <IconPlus />
          </button>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="st-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowUpload(false);
        }}>
          <div className="st-modal">
            <div className="st-modal-header">
              <div>
                <div className="st-modal-title">Новое видео</div>
                <div className="st-modal-subtitle">Загрузите ваш контент</div>
              </div>
              <button className="st-modal-close" onClick={() => setShowUpload(false)}>
                <IconClose />
              </button>
            </div>

            <form onSubmit={handleUpload} className="st-form">
              <div className="st-field">
                <label className="st-label">1. Выберите видео</label>
                <div className="st-file-upload">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 15 * 1024 * 1024) {
                        showToast('Файл слишком большой — максимум 15 MB', 'error');
                        e.target.value = '';
                        setVideoFile(null);
                        return;
                      }
                      setVideoFile(file);
                    }}
                    className="st-file-input"
                    required
                    id="video-upload"
                  />
                  <label 
                    htmlFor="video-upload" 
                    className={`st-file-label ${videoFile ? 'has-file' : ''}`}
                  >
                    <div className="st-file-icon">
                      {videoFile ? <IconCheck /> : <IconUpload />}
                    </div>
                    <div className="st-file-info">
                      {videoFile ? (
                        <>
                          <div className="st-file-name">{videoFile.name}</div>
                          <div className="st-file-hint">
                            {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="st-file-name">Нажмите, чтобы выбрать клип</div>
                          <div className="st-file-hint">MP4 · MOV · WebM · до 15 MB</div>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                {videoFile && (
                  <div className="st-upload-progress">Видео готово к публикации</div>
                )}
              </div>

              <div className="st-field">
                <label className="st-label">2. Добавьте описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="О чём этот трек или клип?"
                  className="st-textarea"
                  rows={3}
                  maxLength={500}
                />
                <div style={{ 
                  fontFamily: "'DM Mono', monospace", 
                  fontSize: 9, 
                  color: 'var(--text-faint)', 
                  textAlign: 'right',
                  marginTop: 4 
                }}>
                  {description.length}/500
                </div>
              </div>

              <div className="st-actions">
                <button 
                  type="button" 
                  className="st-btn st-btn-ghost" 
                  onClick={() => {
                    setShowUpload(false);
                    setVideoFile(null);
                    setDescription('');
                  }}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="st-btn st-btn-gradient" 
                  disabled={uploading || !videoFile}
                >
                  {uploading ? (
                    <>
                      <div className="st-spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <IconSparkles />
                      Опубликовать
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}