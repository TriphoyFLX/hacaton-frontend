import { useState, useEffect } from 'react';
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
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text-primary);
}

.st-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── HEADER BAR ── */
.st-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.st-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.15;
}
.st-subtitle {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ── BUTTONS ── */
.btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.btn-ghost:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.btn-primary {
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  color: #0a0a0a;
  font-weight: 500;
}
.btn-primary:hover {
  background: var(--text-secondary);
  border-color: var(--text-secondary);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── EMPTY STATE ── */
.st-empty {
  border: 1px dashed var(--border-mid);
  border-radius: 12px;
  padding: 64px 24px;
  text-align: center;
}
.st-empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  color: var(--text-muted);
}
.st-empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}
.st-empty-desc {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  margin-bottom: 24px;
}

/* ── MODAL ── */
.st-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.st-modal {
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  padding: 28px;
}
.st-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.st-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.st-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  color: var(--text-secondary);
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
  gap: 16px;
}
.st-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}
.st-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 14px 16px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}
.st-textarea:focus {
  border-color: var(--border-hover);
}
.st-textarea::placeholder {
  color: var(--text-muted);
}
.st-file-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border-mid);
  border-radius: 8px;
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.st-file-input:hover {
  border-color: var(--border-hover);
}
.st-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.st-actions .btn {
  flex: 1;
  justify-content: center;
}

/* ── LOADING STATE ── */
.st-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.st-loading-text {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.08em;
}

/* ── FAB BUTTON ── */
.st-fab {
  position: fixed;
  bottom: 32px;
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
  transition: transform 0.15s, background 0.15s;
  z-index: 50;
  color: #0a0a0a;
}
.st-fab:hover {
  transform: translateX(-50%) scale(1.05);
  background: var(--text-secondary);
  border-color: var(--text-secondary);
}
.st-fab svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
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

export default function SoundTok() {
  const [soundToks, setSoundToks] = useState<SoundTok[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchSoundToks = async () => {
    try {
      const data = await soundTokApi.getSoundToks();
      setSoundToks(data);
    } catch (error) {
      console.error('Failed to fetch SoundToks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoundToks();
  }, []);

  const handleLike = (id: string) => {
    setSoundToks(prev =>
      prev.map(tok =>
        tok.id === id ? { ...tok, likes: tok.likes + 1 } : tok
      )
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    setUploading(true);
    try {
      await soundTokApi.createSoundTok(description, videoFile);
      setDescription('');
      setVideoFile(null);
      setShowUpload(false);
      fetchSoundToks();
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="st-root">
        <style>{css}</style>
        <div className="st-loading">
          <span className="st-loading-text">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (soundToks.length === 0) {
    return (
      <div className="st-root">
        <style>{css}</style>
        <div className="st-wrapper">
          <div className="st-topbar">
            <div>
              <h1 className="st-title">SoundTok</h1>
              <div className="st-subtitle">Короткие видео</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <IconPlus />
              Создать
            </button>
          </div>

          <div className="st-empty">
            <div className="st-empty-icon"><IconVideo /></div>
            <div className="st-empty-title">Нет видео</div>
            <div className="st-empty-desc">Будьте первым, кто загрузит контент</div>
          </div>
        </div>

        {showUpload && (
          <div className="st-modal-overlay">
            <div className="st-modal">
              <div className="st-modal-header">
                <div className="st-modal-title">Загрузить видео</div>
                <button className="st-modal-close" onClick={() => setShowUpload(false)}>
                  <IconClose />
                </button>
              </div>
              <form onSubmit={handleUpload} className="st-form">
                <div>
                  <label className="st-label">Описание</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Добавьте описание..."
                    className="st-textarea"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="st-label">Видео файл</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="st-file-input"
                    required
                  />
                </div>
                <div className="st-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowUpload(false)}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Загрузка...' : 'Опубликовать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="st-root">
      <style>{css}</style>
      <div className="relative h-full">
        <VideoFeed soundToks={soundToks} onLike={handleLike} />
        
        <button className="st-fab" onClick={() => setShowUpload(true)}>
          <IconPlus />
        </button>

        {showUpload && (
          <div className="st-modal-overlay">
            <div className="st-modal">
              <div className="st-modal-header">
                <div className="st-modal-title">Загрузить видео</div>
                <button className="st-modal-close" onClick={() => setShowUpload(false)}>
                  <IconClose />
                </button>
              </div>
              <form onSubmit={handleUpload} className="st-form">
                <div>
                  <label className="st-label">Описание</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Добавьте описание..."
                    className="st-textarea"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="st-label">Видео файл</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="st-file-input"
                    required
                  />
                </div>
                <div className="st-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowUpload(false)}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Загрузка...' : 'Опубликовать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
