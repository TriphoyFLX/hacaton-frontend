import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { postsApi, Post, PostComment } from '../api/posts';
import { API_ORIGIN } from '../api/client';
import { Chat, chatsApi } from '../api/chats';
import { followsApi } from '../api/follows';
import { useAuthStore } from '../store/authStore';
import {
  Image, Video, Music, Heart, MessageCircle, Share2,
  MoreHorizontal, Send, Eye, ChevronDown, X, Trash2, ThumbsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminBadge from '../components/AdminBadge';
import { renderTextWithMentions } from '../utils/messageMentions';

// ── Styles ──
const FONT_IMPORT = '';

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
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 28px 80px;
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
  overflow: hidden;
}
.post-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.btn-follow.following {
  color: var(--bg);
  border-color: var(--accent);
  background: var(--accent);
}
.btn-follow:disabled {
  cursor: wait;
  opacity: 0.6;
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
  white-space: pre-wrap;
}
.post-hashtag {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}
.post-hashtag:hover {
  text-decoration: underline;
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
.post-comments-panel { margin: 0 18px 16px; padding: 13px; border: 1px solid var(--border); border-radius: 10px; background: rgba(0,0,0,.16); }
.post-comment-list { display: grid; gap: 10px; max-height: 320px; overflow-y: auto; margin-bottom: 12px; }
.post-comment-form { display: flex; gap: 8px; }
.post-comment-form > button { border: 0; border-radius: 7px; padding: 7px 10px; cursor: pointer; background: var(--text-primary); color: var(--bg); font-weight: 700; }
.post-comment-reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid rgba(110, 168, 254, 0.28);
  background: rgba(110, 168, 254, 0.08);
  font-size: 11px;
  color: var(--text-secondary);
}
.post-comment-reply-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(110, 168, 254, 0.18);
  color: #8eb8ff;
  font-weight: 700;
}
.post-comment-reply-cancel {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 2px;
}
.post-comment-reply-cancel:hover { color: var(--text-primary); }
.post-comment-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}
.post-comment-input-backdrop {
  position: absolute;
  inset: 0;
  padding: 8px 10px;
  border-radius: 7px;
  font: 12px/1.35 'Syne', sans-serif;
  white-space: pre;
  overflow: hidden;
  color: var(--text-primary);
  pointer-events: none;
  z-index: 0;
}
.post-comment-input-mention {
  color: #8eb8ff;
  font-weight: 700;
  background: rgba(110, 168, 254, 0.18);
  border-radius: 4px;
}
.post-comment-form input {
  position: relative;
  z-index: 1;
  flex: 1;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-mid);
  border-radius: 7px;
  padding: 8px 10px;
  color: transparent;
  caret-color: var(--text-primary);
  background: var(--bg);
  font: 12px/1.35 'Syne', sans-serif;
}
.post-comment-form input::placeholder {
  color: var(--text-secondary);
  opacity: 1;
}
.post-comment-form input:not(:placeholder-shown) {
  /* keep typed text transparent so backdrop highlight shows */
  color: transparent;
}
.post-comment-mention {
  display: inline;
  margin: 0;
  padding: 0 2px;
  border: none;
  border-radius: 3px;
  background: rgba(110, 168, 254, 0.14);
  color: #8eb8ff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.post-comment-mention:hover { text-decoration: underline; }
.post-action-error { margin-top: 8px; color: var(--red); font: 10px 'DM Mono', monospace; }
.post-copy-status { font: 10px 'DM Mono', monospace; color: #86b892; margin-left: 5px; }
.post-more-wrap { position: relative; }
.post-more-menu { position: absolute; right: 0; top: 30px; z-index: 30; width: 190px; padding: 6px; border: 1px solid var(--border-mid); border-radius: 9px; background: var(--bg-elevated); box-shadow: 0 14px 30px rgba(0,0,0,.4); }
.post-more-menu button { width: 100%; padding: 9px 10px; text-align: left; cursor: pointer; color: var(--text-primary); background: transparent; border: 0; border-radius: 6px; font: 12px 'Syne', sans-serif; }
.post-more-menu button:hover { background: var(--bg-hover); }
.post-more-menu button.danger { color: #f5a9a3; }
.post-more-menu button.danger:hover { background: rgba(192, 57, 43, 0.16); }
.post-comment {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
}
.post-comment.reply {
  margin-left: 28px;
  padding-left: 10px;
  border-left: 2px solid var(--border);
}
.post-comment-main { min-width: 0; flex: 1; }
.post-comment-author {
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: 700 12px 'Syne', sans-serif;
  padding: 0;
  margin-right: 6px;
  cursor: pointer;
}
.post-comment-author:hover { text-decoration: underline; }
.post-comment-delete {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.post-comment-delete:hover { color: #f5a9a3; background: rgba(192, 57, 43, 0.12); }
.post-comment-text.hidden { color: var(--text-muted); font-style: italic; }
.post-comment-votes { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.post-comment-vote {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  font: 11px 'DM Mono', monospace;
}
.post-comment-vote:hover { color: var(--text-secondary); }
.post-comment-vote.liked { color: #fe2c55; }
.post-comment-vote.disliked { color: #8b9cff; }
.post-comment-reply-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  font: 11px 'Syne', sans-serif;
  font-weight: 600;
}
.post-comment-reply-btn:hover { color: var(--text-primary); }
.post-share-overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.68); }
.post-share-dialog { width: min(420px, 100%); max-height: 75vh; overflow: auto; padding: 18px; border: 1px solid var(--border-mid); border-radius: 13px; background: var(--bg-surface); }
.post-share-dialog h3 { margin: 0 0 5px; font-size: 18px; }.post-share-dialog p { margin: 0 0 14px; color: var(--text-secondary); font-size: 12px; }
.post-share-chat { display: block; width: 100%; margin: 6px 0; padding: 11px; cursor: pointer; color: var(--text-primary); text-align: left; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); font: 13px 'Syne', sans-serif; }
.post-share-chat:hover { border-color: var(--border-hover); background: var(--bg-hover); }.post-share-close { float: right; background: transparent; color: var(--text-secondary); border: 0; cursor: pointer; }
.cp-hashtag-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; }
.cp-hashtag-hint { color: var(--text-secondary); font: 11px 'DM Mono', monospace; }
.cp-hashtag-add { border: 1px solid var(--border); border-radius: 6px; padding: 5px 8px; background: transparent; color: var(--text-secondary); cursor: pointer; font: 11px 'DM Mono', monospace; }
.cp-hashtag-add:hover { border-color: var(--border-hover); color: var(--text-primary); }
.feed-tag-filter { position: relative; z-index: 10; display: flex; align-items: center; gap: 8px; width: fit-content; margin: 0 0 16px; padding: 7px 10px; border: 1px solid var(--border-mid); border-radius: 7px; color: var(--text-secondary); font: 11px 'DM Mono', monospace; }
.feed-tag-filter button { display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: var(--text-muted); cursor: pointer; }
`;

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
      // Передаём content и files отдельно
      await postsApi.createPost(content, files);
      
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
        placeholder="Что у вас нового? Добавьте #хештег, чтобы публикацию было легче найти"
        rows={3}
      />
      <div className="cp-hashtag-row">
        <span className="cp-hashtag-hint">Хештеги: #музыка #новинка</span>
        <button
          type="button"
          className="cp-hashtag-add"
          onClick={() => setContent((current) => `${current}${current && !/\s$/.test(current) ? ' ' : ''}#`)}
        >
          + хештег
        </button>
      </div>

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
function PostCard({
  post,
  index,
  currentUserId,
  isFollowing,
  canFollow,
  onToggleFollow,
  onDeleted,
}: {
  post: Post;
  index: number;
  currentUserId?: string;
  isFollowing: boolean;
  canFollow: boolean;
  onToggleFollow: (userId: string) => Promise<void>;
  onDeleted?: (postId: string) => void;
}) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likes);
  const [views, setViews] = useState(post.views);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [shareStatus, setShareStatus] = useState('');
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const isOwnPost = Boolean(currentUserId && currentUserId === post.authorId);

  useEffect(() => {
    void postsApi.recordView(post.id)
      .then((result) => setViews(result.views))
      .catch(() => undefined);
  }, [post.id]);

  const contentTruncated = (post.content?.length ?? 0) > 200;
  const displayContent = contentTruncated && !showMore
    ? post.content.slice(0, 200) + '…'
    : post.content;
  const renderPostContent = (content: string) => {
    const hashtagPattern = /#[\p{L}\p{N}_-]+/gu;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of content.matchAll(hashtagPattern)) {
      const index = match.index ?? 0;
      if (index > lastIndex) parts.push(content.slice(lastIndex, index));
      const tag = match[0];
      parts.push(
        <button
          type="button"
          key={`${tag}-${index}`}
          className="post-hashtag"
          onClick={() => navigate(`/feed?tag=${encodeURIComponent(tag.slice(1))}`)}
        >
          {tag}
        </button>,
      );
      lastIndex = index + tag.length;
    }

    if (lastIndex < content.length) parts.push(content.slice(lastIndex));
    return parts.length ? parts : content;
  };

  const renderMedia = () => {
    const mediaList = (post as any).media;
    if (!Array.isArray(mediaList) || mediaList.length === 0) return null;
    const image = mediaList.find((m: any) => m?.type === 'IMAGE' && m?.url);
    const audio = mediaList.find((m: any) => m?.type === 'AUDIO' && m?.url);
    const video = mediaList.find((m: any) => m?.type === 'VIDEO' && m?.url);
    const media = image || audio || video || mediaList[0];
    if (!media?.url) return null;
    const fullUrl = media.url.startsWith('http') ? media.url : `${API_ORIGIN}${media.url}`;
    const audioUrl = audio
      ? (audio.url.startsWith('http') ? audio.url : `${API_ORIGIN}${audio.url}`)
      : null;

    if (image && audioUrl) {
      return (
        <div className="post-media">
          <img src={fullUrl} alt="Cover" loading="lazy" />
          <div className="media-audio" style={{ marginTop: 10 }}>
            <audio src={audioUrl} controls className="audio-player" />
          </div>
        </div>
      );
    }

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

  const toggleLike = async () => {
    if (isLiking) return;
    const previousLiked = liked;
    const previousLikes = likes;
    setActionError('');
    setIsLiking(true);
    setLiked(!previousLiked);
    setLikes(Math.max(0, previousLikes + (previousLiked ? -1 : 1)));
    try {
      const response = previousLiked ? await postsApi.unlikePost(post.id) : await postsApi.likePost(post.id);
      setLiked(response.isLiked);
      setLikes(response.likes);
    } catch (error: any) {
      setLiked(previousLiked);
      setLikes(previousLikes);
      setActionError(error?.response?.data?.error || 'Не удалось обновить лайк. Попробуйте ещё раз.');
    } finally {
      setIsLiking(false);
    }
  };
  const toggleComments = async () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (!nextOpen) return;
    try { setComments(await postsApi.getComments(post.id)); } catch { setCommentError('Не удалось загрузить комментарии'); }
  };
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentError('');
    try {
      const result = await postsApi.createComment(post.id, text, replyTo?.id);
      setComments((current) => [...current, result.comment]);
      setCommentsCount(result.commentsCount);
      setCommentText('');
      setReplyTo(null);
    } catch (error: any) {
      setCommentError(error?.response?.data?.error || 'Не удалось отправить комментарий');
    }
  };
  const startReply = (comment: PostComment) => {
    const rootId = comment.parentId || comment.id;
    const username = comment.author.username;
    const mention = `@${username} `;
    setReplyTo({ id: rootId, username });
    setCommentText((prev) => {
      const withoutOldMention = prev.replace(/^@[a-zA-Z0-9._]+ /, '');
      return `${mention}${withoutOldMention}`;
    });
    window.setTimeout(() => {
      const input = commentInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(mention.length, mention.length);
    }, 0);
  };
  const cancelReply = () => {
    setCommentText((prev) => {
      if (!replyTo) return prev;
      const mention = `@${replyTo.username} `;
      return prev.startsWith(mention) ? prev.slice(mention.length) : prev;
    });
    setReplyTo(null);
  };
  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Удалить этот комментарий?')) return;
    setCommentError('');
    try {
      const result = await postsApi.deleteComment(post.id, commentId);
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId && comment.parentId !== commentId),
      );
      setCommentsCount(result.commentsCount);
      setReplyTo((current) => (current?.id === commentId ? null : current));
    } catch (error: any) {
      setCommentError(error?.response?.data?.error || 'Не удалось удалить комментарий');
    }
  };
  const applyCommentVote = (
    commentId: string,
    result: {
      likes: number;
      dislikes: number;
      isLiked: boolean;
      isDisliked: boolean;
      isHidden: boolean;
      text: string;
    },
  ) => {
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              likes: result.likes,
              dislikes: result.dislikes,
              isLiked: result.isLiked,
              isDisliked: result.isDisliked,
              isHidden: result.isHidden,
              text: result.text,
            }
          : comment,
      ),
    );
  };
  const likeComment = async (commentId: string) => {
    if (votingCommentId) return;
    setVotingCommentId(commentId);
    setCommentError('');
    try {
      const result = await postsApi.likeComment(post.id, commentId);
      applyCommentVote(commentId, result);
    } catch (error: any) {
      setCommentError(error?.response?.data?.error || 'Не удалось поставить лайк');
    } finally {
      setVotingCommentId(null);
    }
  };
  const dislikeComment = async (commentId: string) => {
    if (votingCommentId) return;
    setVotingCommentId(commentId);
    setCommentError('');
    try {
      const result = await postsApi.dislikeComment(post.id, commentId);
      applyCommentVote(commentId, result);
    } catch (error: any) {
      setCommentError(error?.response?.data?.error || 'Не удалось поставить дизлайк');
    } finally {
      setVotingCommentId(null);
    }
  };
  const deletePost = async () => {
    if (isDeleting) return;
    const confirmed = window.confirm('Удалить эту публикацию?');
    if (!confirmed) return;
    setIsDeleting(true);
    setShowMoreMenu(false);
    setActionError('');
    try {
      await postsApi.deletePost(post.id);
      onDeleted?.(post.id);
    } catch (error: any) {
      setActionError(error?.response?.data?.error || 'Не удалось удалить публикацию');
      setIsDeleting(false);
    }
  };
  const copyLink = async () => {
    const url = `${window.location.origin}/feed?p=${post.id}`;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copiedWithFallback = document.execCommand('copy');
        document.body.removeChild(input);
        if (!copiedWithFallback) throw new Error('Clipboard is unavailable');
      }
      setCopied(true);
      setActionError('');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setActionError('Не удалось скопировать ссылку. Скопируйте адрес из браузера.');
    }
  };
  const openShare = async () => {
    setShowMoreMenu(false);
    setShareStatus('');
    setShareOpen(true);
    try {
      const data = await chatsApi.getChats({ limit: 60, offset: 0 });
      setChats(data.items || []);
    } catch {
      setShareStatus('Не удалось загрузить список чатов');
    }
  };
  const shareToChat = async (chat: Chat) => {
    setShareStatus('Отправляем…');
    const url = `${window.location.origin}/feed?p=${post.id}`;
    try {
      await chatsApi.sendMessage(
        chat.id,
        `Смотри публикацию @${post.author.username}: ${url}`,
        undefined,
        `post_share_${post.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      );
      setShareStatus('Отправлено');
      window.setTimeout(() => setShareOpen(false), 700);
    } catch {
      setShareStatus('Не удалось отправить публикацию');
    }
  };
  const toggleFollow = async () => {
    if (isFollowUpdating) return;
    setIsFollowUpdating(true);
    setActionError('');
    try {
      await onToggleFollow(post.authorId);
    } catch {
      setActionError('Не удалось обновить подписку. Попробуйте ещё раз.');
    } finally {
      setIsFollowUpdating(false);
    }
  };

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
              {post.author.avatar ? (
                <img src={post.author.avatar.startsWith('http') ? post.author.avatar : `${API_ORIGIN}${post.author.avatar}`} alt="" />
              ) : (
                post?.author?.username?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div>
              <div className="post-handle">
                @{post?.author?.username ?? 'unknown'}
                <AdminBadge role={post?.author?.role} size={12} />
              </div>
              <div className="post-name">{post?.author?.displayName || post?.author?.username || 'Unknown'}</div>
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
            {canFollow && (
              <button
                className={`btn-follow ${isFollowing ? 'following' : ''}`}
                onClick={() => void toggleFollow()}
                disabled={isFollowUpdating}
              >
                {isFollowing ? 'Вы подписаны' : 'Подписаться'}
              </button>
            )}
            <div className="post-more-wrap">
              <button className="btn-more" onClick={() => setShowMoreMenu((value) => !value)} aria-label="Действия с публикацией">
                <MoreHorizontal size={16} />
              </button>
              {showMoreMenu && <div className="post-more-menu">
                <button onClick={() => { void copyLink(); setShowMoreMenu(false); }}>Копировать ссылку</button>
                <button onClick={() => void openShare()}>Поделиться в чате</button>
                {isOwnPost && (
                  <button
                    className="danger"
                    disabled={isDeleting}
                    onClick={() => void deletePost()}
                  >
                    {isDeleting ? 'Удаление…' : 'Удалить'}
                  </button>
                )}
              </div>}
            </div>
          </div>
        </div>
      </div>

      {post?.content && (
        <div className="post-body">
          <p className="post-text">{renderPostContent(displayContent)}</p>
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
          <button className={`stat-btn ${liked ? 'liked' : ''}`} onClick={() => void toggleLike()} title="Нравится" disabled={isLiking} aria-pressed={liked}>
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
            <span className="stat-count">{formatCount(likes)}</span>
          </button>
          <button className="stat-btn" onClick={() => void toggleComments()} title="Комментарии">
            <MessageCircle size={15} />
            <span className="stat-count">{formatCount(commentsCount)}</span>
          </button>
          <button className="stat-btn" onClick={() => void copyLink()} title="Копировать ссылку">
            <Share2 size={15} />
            {copied && <span className="post-copy-status">Скопировано</span>}
          </button>
        </div>
      </div>
      {actionError && <div className="post-action-error" role="alert">{actionError}</div>}
      {commentsOpen && <div className="post-comments-panel">
        <div className="post-comment-list">
          {comments.length ? (
            (() => {
              const roots = comments.filter((c) => !c.parentId);
              const repliesOf = (rootId: string) =>
                comments.filter((c) => c.parentId === rootId);
              const renderRow = (comment: PostComment, isReply = false) => (
                <div className={`post-comment${isReply ? ' reply' : ''}`} key={comment.id}>
                  <div className="post-comment-main">
                    <div>
                      <button
                        type="button"
                        className="post-comment-author"
                        onClick={() => navigate(`/profile/${comment.author.username}`)}
                      >
                        @{comment.author.username}
                      </button>
                      <span className={comment.isHidden ? 'post-comment-text hidden' : 'post-comment-text'}>
                        {renderTextWithMentions({
                          text: comment.text,
                          onMentionClick: (username) => navigate(`/profile/${username}`),
                          mentionClassName: 'post-comment-mention',
                        })}
                      </span>
                    </div>
                    <div className="post-comment-votes">
                      <button
                        type="button"
                        className={`post-comment-vote${comment.isLiked ? ' liked' : ''}`}
                        title="Нравится"
                        disabled={votingCommentId === comment.id}
                        onClick={() => void likeComment(comment.id)}
                      >
                        <Heart size={12} fill={comment.isLiked ? 'currentColor' : 'none'} />
                        <span>{formatCount(comment.likes ?? 0)}</span>
                      </button>
                      <button
                        type="button"
                        className={`post-comment-vote${comment.isDisliked ? ' disliked' : ''}`}
                        title={comment.isDisliked ? 'Показать комментарий' : 'Не нравится'}
                        disabled={votingCommentId === comment.id}
                        onClick={() => void dislikeComment(comment.id)}
                      >
                        <ThumbsDown size={12} fill={comment.isDisliked ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        className="post-comment-reply-btn"
                        onClick={() => startReply(comment)}
                      >
                        Ответить
                      </button>
                    </div>
                  </div>
                  {currentUserId === comment.authorId && (
                    <button
                      type="button"
                      className="post-comment-delete"
                      title="Удалить комментарий"
                      onClick={() => void deleteComment(comment.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
              return roots.flatMap((root) => [
                renderRow(root, false),
                ...repliesOf(root.id).map((reply) => renderRow(reply, true)),
              ]);
            })()
          ) : (
            <div className="post-comment">Комментариев пока нет.</div>
          )}
        </div>
        {replyTo && (
          <div className="post-comment-reply-bar">
            <span>
              Ответ для
              <span className="post-comment-reply-chip">@{replyTo.username}</span>
            </span>
            <button
              type="button"
              className="post-comment-reply-cancel"
              aria-label="Отменить ответ"
              onClick={cancelReply}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <form className="post-comment-form" onSubmit={submitComment}>
          <div className="post-comment-input-wrap">
            {commentText && (
              <div className="post-comment-input-backdrop" aria-hidden>
                {replyTo && commentText.startsWith(`@${replyTo.username}`) ? (
                  <>
                    <span className="post-comment-input-mention">
                      @{replyTo.username}
                    </span>
                    {commentText.slice(`@${replyTo.username}`.length)}
                  </>
                ) : (
                  commentText
                )}
              </div>
            )}
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              maxLength={1000}
              placeholder={replyTo ? `Ответ @${replyTo.username}…` : 'Написать комментарий…'}
            />
          </div>
          <button type="submit">Отправить</button>
        </form>
        {commentError && <div className="post-comment">{commentError}</div>}
      </div>}
      {shareOpen && <div className="post-share-overlay" role="dialog" aria-modal="true">
        <div className="post-share-dialog">
          <button className="post-share-close" onClick={() => setShareOpen(false)} aria-label="Закрыть"><X size={18}/></button>
          <h3>Поделиться в чате</h3>
          <p>Выберите чат, куда отправить ссылку на публикацию.</p>
          {chats.map((chat) => <button className="post-share-chat" key={chat.id} onClick={() => void shareToChat(chat)}>
            {chat.type === 'GROUP' ? chat.name || 'Группа без названия' : `@${chat.otherUser?.username || 'пользователь'}`}
          </button>)}
          {!chats.length && !shareStatus && <p>Нет доступных чатов.</p>}
          {shareStatus && <p>{shareStatus}</p>}
        </div>
      </div>}
    </motion.article>
  );
}

// ── Main Feed ──
export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const selectedTag = new URLSearchParams(location.search).get('tag')?.replace(/^#/, '').trim() || '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('trending');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const PAGE_SIZE = 30;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await postsApi.getPosts(activeTab, selectedTag, { limit: PAGE_SIZE, offset: 0 });
      setPosts(data.items ?? []);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedTag]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await postsApi.getPosts(activeTab, selectedTag, {
        limit: PAGE_SIZE,
        offset: posts.length,
      });
      setPosts((current) => {
        const seen = new Set(current.map((p) => p.id));
        return [...current, ...(data.items ?? []).filter((p) => !seen.has(p.id))];
      });
      setHasMore(Boolean(data.hasMore));
    } catch {
      /* keep current list */
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, selectedTag, posts.length, loadingMore, hasMore]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    void followsApi.getFollowingIds().then(setFollowingIds).catch(() => setFollowingIds([]));
  }, []);

  const toggleFollow = useCallback(async (userId: string) => {
    const isFollowing = followingIds.includes(userId);
    const response = isFollowing
      ? await followsApi.unfollow(userId)
      : await followsApi.follow(userId);

    setFollowingIds((current) => response.following
      ? [...new Set([...current, userId])]
      : current.filter((id) => id !== userId));
  }, [followingIds]);

  useEffect(() => {
    const postId = new URLSearchParams(location.search).get('p');
    if (!postId) return;
    void postsApi.getPost(postId)
      .then((post) => setPosts((current) => current.some((item) => item.id === post.id) ? current : [post, ...current]))
      .catch(() => undefined);
  }, [location.search]);

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

        {selectedTag && (
          <div className="feed-tag-filter">
            Публикации с #{selectedTag}
            <button type="button" onClick={() => navigate('/feed')} aria-label="Сбросить фильтр">
              <X size={14} />
            </button>
          </div>
        )}

        <CreatePostBlock onPostCreated={fetchPosts} />

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
              <PostCard
                key={post.id}
                post={post}
                index={idx}
                currentUserId={currentUserId}
                isFollowing={followingIds.includes(post.authorId)}
                canFollow={Boolean(currentUserId && currentUserId !== post.authorId)}
                onToggleFollow={toggleFollow}
                onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
              />
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

          {!loading && hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 32px' }}>
              <button
                type="button"
                className="feed-tab"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка…' : 'Показать ещё'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}