import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi, Post } from '../api/posts';
import {
  Image, Video, Music, Heart, MessageCircle, Share2,
  MoreHorizontal, TrendingUp, Clock, Bookmark, Send,
  Play, Eye, ChevronDown, Bell, Search, Flame, Zap, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.feed-root {
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

.feed-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── AMBIENT ── */
.feed-ambient {
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
  background: radial-gradient(circle, rgba(232, 228, 220, 0.12) 0%, transparent 70%);
  top: -200px;
  left: -100px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.1) 0%, transparent 70%);
  bottom: -150px;
  right: -100px;
  animation-delay: -8s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.06); }
  66% { transform: translate(-20px, 25px) scale(0.94); }
}
.feed-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.feed-grid-bg {
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
.feed-topbar {
  position: relative;
  z-index: 10;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── TABS ── */
.feed-tabs {
  position: relative;
  z-index: 10;
  display: flex;
  gap: 2px;
  margin-bottom: 32px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  width: fit-content;
}
.feed-tab {
  padding: 8px 20px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.feed-tab:hover {
  color: var(--text-primary);
}
.feed-tab.active {
  color: var(--text-primary);
  background: var(--bg-surface);
}
.feed-tab + .feed-tab {
  border-left: 1px solid var(--border);
}

/* ── CREATE POST ── */
.cp-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
  transition: border-color 0.2s;
}
.cp-card:focus-within {
  border-color: var(--border-mid);
}
.cp-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  padding: 0;
  margin-bottom: 16px;
  min-height: 24px;
}
.cp-textarea::placeholder {
  color: var(--text-muted);
}
.cp-preview {
  margin-bottom: 16px;
}
.cp-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.cp-preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  aspect-ratio: 1;
}
.cp-preview-item img,
.cp-preview-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cp-preview-audio {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  height: 100%;
  padding: 12px;
  flex-direction: column;
  gap: 8px;
}
.cp-preview-audio-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.cp-preview-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}
.cp-preview-remove:hover {
  background: rgba(192, 57, 43, 0.6);
  border-color: var(--red);
}
.cp-preview-remove svg {
  width: 12px;
  height: 12px;
}
.cp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.cp-media-btns {
  display: flex;
  gap: 4px;
}
.cp-media-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
}
.cp-media-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-elevated);
}
.cp-media-btn svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.5;
}
.cp-media-btn.active {
  border-color: var(--accent-dim);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}
.cp-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 18px;
  border-radius: 8px;
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
}
.cp-submit:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.cp-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cp-submit:disabled:hover {
  background: var(--text-primary);
  border-color: var(--text-primary);
}
.cp-submit svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}
.cp-selected-info {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}
.cp-hidden-inputs {
  display: none;
}

