import { useState, useEffect } from 'react';
import { Wand2, Play, Download, History, Trash2 } from 'lucide-react';


interface GenerationResult {
  id: number | string;
  status: string;
  audio_urls: string[];
  images: string[];
  title?: string;
  tags?: string;
  prompt?: string;
  createdAt?: string;
  progress?: number;
  cost?: number;
  runtime?: number;
  response_type?: string;
  full_response?: any;
  timestamp?: number;
  model?: string;
  request_id?: number | string;
}

const STORAGE_KEY = 'ai-generated-tracks';
const GENERATION_KEY = 'ai-generation-state';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.ai-root {
  --bg: #0b0b0b;
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --border: #232323;
  --border-mid: #2e2e2e;
  --border-hover: #3d3d3d;
  --text-primary: #f0ede8;
  --text-secondary: #6b6b6b;
  --text-muted: #3a3a3a;
  --accent: #e8e4dc;
  --accent-dim: #c5c0b8;
  --red: #c0392b;
  --red-dim: #1a0f0f;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text-primary);
}

.ai-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 28px 80px;
}

/* ── AMBIENT BACKGROUND ── */
.ai-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.12;
  animation: orb-float 24s ease-in-out infinite;
}
.ambient-orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
  top: -200px;
  right: -100px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
  bottom: -150px;
  left: -100px;
  animation-delay: -8s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30px, -40px) scale(1.08); }
  66% { transform: translate(20px, 30px) scale(0.95); }
}
.ai-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.ai-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.012;
  background-image: 
    linear-gradient(rgba(232, 228, 220, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 220, 0.2) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* ── TOP BAR ── */
.ai-topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg);
}
.brand-mark svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}
.brand-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}
.topbar-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  color: var(--text-secondary);
  position: relative;
}
.btn-icon:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.btn-icon svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
}
.history-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--text-primary);
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg);
}

/* ── DESCRIPTION ── */
.ai-desc {
  position: relative;
  z-index: 10;
  margin-bottom: 32px;
}
.desc-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── FORM CARD ── */
.form-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}
.form-card:hover {
  border-color: var(--border-mid);
}
.section-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group:last-child {
  margin-bottom: 0;
}
.form-label {
  display: block;
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus {
  border-color: var(--border-hover);
}
.form-input::placeholder {
  color: var(--text-muted);
}
.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.6;
}

/* ── PRESETS ── */
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.preset-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-elevated);
}

/* ── SUBMIT BUTTON ── */
.submit-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  border-radius: 10px;
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 24px;
}
.submit-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.submit-btn:disabled:hover {
  background: var(--text-primary);
  border-color: var(--text-primary);
}

/* ── PROGRESS ── */
.progress-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}
.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.progress-label {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.progress-percent {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
}
.progress-fill {
  height: 100%;
  background: var(--text-primary);
  border-radius: 2px;
  transition: width 0.5s ease;
}
.progress-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-mid);
  border-top-color: var(--text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.progress-request-id {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.progress-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ── RESULT CARD ── */
.result-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}
.result-meta {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}
.result-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}
.result-id {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.result-tags {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.result-audio {
  width: 100%;
  height: 40px;
  margin-bottom: 20px;
}
.result-actions {
  display: flex;
  gap: 8px;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 18px;
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  border-radius: 8px;
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}
.btn-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 18px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-elevated);
}

/* ── ERROR CARD ── */
.error-card {
  position: relative;
  z-index: 10;
  background: var(--red-dim);
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 24px;
}
.error-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--red);
  margin-bottom: 8px;
}
.error-text {
  font-size: 13px;
  color: var(--accent-dim);
  line-height: 1.6;
}

/* ── HISTORY ── */
.history-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 6px;
  color: var(--red);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-danger:hover {
  background: var(--red-dim);
  border-color: var(--red);
}
.history-empty {
  text-align: center;
  padding: 40px 20px;
}
.history-empty-icon {
  font-size: 36px;
  opacity: 0.3;
  margin-bottom: 12px;
}
.history-empty-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.history-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}
.history-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.history-item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.history-item-date {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.history-item-tags {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
.btn-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-delete:hover {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-dim);
}
.btn-delete svg {
  width: 13px;
  height: 13px;
}
.history-item-audio {
  width: 100%;
  height: 32px;
  margin-bottom: 10px;
}
.history-item-actions {
  display: flex;
  gap: 6px;
}

/* ── INFO CARD ── */
.info-card {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
}
.info-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.info-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}