/* ── TRENDING BOX ── */
.trending-box {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
}
.trending-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.trending-title {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.trending-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.15s;
}
.trending-tag:hover {
  padding-left: 6px;
}
.trending-tag:last-of-type {
  border-bottom: none;
}
.trending-tag-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 2px;
}
.trending-tag-count {
  font-size: 11px;
  color: var(--text-muted);
}
.trending-show-more {
  margin-top: 10px;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.trending-show-more:hover {
  color: var(--text-primary);
}

/* ── POST CARD ── */
.post-card {
  position: relative;
  z-index: 10;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
  transition: border-color 0.2s, background 0.2s;
}
.post-card:hover {
  border-color: var(--border-mid);
  background: var(--bg-elevated);
}
.post-card-header {
  padding: 20px 20px 0;
}
.post-author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.post-author {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.post-avatar {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
}
.post-handle {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  margin-bottom: 2px;
}
.post-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.post-time {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.post-dot {
  color: var(--border-mid);
  font-size: 10px;
}
.post-views {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  color: var(--text-muted);
}
.post-actions-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-follow {
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--border-mid);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-follow:hover {
  border-color: var(--border-hover);
  background: var(--bg-elevated);
}
.btn-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s;
}
.btn-more:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
}
.post-body {
  padding: 0 20px 16px;
}
.post-text {
  font-size: 14.5px;
  color: var(--accent-dim);
  line-height: 1.7;
  font-weight: 400;
  margin-bottom: 4px;
}
.post-read-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.post-read-more:hover {
  color: var(--text-primary);
}
.post-media {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: #000;
}
.post-media img,
.post-media video {
  width: 100%;
  max-height: 520px;
  object-fit: cover;
  display: block;
}
.post-media-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
}
.post-media-grid img,
.post-media-grid video {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}
.media-audio {
  padding: 24px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.audio-visual {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  margin-bottom: 16px;
  height: 36px;
}
.audio-bar {
  flex: 1;
  background: var(--text-primary);
  border-radius: 1px;
  opacity: 0.3;
  min-height: 3px;
  animation: audio-bounce 1.4s ease-in-out infinite;
}
@keyframes audio-bounce {
  0%, 100% { height: 3px; opacity: 0.3; }
  50% { height: 36px; opacity: 0.9; }
}
.audio-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 12px;
}
.audio-player {
  width: 100%;
  height: 36px;
}
.post-card-footer {
  padding: 12px 20px 16px;
}
.post-footer-row {
  display: flex;
  align-items: center;
  gap: 2px;
}
.stat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-muted);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
}
.stat-btn:hover {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.02);
}
.stat-btn.liked {
  color: var(--red);
}
.stat-btn.liked svg {
  fill: var(--red);
  stroke: var(--red);
}
.stat-btn.saved {
  color: var(--accent-dim);
}
.stat-btn.saved svg {
  fill: var(--accent-dim);
  stroke: var(--accent-dim);
}
.stat-count {
  font-variant-numeric: tabular-nums;
}
.stat-spacer {
  margin-left: auto;
}
.btn-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--text-primary);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--bg);
  margin-left: 8px;
}
.btn-send svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

/* ── SKELETON ── */
.skeleton-card {
  position: relative;
  z-index: 10;
  height: 180px;
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 16px;
  overflow: hidden;
  background: var(--bg-surface);
}
.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.02) 50%,
    transparent 100%
  );
  animation: shimmer 2.2s infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.skeleton-inner {
  padding: 20px;
  display: flex;
  gap: 12px;
}
.skeleton-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}
.skeleton-lines {
  flex: 1;
}
.skeleton-line {
  height: 11px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 9px;
}
.skeleton-line:last-child {
  width: 50%;
  margin-bottom: 0;
}

/* ── EMPTY ── */
.empty-state {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 64px 24px;
  border: 1px dashed var(--border-mid);
  border-radius: 14px;
}
.empty-icon {
  font-size: 42px;
  margin-bottom: 16px;
  opacity: 0.4;
}
.empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 6px;
}
.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
}
`;

// ── SVG Icons ──
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

// ── Utils ──
function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'сейчас';
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.floor(h / 24)}д`;
}

// ── Create Post Block ──
function CreatePostBlock({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMediaType, setActiveMediaType] = useState<'photo' | 'video' | 'audio' | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: 'photo' | 'video' | 'audio') => {
    setActiveMediaType(type);
    switch (type) {
      case 'photo':
        photoInputRef.current?.click();
        break;
      case 'video':
        videoInputRef.current?.click();
        break;
      case 'audio':
        audioInputRef.current?.click();
        break;
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles(prev => [...prev, ...selectedFiles]);
    
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
    setActiveMediaType(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach(file => {
        formData.append('media', file);
      });
      
      // Безопасный вызов API
      const createPostFn = postsApi.createPost as (...args: any[]) => Promise<any>;
      await createPostFn(formData);
      
      setContent('');
      setFiles([]);
      setPreviews([]);
      onPostCreated?.();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAudioFile = (file: File) => file.type.startsWith('audio/');
  const isVideoFile = (file: File) => file.type.startsWith('video/');

  return (
    <div className="cp-card">
      <textarea
        className="cp-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Что у вас нового?"
        rows={3}
      />

      {previews.length > 0 && (
        <div className="cp-preview">
          <div className="cp-preview-grid">
            {previews.map((preview, index) => (
              <div key={index} className="cp-preview-item">
                {files[index] && isVideoFile(files[index]) ? (
                  <video src={preview} controls />
                ) : files[index] && isAudioFile(files[index]) ? (
                  <div className="cp-preview-audio">
                    <Music size={20} color="var(--text-muted)" />
                    <span className="cp-preview-audio-label">Аудио</span>
                  </div>
                ) : (
                  <img src={preview} alt={`Preview ${index + 1}`} />
                )}
                <button className="cp-preview-remove" onClick={() => removeFile(index)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cp-toolbar">
        <div className="cp-media-btns">
          <button
            className={`cp-media-btn ${activeMediaType === 'photo' ? 'active' : ''}`}
            onClick={() => handleFileSelect('photo')}
          >
            <Image size={14} />
            <span>Фото</span>
          </button>
          <button
            className={`cp-media-btn ${activeMediaType === 'video' ? 'active' : ''}`}
            onClick={() => handleFileSelect('video')}
          >
            <Video size={14} />
            <span>Видео</span>
          </button>
          <button
            className={`cp-media-btn ${activeMediaType === 'audio' ? 'active' : ''}`}
            onClick={() => handleFileSelect('audio')}
          >
            <Music size={14} />
            <span>Аудио</span>
          </button>
          
          {files.length > 0 && (
            <span className="cp-selected-info">
              +{files.length} файл{files.length > 1 ? 'а' : ''}
            </span>
          )}
        </div>

        <button
          className="cp-submit"
          onClick={handleSubmit}
          disabled={isSubmitting || (!content.trim() && files.length === 0)}
        >
          <Send size={14} />
          {isSubmitting ? 'Публикация...' : 'Опубликовать'}
        </button>
      </div>

      <div className="cp-hidden-inputs">
        <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handleFilesChange} />
        <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={handleFilesChange} />
        <input ref={audioInputRef} type="file" accept="audio/*" multiple onChange={handleFilesChange} />
      </div>
    </div>
  );
}

// ── Post Card ──
function PostCard({ post, index }: { post: Post; index: number }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const contentTruncated = (post.content?.length ?? 0) > 200;
  const displayContent = contentTruncated && !showMore
    ? post.content.slice(0, 200) + '…'
    : post.content;

  const renderMedia = () => {
    const mediaList = (post as any).media;
    if (!Array.isArray(mediaList) || mediaList.length === 0) return null;
    const media = mediaList[0];
    if (!media?.url) return null;
    const fullUrl = `http://localhost:5002${media.url}`;

    switch (media.type) {
      case 'IMAGE':
        return (
          <div className="post-media">
            <img src={fullUrl} alt="Post" loading="lazy" />
          </div>
        );
      case 'VIDEO':
        return (
          <div className="post-media">
            <video src={fullUrl} controls />
          </div>
        );
      case 'AUDIO':
        return (
          <div className="media-audio">
            <div className="audio-visual">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
            <div className="audio-label">Аудио</div>
            <audio src={fullUrl} controls className="audio-player" />
          </div>
        );
      default:
        return null;
    }
  };

  const stats = post as any;
  const likes = stats.likes ?? 0;
  const comments = stats.comments ?? 0;
  const shares = stats.shares ?? 0;
  const views = stats.views ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="post-card"
    >
      <div className="post-card-header">
        <div className="post-author-row">
          <div
            className="post-author"
            onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
          >
            <div className="post-avatar">
              {post?.author?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="post-handle">@{post?.author?.username ?? 'unknown'}</div>
              <div className="post-name">{post?.author?.username ?? 'Unknown'}</div>
              <div className="post-meta">
                <span className="post-time">{post?.createdAt ? timeAgo(post.createdAt) : ''}</span>
                <span className="post-dot">·</span>
                <span className="post-views">
                  <Eye size={11} />
                  {formatCount(views)}
                </span>
              </div>
            </div>
          </div>

          <div className="post-actions-top">
            <button className="btn-follow">Follow</button>
            <button className="btn-more">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      {post?.content && (
        <div className="post-body">
          <p className="post-text">{displayContent}</p>
          {contentTruncated && (
            <button className="post-read-more" onClick={() => setShowMore(v => !v)}>
              {showMore ? 'Свернуть' : 'Читать далее'}
              <ChevronDown size={12} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}
        </div>
      )}

      {renderMedia()}

      <div className="post-card-footer">
        <div className="post-footer-row">
          <button className={`stat-btn ${liked ? 'liked' : ''}`} onClick={() => setLiked(v => !v)}>
            <Heart size={15} />
            <span className="stat-count">{formatCount(likes + (liked ? 1 : 0))}</span>
          </button>
          <button className="stat-btn">
            <MessageCircle size={15} />
            <span className="stat-count">{formatCount(comments)}</span>
          </button>
          <button className="stat-btn">
            <Share2 size={15} />
            <span className="stat-count">{formatCount(shares)}</span>
          </button>
          <span className="stat-spacer" />
          <button
            className={`stat-btn ${saved ? 'saved' : ''}`}
            onClick={() => setSaved(v => !v)}
            style={{ padding: '6px 8px' }}
          >
            <Heart size={15} style={{ transform: 'rotate(-45deg)' }} />
          </button>
          <button className="btn-send">
            <IconSend />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

// ── Trending Tag ──
function TrendingTag({ label, count }: { label: string; count: string }) {
  return (
    <div className="trending-tag">
      <div>
        <div className="trending-tag-name">#{label}</div>
        <div className="trending-tag-count">{count} постов</div>
      </div>
      <Flame size={14} color="#6b6b6b" />
    </div>
  );
}

// ── Main Feed ──
export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('trending');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await postsApi.getPosts();
      setPosts(
        (data ?? []).map(post => ({
          ...post,
          likes: Math.floor(Math.random() * 3200) + 50,
          comments: Math.floor(Math.random() * 480) + 4,
          shares: Math.floor(Math.random() * 120) + 1,
          views: Math.floor(Math.random() * 24000) + 500,
        }))
      );
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="feed-root">
      <style>{css}</style>

      <div className="feed-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="feed-noise" />
      <div className="feed-grid-bg" />

      <div className="feed-wrapper">
        <div className="feed-topbar">
          <span className="topbar-label">Лента</span>
        </div>

        <div className="feed-tabs">
          <button
            className={`feed-tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            Популярное
          </button>
          <button
            className={`feed-tab ${activeTab === 'latest' ? 'active' : ''}`}
            onClick={() => setActiveTab('latest')}
          >
            Новое
          </button>
        </div>

        <CreatePostBlock onPostCreated={fetchPosts} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="trending-box">
          <div className="trending-header">
            <Flame size={14} color="#f97316" />
            <span className="trending-title">Тренды</span>
          </div>
          <TrendingTag label="дизайн" count="12.4K" />
          <TrendingTag label="разработка" count="9.2K" />
          <TrendingTag label="искусственный интеллект" count="31K" />
          <button className="trending-show-more">
            Показать ещё <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </button>
        </motion.div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {[0, 1, 2].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-shimmer" />
                  <div className="skeleton-inner">
                    <div className="skeleton-avatar" />
                    <div className="skeleton-lines">
                      <div className="skeleton-line" style={{ width: '30%' }} />
                      <div className="skeleton-line" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <AnimatePresence mode="popLayout">
            {posts.map((post, idx) => (
              <PostCard key={post.id} post={post} index={idx} />
            ))}
          </AnimatePresence>

          {!loading && posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="empty-state"
            >
              <div className="empty-icon">—</div>
              <div className="empty-label">Нет публикаций</div>
              <div className="empty-hint">Будьте первым, кто создаст пост</div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}