/* ── API RESPONSE CARD ── */
.api-response-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}
.api-response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.api-response-title {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.api-response-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.15s;
}
.api-response-toggle:hover {
  border-color: var(--border-hover);
  color: var(--text-secondary);
}
.api-response-content {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  max-height: 400px;
  overflow-y: auto;
}
.api-response-json {
  white-space: pre-wrap;
  word-break: break-all;
}
.api-response-field {
  margin-bottom: 12px;
}
.api-response-field:last-child {
  margin-bottom: 0;
}
.api-response-label {
  color: var(--text-muted);
  margin-bottom: 4px;
}
.api-response-value {
  color: var(--accent);
}
.api-response-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
}
.status-processing {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}
.status-success {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}
.status-error {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}
`;

export default function AI() {
  const [title, setTitle] = useState('Свобода');
  const [tags, setTags] = useState('Винтажный джаз-лаундж, классические стандарты, плавные соло на трубе, контрабас и знойный женский вокал');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [showApiResponse, setShowApiResponse] = useState(false);

  // API ключ в backend для безопасности

  // Загрузка истории и состояния генерации из localStorage
  useEffect(() => {
    try {
      // Загрузка истории
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GenerationResult[];
        setHistory(parsed);
      }

      // Загрузка состояния генерации
      const generationState = localStorage.getItem(GENERATION_KEY);
      if (generationState) {
        const state = JSON.parse(generationState);
        const { isGenerating, generatedAudio, progress, startTime } = state;
        
        if (isGenerating && generatedAudio && generatedAudio.status === 'starting') {
          // Если генерация была в процессе, проверяем не прошло ли слишком много времени
          const elapsed = Date.now() - startTime;
          const maxTime = 8 * 60 * 1000; // 8 минут
          
          if (elapsed < maxTime) {
            setIsGenerating(true);
            setGeneratedAudio(generatedAudio);
            setProgress(progress);
            // Продолжаем опрос результата
            pollForResult(generatedAudio.id);
          } else {
            // Если прошло слишком много времени, очищаем состояние
            localStorage.removeItem(GENERATION_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }, []);

  // Сохранение трека в историю
  const saveToHistory = (track: GenerationResult) => {
    const updated = [track, ...history];
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  // Удаление трека из истории
  const deleteFromHistory = (id: number) => {
    const updated = history.filter(t => t.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete from history:', error);
    }
  };

  // Очистка истории
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const generateMusic = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedAudio(null);
    setProgress(0);

    try {
      const requestBody = {
        title: title,
        tags: tags,
        ...(prompt && { prompt: prompt }),
        translate_input: true,
        model: 'v5.5'
      };

      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("GENERATION RESPONSE FROM BACKEND:", data);
      
      // Сохраняем полный ответ API для отображения
      setApiResponse(data);
      setShowApiResponse(true);
      
      const requestId = data.request_id || data.id;
      console.log("USING REQUEST ID:", requestId);
      
      const generationState = {
        id: requestId,
        status: 'starting',
        audio_urls: [],
        images: [],
        title: title,
        tags: tags,
        prompt: prompt,
        createdAt: new Date().toISOString(),
        progress: 0
      };
      
      setGeneratedAudio(generationState);
      
      // Сохраняем состояние генерации
      localStorage.setItem(GENERATION_KEY, JSON.stringify({
        isGenerating: true,
        generatedAudio: generationState,
        progress: 0,
        startTime: Date.now()
      }));
      
      pollForResult(requestId);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
      console.error('Generation error:', err);
      setIsGenerating(false);
      setProgress(0);
      localStorage.removeItem(GENERATION_KEY);
    }
  };

  const pollForResult = async (id: number) => {
    console.log("STARTING POLLING FOR ID:", id);
    
    if (!id) {
      console.error("ERROR: No ID provided for polling");
      setError("Ошибка: отсутствует ID генерации");
      setIsGenerating(false);
      return;
    }
    
    const maxAttempts = 160; // Увеличиваем до 8 минут (160 * 3 сек)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log("POLLING ID:", id, "ATTEMPT:", attempts);
        
        let newProgress;
        if (attempts <= 20) {
          newProgress = Math.min(30, Math.floor((attempts / 20) * 30));
        } else if (attempts <= 50) {
          newProgress = Math.min(70, 30 + Math.floor(((attempts - 20) / 30) * 40));
        } else {
          newProgress = Math.min(95, 70 + Math.floor(((attempts - 50) / 30) * 25));
        }
        
        setProgress(newProgress);
        setGeneratedAudio(prev => prev ? { ...prev, progress: newProgress } : null);
        
        const response = await fetch(`/api/check-generation/${id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          // Обновляем API ответ для отображения актуального статуса
          setApiResponse(result);

          if (result.status === 'success' && result.result) {
            // Извлекаем аудио URLs из массива result
            const audioUrls = result.result.filter((item: any) => typeof item === 'string') as string[];
            // Извлекаем изображения из массива result
            const images = result.result
              .filter((item: any) => typeof item === 'object' && item !== null && 'image' in item)
              .map((item: any) => item.image);
            
            const completedTrack: GenerationResult = {
              id: result.id,
              status: 'success',
              audio_urls: audioUrls,
              images: images,
              title: result.parameters?.title || title,
              tags: result.parameters?.tags || tags,
              prompt: prompt,
              createdAt: new Date().toISOString(),
              progress: 100,
              cost: result.cost,
              runtime: result.runtime
            };
            
            setGeneratedAudio(completedTrack);
            setIsGenerating(false);
            setProgress(100);
            saveToHistory(completedTrack);
            // Очищаем состояние генерации
            localStorage.removeItem(GENERATION_KEY);
            return;
          } else if (result.status === 'failed' || result.status === 'error') {
            setError('Генерация не удалась. Попробуйте снова.');
            setIsGenerating(false);
            setProgress(0);
            localStorage.removeItem(GENERATION_KEY);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('Время ожидания истекло (8 минут). Генерация может занять больше времени. Вы можете вернуться позже - генерация продолжится в фоне.');
          setIsGenerating(false);
          setProgress(0);
          localStorage.removeItem(GENERATION_KEY);
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('Не удалось получить результат. Попробуйте позже.');
          setIsGenerating(false);
          setProgress(0);
          localStorage.removeItem(GENERATION_KEY);
        }
      }
    };

    poll();
  };

  const presetStyles = [
    { name: 'Джаз', tags: 'Винтажный джаз-лаундж, классические стандарты, плавные соло на трубе, контрабас и знойный женский вокал' },
    { name: 'Поп', tags: 'Современный поп, танцевальный ритм, запоминающийся хук, синтезаторы и динамичный бас' },
    { name: 'Рок', tags: 'Альтернативный рок, мощные гитары, драйвовый ритм, энергичное соло и сильный вокал' },
    { name: 'Электроника', tags: 'Электронная музыка, синтвейв, ретро-синтезаторы, атмосферные пэды и ритмичный бит' },
    { name: 'Хип-хоп', tags: 'Хип-хоп, trap-ритм, глубокий бас, автотюн и динамичные ударные' },
    { name: 'Классика', tags: 'Классическая музыка, оркестр, скрипка, фортепиано и симфоническая аранжировка' },
  ];

  const applyPreset = (tags: string) => {
    setTags(tags);
  };

  // ── SVG Icons ──
  const IconWand = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15 4V2m0 2v2m0-2h2m-2 0h-2"/>
      <path d="M10.5 21l-7-7 11-11 7 7-11 11z"/>
      <path d="M8 19l-3 3"/>
      <path d="M21 6l-3-3"/>
    </svg>
  );

  return (
    <div className="ai-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="ai-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="ai-noise" />
      <div className="ai-grid-bg" />

      <div className="ai-wrapper">
        {/* Top Bar */}
        <div className="ai-topbar">
          <div className="topbar-brand">
            <div className="brand-mark">
              <IconWand />
            </div>
            <span className="brand-text">AI Генерация</span>
          </div>
          <button 
            className="btn-icon" 
            onClick={() => setShowHistory(!showHistory)}
            style={{ width: 'auto', padding: '0 12px', gap: '8px' }}
          >
            <History size={16} />
            {history.length > 0 && (
              <span className="history-badge">{history.length}</span>
            )}
          </button>
        </div>

        {/* Description */}
        <div className="ai-desc">
          <p className="desc-text">
            Генерируйте уникальные музыкальные композиции с помощью Suno AI. 
            Опишите стиль и добавьте текст песни при необходимости.
          </p>
        </div>

        {/* Form */}
        <div className="form-card">
          <div className="section-heading">Параметры</div>

          <div className="form-group">
            <label className="form-label">Название трека</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="Введите название"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Музыкальные стили</label>
            <textarea
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="form-input form-textarea"
              placeholder="Опишите желаемый музыкальный стиль"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Быстрые пресеты</label>
            <div className="presets">
              {presetStyles.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.tags)}
                  className="preset-btn"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Текст песни (опционально)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="form-input form-textarea"
              placeholder="Введите текст песни, если хотите добавить вокал"
              rows={6}
            />
          </div>

          <button
            onClick={generateMusic}
            disabled={isGenerating}
            className="submit-btn"
          >
            {isGenerating ? (
              <>
                <div className="progress-spinner" />
                Генерация...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Сгенерировать музыку
              </>
            )}
          </button>
        </div>

        {/* API Response */}
        {apiResponse && showApiResponse && (
          <div className="api-response-card">
            <div className="api-response-header">
              <span className="api-response-title">Ответ API GenAPI</span>
              <button 
                className="api-response-toggle"
                onClick={() => setShowApiResponse(!showApiResponse)}
              >
                {showApiResponse ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            
            <div className="api-response-content">
              <div className="api-response-field">
                <div className="api-response-label">Статус:</div>
                <span className={`api-response-status status-${apiResponse.status || 'processing'}`}>
                  {apiResponse.status || 'processing'}
                </span>
              </div>
              
              {apiResponse.request_id && (
                <div className="api-response-field">
                  <div className="api-response-label">Request ID:</div>
                  <div className="api-response-value">{apiResponse.request_id}</div>
                </div>
              )}
              
              {apiResponse.model && (
                <div className="api-response-field">
                  <div className="api-response-label">Модель:</div>
                  <div className="api-response-value">{apiResponse.model}</div>
                </div>
              )}
              
              {apiResponse.cost !== undefined && (
                <div className="api-response-field">
                  <div className="api-response-label">Стоимость:</div>
                  <div className="api-response-value">{apiResponse.cost} кредитов</div>
                </div>
              )}
              
              {apiResponse.progress !== undefined && (
                <div className="api-response-field">
                  <div className="api-response-label">Прогресс:</div>
                  <div className="api-response-value">{apiResponse.progress}%</div>
                </div>
              )}
              
              {apiResponse.timestamp && (
                <div className="api-response-field">
                  <div className="api-response-label">Время:</div>
                  <div className="api-response-value">{new Date(apiResponse.timestamp * 1000).toLocaleString('ru-RU')}</div>
                </div>
              )}
              
              <div className="api-response-field">
                <div className="api-response-label">Полный ответ:</div>
                <div className="api-response-json">
                  {JSON.stringify(apiResponse, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {generatedAudio && generatedAudio.status === 'starting' && (
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-label">Генерация музыки</span>
              <span className="progress-percent">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-info">
              <div className="progress-spinner" />
              <div>
                <p className="progress-request-id">Request ID: {generatedAudio.id}</p>
                <p className="progress-hint">Это может занять несколько минут</p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {generatedAudio && generatedAudio.status === 'success' && generatedAudio.audio_urls && generatedAudio.audio_urls.length > 0 && (
          <div className="result-card">
            <div className="section-heading">Результат</div>
            
            <div className="result-meta">
              <div className="result-title">{generatedAudio.title || 'Сгенерированный трек'}</div>
              <div className="result-id">ID: {generatedAudio.id}</div>
              {generatedAudio.cost && (
                <div className="result-tags">Стоимость: {generatedAudio.cost} кредитов</div>
              )}
              {generatedAudio.runtime && (
                <div className="result-tags">Длительность: {generatedAudio.runtime.toFixed(1)}с</div>
              )}
              {generatedAudio.tags && (
                <div className="result-tags">{generatedAudio.tags}</div>
              )}
            </div>

            {/* Отображаем все аудио файлы */}
            {generatedAudio.audio_urls.map((audioUrl, index) => (
              <div key={index}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Вариант {index + 1}
                </div>
                <audio controls className="result-audio" autoPlay={index === 0}>
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
              </div>
            ))}

            {/* Отображаем изображения если есть */}
            {generatedAudio.images && generatedAudio.images.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Обложки:
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {generatedAudio.images.map((imageUrl, index) => (
                    <img 
                      key={index}
                      src={imageUrl} 
                      alt={`Обложка ${index + 1}`}
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="result-actions" style={{ marginTop: '20px' }}>
              {generatedAudio.audio_urls.map((audioUrl, index) => (
                <a key={index} href={audioUrl} download className="btn-primary" style={{ marginRight: '8px' }}>
                  <Download size={14} />
                  Скачать {index + 1}
                </a>
              ))}
              <button 
                className="btn-secondary"
                onClick={() => {
                  // Сохраняем все варианты трека в localStorage
                  const projectTracks = generatedAudio.audio_urls.map((audioUrl, index) => ({
                    id: `${generatedAudio.id}-${index}`,
                    originalId: generatedAudio.id,
                    title: `${generatedAudio.title || 'Сгенерированный трек'} ${index + 1}`,
                    audioUrl: audioUrl,
                    tags: generatedAudio.tags,
                    createdAt: generatedAudio.createdAt,
                    images: generatedAudio.images || [],
                    variantIndex: index
                  }));
                  
                  // Получаем текущие треки и добавляем новые
                  const existingTracks = JSON.parse(localStorage.getItem('project-tracks') || '[]');
                  const updatedTracks = [...projectTracks, ...existingTracks];
                  localStorage.setItem('project-tracks', JSON.stringify(updatedTracks));
                  
                  // Триггерим обновление для других вкладок/страниц
                  window.dispatchEvent(new Event('localStorageUpdated'));
                  
                  alert(`Добавлено ${projectTracks.length} треков в проект! Перейдите в студию для работы с ними.`);
                }}
              >
                <Play size={14} />
                В проект
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-card">
            <div className="error-heading">Ошибка</div>
            <p className="error-text">{error}</p>
          </div>
        )}

        {/* History */}
        {showHistory && (
          <div className="history-card">
            <div className="history-header">
              <span className="section-heading" style={{ marginBottom: 0 }}>История генераций</span>
              {history.length > 0 && (
                <button onClick={clearHistory} className="btn-danger">
                  <Trash2 size={12} />
                  Очистить
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon">
                  <History size={36} />
                </div>
                <div className="history-empty-text">История пуста</div>
              </div>
            ) : (
              <div className="history-list">
                {history.map((track) => (
                  <div key={track.id} className="history-item">
                    <div className="history-item-header">
                      <div>
                        <div className="history-item-title">{track.title || 'Без названия'}</div>
                        <div className="history-item-date">
                          {track.createdAt && new Date(track.createdAt).toLocaleString('ru-RU')}
                        </div>
                        {track.cost && (
                          <div className="history-item-tags">Стоимость: {track.cost} кредитов</div>
                        )}
                        {track.tags && (
                          <div className="history-item-tags">{track.tags}</div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteFromHistory(track.id)}
                        className="btn-delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {track.audio_urls && track.audio_urls.length > 0 && (
                      <>
                        {track.audio_urls.map((audioUrl, index) => (
                          <div key={index}>
                            {track.audio_urls.length > 1 && (
                              <div style={{ marginBottom: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                Вариант {index + 1}
                              </div>
                            )}
                            <audio controls className="history-item-audio">
                              <source src={audioUrl} type="audio/mpeg" />
                            </audio>
                          </div>
                        ))}
                        
                        {/* Отображаем изображения если есть */}
                        {track.images && track.images.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            <div style={{ marginBottom: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                              Обложки:
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {track.images.map((imageUrl, index) => (
                                <img 
                                  key={index}
                                  src={imageUrl} 
                                  alt={`Обложка ${index + 1}`}
                                  style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    objectFit: 'cover', 
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="history-item-actions">
                          {track.audio_urls.map((audioUrl, index) => (
                            <a key={index} href={audioUrl} download className="btn-primary" style={{ height: 30, fontSize: 10, marginRight: '6px' }}>
                              <Download size={12} />
                              Скачать {index + 1}
                            </a>
                          ))}
                          <button 
                            className="btn-secondary" 
                            style={{ height: 30, fontSize: 10 }}
                            onClick={() => {
                              // Сохраняем все варианты трека в localStorage
                              const projectTracks = track.audio_urls.map((audioUrl, index) => ({
                                id: `${track.id}-${index}`,
                                originalId: track.id,
                                title: `${track.title || 'Сгенерированный трек'} ${index + 1}`,
                                audioUrl: audioUrl,
                                tags: track.tags,
                                createdAt: track.createdAt,
                                images: track.images || [],
                                variantIndex: index
                              }));
                              
                              // Получаем текущие треки и добавляем новые
                              const existingTracks = JSON.parse(localStorage.getItem('project-tracks') || '[]');
                              const updatedTracks = [...projectTracks, ...existingTracks];
                              localStorage.setItem('project-tracks', JSON.stringify(updatedTracks));
                              
                              // Триггерим обновление для других вкладок/страниц
                              window.dispatchEvent(new Event('localStorageUpdated'));
                              
                              alert(`Добавлено ${projectTracks.length} треков в проект! Перейдите в студию для работы с ними.`);
                            }}
                          >
                            <Play size={12} />
                            В проект
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="info-card">
          <div className="info-heading">О Suno AI</div>
          <p className="info-text">
            Suno AI — мощная нейросеть для генерации музыки. Создаёт треки в различных стилях: 
            от классики до электроники. Опишите желаемый стиль и добавьте текст песни для генерации вокала.
          </p>
        </div>
      </div>
    </div>
  );
}