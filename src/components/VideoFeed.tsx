import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, X, Send, Play, Pause, Music2, Plus, Check, ThumbsDown, Trash2, MoreVertical, Repeat2, Download, Flag, Gauge, Ban } from 'lucide-react';
import { SoundTok, SoundTokAuthor, soundTokApi, Comment } from '../api/soundtok';
import { soundsApi } from '../api/sounds';
import { followsApi } from '../api/follows';
import { reportsApi, mapReportApiError } from '../api/reports';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { formatCount, formatRelativeTime, pluralizeComments } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import {
  unlockMediaPlayback,
  setSoundTokAudioPreference,
} from '../lib/mediaUnlock';
import { downloadSoundTokWithWatermark } from '../lib/soundtokDownload';
import { saveSoundTokFeedSnapshot, saveSoundTokResume } from '../lib/soundtokResume';
import { authApi } from '../api/auth';
import ShareSoundTokModal from './ShareSoundTokModal';
import AdminBadge from './AdminBadge';
import PlatinumBadge from './PlatinumBadge';
import { renderTextWithMentions } from '../utils/messageMentions';

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

const css = `
.vf-root {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0a0a0a;
}

.vf-phone {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  background: #000;
}
.vf-phone--comments .vf-stage {
  height: 38% !important;
  max-height: 38%;
  background: #000;
  transition: height 0.3s cubic-bezier(0.32, 0.72, 0, 1), max-height 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
/* Keep 9:16 shape — letterbox inside the shrunk stage (YouTube Shorts style) */
.vf-phone--comments .vf-video {
  object-fit: contain !important;
  background: #000;
}
.vf-phone--comments .vf-actions,
.vf-phone--comments .vf-bottom-info,
.vf-phone--comments .vf-create-bar,
.vf-phone--comments .vf-seek,
.vf-phone--comments .vf-top-bar {
  display: none !important;
}

/* Immersive pinch-zoom (phones only) — hide feed chrome, keep seek + mini controls */
.vf-phone .vf-actions,
.vf-phone .vf-bottom-info,
.vf-phone .vf-create-bar,
.vf-phone .vf-top-bar {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.vf-phone--zoomed .vf-actions,
.vf-phone--zoomed .vf-bottom-info,
.vf-phone--zoomed .vf-create-bar,
.vf-phone--zoomed .vf-top-bar,
.vf-phone--zoomed .vf-tap-hearts,
.vf-phone--zoomed .vf-pause-icon,
.vf-phone--zoomed .vf-loading {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: translateY(6px);
}
.vf-phone--chrome-in .vf-actions,
.vf-phone--chrome-in .vf-bottom-info,
.vf-phone--chrome-in .vf-create-bar {
  animation: vf-chrome-in 0.2s ease-out;
}
@keyframes vf-chrome-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
.vf-phone .vf-video {
  will-change: transform;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.vf-phone--pinching .vf-video {
  transition: none !important;
}
.vf-zoom-chrome {
  display: none;
}
@media (max-width: 768px) {
  .vf-phone--zoomed .vf-zoom-chrome {
    display: flex;
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    z-index: 22;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    pointer-events: none;
  }
  .vf-phone--zoomed .vf-seek {
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    z-index: 21;
  }
  .vf-zoom-close {
    pointer-events: auto;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 999px;
    background: rgba(20, 20, 20, 0.72);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .vf-zoom-pill {
    pointer-events: auto;
    display: flex;
    align-items: center;
    height: 44px;
    border-radius: 999px;
    background: rgba(20, 20, 20, 0.72);
    backdrop-filter: blur(8px);
    overflow: hidden;
  }
  .vf-zoom-pill button {
    appearance: none;
    border: none;
    background: transparent;
    color: #fff;
    height: 100%;
    min-width: 48px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font: 600 14px/1 'DM Mono', monospace;
  }
  .vf-zoom-pill button + button {
    border-left: 1px solid rgba(255,255,255,0.18);
  }
}

.vf-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
  user-select: none;
}

.vf-profile-peek {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background:
    radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.06), transparent 55%),
    #0a0a0a;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease-out;
}
.vf-profile-peek.is-on {
  opacity: 1;
}
.vf-profile-peek-avatar {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.35);
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 700 32px/1 'Syne', system-ui, sans-serif;
  color: #fff;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
}
.vf-profile-peek-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.vf-profile-peek-name {
  font: 700 18px/1.2 'Syne', system-ui, sans-serif;
  color: #fff;
  letter-spacing: -0.02em;
}
.vf-profile-peek-hint {
  font: 500 12px/1 'DM Mono', monospace;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vf-stage-track {
  position: absolute;
  inset: 0;
  z-index: 2;
  will-change: transform;
}

.vf-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
  pointer-events: none;
}

.vf-top-title {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 6px rgba(0,0,0,0.6);
}

.vf-video-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 6;
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vf-spin-loader 0.7s linear infinite;
}

@keyframes vf-spin-loader {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.vf-music-disc {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.55);
  background: #1a1a1a;
  margin-top: 6px;
  animation: vf-spin 4s linear infinite;
  box-shadow: 0 2px 10px rgba(0,0,0,0.45);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  flex-shrink: 0;
}

.vf-music-disc::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.35);
  pointer-events: none;
  z-index: 1;
}

.vf-music-disc img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vf-music-disc-letter {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.vf-create-bar {
  display: none;
}

.vf-tap-hearts {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 12;
  overflow: hidden;
}
.vf-tap-heart {
  position: absolute;
  color: #fe2c55;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.45));
  animation: vf-tap-heart 0.85s ease-out forwards;
  transform: translate(-50%, -50%) scale(0.6);
}
@keyframes vf-tap-heart {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
  15% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  100% { opacity: 0; transform: translate(-50%, -120%) scale(1.35); }
}

.vf-speed-menu,
.vf-report-modal {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0,0,0,0.55);
  padding: 16px;
}
.vf-speed-card,
.vf-report-card {
  width: 100%;
  max-width: 420px;
  background: #161616;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 16px;
  color: #fff;
}
.vf-speed-title,
.vf-report-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}
.vf-speed-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.vf-speed-btn {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.14);
  background: #222;
  color: #fff;
  border-radius: 10px;
  padding: 12px 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.vf-speed-btn.active {
  background: #fff;
  color: #111;
  border-color: #fff;
}
.vf-report-textarea {
  width: 100%;
  min-height: 110px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  background: #111;
  color: #fff;
  padding: 12px;
  resize: vertical;
  font: inherit;
  margin-bottom: 12px;
}
.vf-report-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.vf-report-actions button {
  appearance: none;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.vf-report-cancel {
  background: #2a2a2a;
  color: #ddd;
}
.vf-report-submit {
  background: #c0392b;
  color: #fff;
}
.vf-report-submit:disabled {
  opacity: 0.5;
  cursor: default;
}
.vf-report-error {
  color: #ff8a80;
  font-size: 12px;
  margin-bottom: 10px;
}

.vf-share-label {
  /* keep count styling aligned with likes */
}

.vf-desc-expanded {
  -webkit-line-clamp: unset;
  display: block;
}

.vf-desc-toggle {
  background: none;
  border: none;
  color: rgba(255,255,255,0.65);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  margin-top: 4px;
  cursor: pointer;
}

.vf-video-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
  touch-action: none;
  backface-visibility: hidden;
}

.vf-video {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  object-position: center;
  cursor: pointer;
  background: #000;
}

.vf-pause-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  opacity: 0.85;
  pointer-events: none;
  z-index: 5;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
}

.vf-gradient-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(rgba(0,0,0,0.45), transparent);
  pointer-events: none;
  z-index: 2;
}

.vf-gradient-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 220px;
  background: linear-gradient(transparent, rgba(0,0,0,0.75));
  pointer-events: none;
  z-index: 2;
}

.vf-bottom-info {
  position: absolute;
  left: 0;
  right: 72px;
  bottom: 14px;
  padding: 16px;
  z-index: 8;
  color: #fff;
  min-width: 0;
}

.vf-seek {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 14;
  padding: 10px 12px 8px;
  touch-action: none;
  cursor: pointer;
}
.vf-seek-track {
  position: relative;
  height: 3px;
  border-radius: 999px;
  background: rgba(255,255,255,0.28);
  transition: height 0.12s ease;
}
.vf-seek.active .vf-seek-track,
.vf-seek:hover .vf-seek-track {
  height: 6px;
}
.vf-seek-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #fff;
  pointer-events: none;
  transform: scaleX(var(--seek-p, 0));
  transform-origin: left center;
  will-change: transform;
}
.vf-seek-thumb {
  position: absolute;
  top: 50%;
  left: calc(var(--seek-p, 0) * 100%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%) scale(0);
  box-shadow: 0 1px 4px rgba(0,0,0,0.45);
  pointer-events: none;
  will-change: left, transform;
  transition: transform 0.12s ease;
}
.vf-seek.active .vf-seek-thumb,
.vf-seek:hover .vf-seek-thumb {
  transform: translate(-50%, -50%) scale(1);
}
.vf-seek-time {
  position: absolute;
  left: 12px;
  bottom: 22px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.7);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.vf-seek.active .vf-seek-time,
.vf-seek:hover .vf-seek-time {
  opacity: 1;
}

.vf-author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.vf-author-name {
  appearance: none;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  cursor: pointer;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}
.vf-author-name:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vf-follow-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.8);
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.vf-description {
  font-size: 14px;
  line-height: 1.45;
  margin-bottom: 10px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vf-music-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
  max-width: 100%;
  appearance: none;
  background: transparent;
  border: none;
  color: inherit;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.vf-music-row:hover span {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vf-music-row span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vf-music-icon {
  flex-shrink: 0;
  animation: vf-spin 3s linear infinite;
}

@keyframes vf-spin {
  to { transform: rotate(360deg); }
}

/* ── Action bar: sits just above the seek scrubber ── */
.vf-actions {
  position: absolute;
  top: auto;
  right: max(10px, env(safe-area-inset-right, 0px));
  bottom: 36px;
  transform: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  z-index: 9;
}

.vf-action-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 14px;
}

.vf-author-block {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 18px;
}

.vf-author-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.vf-author-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-follow-btn {
  position: relative;
  margin-top: -11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fe2c55;
  border: 2px solid #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.15s ease, background 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
}

.vf-follow-btn:hover {
  transform: scale(1.1);
  background: #ff4466;
}

.vf-follow-btn:active {
  transform: scale(0.92);
}

.vf-follow-btn.following {
  background: #2a2a2a;
  border-color: rgba(255,255,255,0.9);
  width: 20px;
  height: 20px;
  margin-top: -10px;
}

.vf-follow-btn svg {
  stroke-width: 3;
}

.vf-action-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.vf-action-btn.vf-share-btn {
  background: transparent;
  border: none;
  padding: 0;
}

.vf-action-btn.vf-share-btn:hover {
  background: transparent;
}

.vf-share-icon {
  display: block;
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.vf-action-btn:active {
  transform: scale(0.9);
}

.vf-action-btn.liked {
  color: #fe2c55;
}
.vf-like-pop {
  transform-origin: center;
  animation: vf-like-pop 0.48s cubic-bezier(0.2, 0.9, 0.25, 1.25);
}
@keyframes vf-like-pop {
  0% { transform: scale(0.72) rotate(-8deg); }
  45% { transform: scale(1.38) rotate(5deg); filter: drop-shadow(0 0 10px rgba(254,44,85,0.75)); }
  72% { transform: scale(0.9) rotate(-2deg); }
  100% { transform: scale(1) rotate(0); }
}

.vf-action-btn.danger:hover {
  color: #f5a9a3;
}

.vf-action-count {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-top: 2px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.7);
  min-width: 48px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.vf-repost-attr {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  margin: 0 0 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.92);
  font: inherit;
  text-align: left;
  text-shadow: 0 1px 4px rgba(0,0,0,0.65);
  pointer-events: auto;
}

button.vf-repost-attr {
  cursor: pointer;
}

button.vf-repost-attr:hover {
  color: #fff;
}

.vf-repost-attr-static {
  cursor: default;
}

.vf-repost-avatars {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.vf-repost-avatar {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.55);
  background: #2a2a2a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  margin-left: -7px;
}

.vf-repost-avatar:first-child {
  margin-left: 0;
}

.vf-repost-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-repost-attr-text {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vf-repost-attr-user {
  font-weight: 700;
}

.vf-repost-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 4px;
  border: none;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.vf-repost-list-item:hover {
  background: rgba(255,255,255,0.04);
}

.vf-repost-list-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.vf-repost-list-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-repost-list-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vf-repost-list-name {
  font-size: 14px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vf-repost-list-user {
  font-size: 12px;
  color: rgba(255,255,255,0.55);
}

.vf-more-wrap {
  position: relative;
}

.vf-more-sheet {
  max-height: min(70dvh, 520px);
  touch-action: none;
}
.vf-more-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 10px 16px;
  overflow-y: auto;
}

.vf-more-item {
  appearance: none;
  border: none;
  background: transparent;
  color: #f1f1f1;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
}

.vf-more-item:hover,
.vf-more-item:active {
  background: rgba(255,255,255,0.08);
}

.vf-more-item.danger {
  color: #f5a9a3;
}

.vf-more-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Comments bottom sheet (TikTok style) ── */
.vf-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1100;
  animation: vf-fade-in 0.25s ease;
}
.vf-sheet-backdrop.vf-sheet-backdrop--closing {
  animation: vf-fade-out 0.26s ease forwards;
}

@keyframes vf-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes vf-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

.vf-sheet {
  position: fixed;
  left: 50%;
  bottom: var(--vf-keyboard-inset, 0px);
  transform: translateX(-50%);
  width: min(100%, 480px);
  max-height: min(88dvh, calc(100dvh - var(--vf-keyboard-inset, 0px) - 8px), 720px);
  background: #121212;
  border-radius: 16px 16px 0 0;
  z-index: 1101;
  display: flex;
  flex-direction: column;
  animation: vf-slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  overflow: hidden;
  will-change: transform;
}
.vf-sheet.vf-sheet--closing {
  animation: vf-slide-down 0.26s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  pointer-events: none;
}

.vf-sheet.vf-sheet--comments {
  height: min(58dvh, 520px);
  max-height: min(58dvh, 520px);
}
html.vf-keyboard-open .vf-sheet.vf-sheet--comments {
  height: auto;
  max-height: calc(100dvh - var(--vf-keyboard-inset, 0px));
  min-height: min(42dvh, 360px);
}

@keyframes vf-slide-up {
  from { transform: translateX(-50%) translateY(100%); }
  to { transform: translateX(-50%) translateY(0); }
}
@keyframes vf-slide-down {
  from { transform: translateX(-50%) translateY(0); }
  to { transform: translateX(-50%) translateY(110%); }
}

.vf-sheet-handle {
  width: 36px;
  height: 4px;
  padding: 12px 0 8px;
  margin: 0 auto;
  background: rgba(255,255,255,0.25);
  background-clip: content-box;
  border-radius: 2px;
  touch-action: none;
  cursor: grab;
  flex-shrink: 0;
}

.vf-sheet-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 8px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  touch-action: none;
}

.vf-sheet-title {
  font-size: 14px;
  font-weight: 600;
  color: #f1f1f1;
}

.vf-sheet-close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.vf-comments-list {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 16px;
}

.vf-comments-list::-webkit-scrollbar {
  width: 4px;
}

.vf-comments-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}

.vf-comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.vf-comment-item.reply {
  margin-left: 28px;
  padding-left: 10px;
  border-left: 2px solid rgba(255,255,255,0.08);
}

.vf-comment-item.is-reply-target {
  background: rgba(110, 168, 254, 0.1);
  box-shadow: inset 0 0 0 1px rgba(110, 168, 254, 0.22);
  padding-left: 8px;
  padding-right: 8px;
}

.vf-comment-avatar {
  appearance: none;
  border: none;
  padding: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.vf-comment-avatar:hover {
  outline: 1px solid rgba(255,255,255,0.25);
}

.vf-comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-comment-body {
  flex: 1;
  min-width: 0;
}

.vf-comment-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.vf-comment-user {
  appearance: none;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
}

.vf-comment-user:hover {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.vf-comment-time {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}

.vf-comment-text {
  font-size: 14px;
  line-height: 1.45;
  color: #f1f1f1;
  word-break: break-word;
}

.vf-comment-text.hidden {
  color: rgba(255,255,255,0.4);
  font-style: italic;
}

.vf-comment-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.vf-comment-vote {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  min-height: 36px;
  padding: 8px 4px;
  font-size: 12px;
}

.vf-comment-vote:hover {
  color: rgba(255,255,255,0.8);
}

.vf-comment-vote.liked {
  color: #fe2c55;
}

.vf-comment-vote.disliked {
  color: #8b9cff;
}

.vf-comment-reply {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  padding: 8px 4px;
  min-height: 36px;
  font-size: 12px;
  font-weight: 600;
}

.vf-comment-reply:hover {
  color: #fff;
}

.vf-comment-delete {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  min-width: 40px;
  min-height: 40px;
  border-radius: 8px;
}

.vf-comment-delete:hover {
  color: #f5a9a3;
}

.vf-comment-delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.vf-sheet-composer {
  flex-shrink: 0;
  background: #121212;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 0 8px;
}
/* Kill any gap between composer and keyboard on phones */
html.vf-keyboard-open .vf-sheet-composer {
  padding-bottom: 0 !important;
  padding-top: 0;
  border-top-color: transparent;
}
html.vf-keyboard-open .vf-emoji-row {
  padding-top: 6px;
  padding-bottom: 0;
}
html.vf-keyboard-open .vf-sheet-input {
  padding-top: 8px;
  padding-bottom: 0;
}
html.vf-keyboard-open .vf-composer-hint {
  display: none !important;
}
.vf-emoji-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 10px 14px 0;
}
.vf-emoji-btn {
  appearance: none;
  border: none;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  padding: 4px;
  cursor: pointer;
  flex: 1;
  border-radius: 10px;
}
.vf-emoji-btn:active {
  background: rgba(255,255,255,0.08);
}
.vf-composer-avatar {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
  margin-bottom: 2px;
}
.vf-composer-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px 0;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
}

.vf-reply-bar > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vf-reply-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(110, 168, 254, 0.22);
  color: #9ec4ff;
  font-weight: 700;
}

.vf-reply-cancel {
  border: 0;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vf-reply-cancel:hover {
  color: #fff;
  background: rgba(255,255,255,0.14);
}

.vf-empty-comments {
  text-align: center;
  padding: 48px 20px;
  color: rgba(255,255,255,0.4);
  font-size: 14px;
}

.vf-comments-loading {
  text-align: center;
  padding: 32px;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
}

.vf-sheet-input {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 14px 0;
  flex-shrink: 0;
  background: transparent;
}

.vf-comment-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  background: #2a2a2a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 22px;
  padding: 2px;
}
.vf-comment-input-backdrop {
  position: absolute;
  inset: 2px;
  padding: 11px 14px;
  border-radius: 20px;
  font: 16px/1.4 inherit;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: hidden;
  overflow-y: auto;
  color: #fff;
  pointer-events: none;
  z-index: 0;
  scrollbar-width: none;
}

.vf-comment-input-backdrop::-webkit-scrollbar {
  display: none;
}

.vf-comment-input-mention {
  color: #8eb8ff;
  font-weight: 700;
  background: rgba(110, 168, 254, 0.22);
  border-radius: 4px;
}

.vf-sheet-input textarea {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  min-height: 44px;
  max-height: 120px;
  resize: none;
  background: transparent;
  border: none;
  border-radius: 20px;
  padding: 11px 14px;
  color: #fff;
  caret-color: #fe2c55;
  font-size: 16px;
  line-height: 1.4;
  outline: none;
  overflow-y: auto;
  field-sizing: content;
}

.vf-sheet-input textarea::placeholder {
  color: rgba(255,255,255,0.38);
  opacity: 1;
  -webkit-text-fill-color: rgba(255,255,255,0.38);
}

.vf-sheet-input textarea:not(:placeholder-shown) {
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.vf-comment-mention {
  display: inline;
  margin: 0;
  padding: 0 2px;
  border: none;
  border-radius: 3px;
  background: rgba(110, 168, 254, 0.18);
  color: #8eb8ff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.vf-comment-mention:hover {
  text-decoration: underline;
}

.vf-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #fe2c55;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.12s;
}

.vf-send-btn:not(:disabled):active {
  transform: scale(0.96);
}

.vf-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.vf-composer-hint {
  margin: 6px 16px 0;
  font-size: 11px;
  color: rgba(255,255,255,0.32);
  font-family: 'DM Mono', monospace;
}

@media (max-width: 768px) {
  .vf-phone {
    width: 100%;
    max-width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .vf-top-bar,
  .vf-top-title {
    display: none !important;
  }

  .vf-actions {
    right: max(8px, env(safe-area-inset-right, 0px));
    bottom: 56px;
    z-index: 9;
    gap: 0;
  }

  .vf-action-group {
    margin-bottom: 0;
  }

  .vf-author-block {
    margin-bottom: 2px;
  }

  .vf-music-disc {
    margin-top: 2px;
  }

  .vf-bottom-info {
    left: 12px;
    right: 72px;
    bottom: 56px;
    padding: 8px 8px 0;
  }

  .vf-create-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 56px;
    right: 56px;
    bottom: 14px;
    z-index: 10;
    height: 28px;
    border: none;
    border-radius: 9px;
    background: rgba(255,255,255,0.94);
    color: #111;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.28);
  }
  .vf-create-bar:active {
    transform: scale(0.985);
  }
  .vf-create-bar svg {
    width: 15px;
    height: 15px;
    stroke-width: 2.6;
  }

  .vf-seek {
    padding-bottom: 8px;
  }

  .vf-action-btn {
    width: 42px;
    height: 42px;
  }
  .vf-action-btn svg {
    width: 24px;
    height: 24px;
  }
  .vf-action-count {
    font-size: 11px;
    margin-top: 0;
    line-height: 1.1;
  }

  .vf-sheet.vf-sheet--comments {
    height: min(58dvh, 520px);
    max-height: min(58dvh, 520px);
  }
  .vf-phone--comments .vf-stage {
    height: 36% !important;
    max-height: 36%;
  }
  .vf-phone--comments .vf-video {
    object-fit: contain !important;
  }

  .vf-description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .vf-comment-item.reply {
    margin-left: 14px;
    padding-left: 8px;
  }

  .vf-comment-vote,
  .vf-comment-reply {
    min-height: 40px;
  }

  .vf-composer-hint {
    display: none;
  }

  .vf-sheet-composer {
    padding-bottom: 0;
  }
}

/* Guest fullscreen (outside Layout) — restore home-indicator padding */
.st-root--guest .vf-bottom-info {
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
}
.st-root--guest .vf-actions {
  right: max(12px, env(safe-area-inset-right, 0px));
  bottom: calc(36px + env(safe-area-inset-bottom, 0px));
}
@media (max-width: 768px) {
  .st-root--guest .vf-actions {
    bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }
  .st-root--guest .vf-bottom-info {
    bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }
  .st-root--guest .vf-create-bar {
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  }
}
.st-root--guest .vf-seek {
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}
.st-root--guest .vf-seek-time {
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 769px) {
  .vf-phone {
    height: 100%;
    width: auto;
    aspect-ratio: 9 / 16;
    max-width: min(480px, calc(100% - 32px));
    border-radius: 16px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 24px 64px rgba(0, 0, 0, 0.55);
  }

  .vf-bottom-info {
    padding-bottom: 20px;
  }
}

@media (max-width: 380px) {
  .vf-action-btn {
    width: 44px;
    height: 44px;
  }
  .vf-bottom-info {
    padding-left: 12px;
  }
}
`;

interface VideoFeedProps {
  soundToks: SoundTok[];
  onLike: (id: string) => void;
  onCommentCountChange?: (id: string, count: number) => void;
  onDeleted?: (id: string) => void;
  initialIndex?: number;
  initialOpenComments?: boolean;
  /** Fired when the user is near the end — used to prefetch the next page. */
  onNearEnd?: () => void;
  guestMode?: boolean;
  onNeedAuth?: () => void;
  onCreateClick?: () => void;
}

type TapHeart = { id: number; x: number; y: number };

function ShareCurvedIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="vf-share-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13.25 3.85c.2-.45.7-.68 1.18-.52.16.05.3.15.4.28l6.05 7.05c.35.4.32 1.02-.07 1.38l-6.05 5.55c-.4.37-1.02.34-1.39-.07-.2-.22-.28-.52-.23-.8l.45-2.7c-4.35.45-7.55 3.55-7.9 7.95-.04.5-.46.88-.96.88h-.08c-.55-.04-.96-.52-.92-1.07.5-6.05 5.05-10.7 10.85-11.35l-.48-2.68c-.08-.48.15-.96.6-1.15.15-.06.3-.08.45-.05z" />
    </svg>
  );
}

function CommentAvatar({
  author,
  onOpen,
}: {
  author: Comment['author'];
  onOpen: () => void;
}) {
  const url = resolveMediaUrl(author.avatar);
  const label = (author.displayName || author.username)[0]?.toUpperCase() ?? '?';

  return (
    <button
      type="button"
      className="vf-comment-avatar"
      onClick={onOpen}
      title={`@${author.username}`}
      aria-label={`Профиль @${author.username}`}
    >
      {url ? <img src={url} alt={author.username} /> : label}
    </button>
  );
}

export default function VideoFeed({
  soundToks,
  onLike,
  onCommentCountChange,
  onDeleted,
  initialIndex = 0,
  initialOpenComments = false,
  onNearEnd,
  guestMode = false,
  onNeedAuth,
  onCreateClick,
}: VideoFeedProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [followedAuthors, setFollowedAuthors] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(soundToks.length - 1, 0))
  );
  const [shareTok, setShareTok] = useState<SoundTok | null>(null);
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState<null | 'comments' | 'more' | 'reposts'>(null);
  // True only while comments are fully open (not during close animation)
  const commentsLayoutOpen = commentsOpen && sheetClosing !== 'comments';
  const sheetCloseTimerRef = useRef<number | null>(null);
  const [currentSoundTokId, setCurrentSoundTokId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deletingSoundTokId, setDeletingSoundTokId] = useState<string | null>(null);
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [repostState, setRepostState] = useState<
    Record<string, { isReposted: boolean; repostsCount: number; repostPreview?: SoundTokAuthor[] }>
  >({});
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({});
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
  const [speedPickerOpen, setSpeedPickerOpen] = useState(false);
  const [reportTok, setReportTok] = useState<SoundTok | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [tapHearts, setTapHearts] = useState<TapHeart[]>([]);
  const [likePulse, setLikePulse] = useState({ tokId: '', seq: 0 });
  const [repostsSheetId, setRepostsSheetId] = useState<string | null>(null);
  const [repostUsers, setRepostUsers] = useState<Array<{ id: string; createdAt: string; user: SoundTokAuthor }>>([]);
  const [repostsLoading, setRepostsLoading] = useState(false);
  const recordedViewsRef = useRef<Set<string>>(new Set());
  const [zoomMode, setZoomMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPan, setZoomPan] = useState({ x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const [chromeEntering, setChromeEntering] = useState(false);
  const zoomModeRef = useRef(false);
  const zoomScaleRef = useRef(1);
  const zoomPanRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const pinchStartMidRef = useRef({ x: 0, y: 0 });
  const pinchStartPanRef = useRef({ x: 0, y: 0 });
  const pinchActiveRef = useRef(false);
  const suppressTapUntilRef = useRef(0);
  const zoomSettleRafRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const moreSheetRef = useRef<HTMLDivElement>(null);
  const commentsSheetRef = useRef<HTMLDivElement>(null);
  const repostsSheetRef = useRef<HTMLDivElement>(null);
  const sheetDragRef = useRef<{
    el: HTMLDivElement | null;
    startY: number;
    active: boolean;
    onClose: (() => void) | null;
  }>({ el: null, startY: 0, active: false, onClose: null });

  const requireAuth = useCallback(() => {
    if (onNeedAuth) onNeedAuth();
    else navigate('/login');
  }, [onNeedAuth, navigate]);

  const [isPaused, setIsPaused] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const bedAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const failedExternalSoundIdsRef = useRef<Set<string>>(new Set());
  const confirmedExternalSoundIdsRef = useRef<Set<string>>(new Set());
  const [, refreshMediaFallbacks] = useState(0);
  const soundEnabledRef = useRef(soundEnabled);
  const commentsOpenRef = useRef(false);
  const isPausedRef = useRef(false);
  const feedToks = useMemo(
    () => soundToks.filter((tok) => !hiddenIds[tok.id]),
    [soundToks, hiddenIds],
  );
  const soundToksRef = useRef(feedToks);
  soundToksRef.current = feedToks;
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const singleTapTimerRef = useRef<number | null>(null);
  const tapHeartIdRef = useRef(0);
  const playbackRateRef = useRef<PlaybackSpeed>(playbackRate);
  playbackRateRef.current = playbackRate;

  const markExternalSoundFailed = useCallback((tokId: string) => {
    if (failedExternalSoundIdsRef.current.has(tokId)) return;
    failedExternalSoundIdsRef.current.add(tokId);
    confirmedExternalSoundIdsRef.current.delete(tokId);
    refreshMediaFallbacks((value) => value + 1);
  }, []);

  const markExternalSoundReady = useCallback((tokId: string) => {
    if (confirmedExternalSoundIdsRef.current.has(tokId)) return;
    confirmedExternalSoundIdsRef.current.add(tokId);
    refreshMediaFallbacks((value) => value + 1);
  }, []);

  const usesExternalSound = (tok: SoundTok | undefined) =>
    Boolean(
      tok?.sound?.audioUrl &&
      tok.sound.audioUrl !== tok.videoUrl &&
      !failedExternalSoundIdsRef.current.has(tok.id),
    );

  const shouldMuteForExternalSound = (tok: SoundTok | undefined) =>
    Boolean(tok && usesExternalSound(tok) && confirmedExternalSoundIdsRef.current.has(tok.id));

  const openSoundPage = async (tok: SoundTok, e: React.MouseEvent) => {
    e.stopPropagation();
    if (guestMode) {
      requireAuth();
      return;
    }
    try {
      const existingId = tok.sound?.id || tok.soundId;
      if (existingId) {
        navigate(`/soundtok/sound/${existingId}`);
        return;
      }
      const sound = await soundsApi.fromVideo(tok.id);
      navigate(`/soundtok/sound/${sound.id}`);
    } catch (err) {
      console.error('Failed to open sound page:', err);
    }
  };

  const [dragOffset, setDragOffset] = useState(0);
  const dragOffsetRef = useRef(0);
  const [profileSwipeX, setProfileSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekAria, setSeekAria] = useState({ now: 0, max: 0 });
  const [stageHeightPx, setStageHeightPx] = useState(0);
  const stageHeightPxRef = useRef(0);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const touchLastY = useRef(0);
  const touchLastX = useRef(0);
  const touchVelocity = useRef(0);
  const touchVelocityX = useRef(0);
  const lastTouchTime = useRef(0);
  /** null = undecided, v = vertical feed, h = horizontal profile */
  const gestureAxisRef = useRef<'v' | 'h' | null>(null);
  const profileSwipeXRef = useRef(0);
  const profileAnimatingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const wheelAccum = useRef(0);
  const wheelLockUntil = useRef(0);
  const wheelIdleTimer = useRef<number | null>(null);
  const wheelGestureId = useRef(0);
  /** True after we've consumed one flip for the current trackpad gesture */
  const wheelGestureConsumedRef = useRef(false);
  const wheelLastAtRef = useRef(0);
  const wheelLastAbsRef = useRef(0);
  const wheelLastDirectionRef = useRef<1 | -1 | 0>(0);
  const wheelRiseStreakRef = useRef(0);
  const isSeekingRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsLayoutOpenRef = useRef(false);
  commentsLayoutOpenRef.current = commentsLayoutOpen;

  const resizeCommentField = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };
  const stageRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const seekTimeRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(0);
  const progressRafRef = useRef<number | null>(null);
  const lastSeekApplyRef = useRef(0);
  const pendingSeekRatioRef = useRef<number | null>(null);
  const openedCommentsFromQueryRef = useRef(false);

  const FLING_VELOCITY_THRESHOLD = 0.55;
  const DRAG_THRESHOLD = 64;
  const PROFILE_SWIPE_THRESHOLD = 96;
  /** Trackpad needs a bigger nudge than a mouse notch */
  const WHEEL_THRESHOLD = 56;
  /** Minimum guard; a new accelerated finger gesture can unlock after this. */
  const WHEEL_COOLDOWN_MS = 220;
  const WHEEL_IDLE_MS = 180;

  const getStageHeight = useCallback(() => {
    const measured = stageRef.current?.clientHeight || 0;
    return stageHeightPxRef.current || measured || stageHeightPx || 0;
  }, [stageHeightPx]);

  const getCommentCount = (tok: SoundTok) =>
    localCounts[tok.id] ?? tok.commentsCount ?? 0;

  const toggleFollow = async (authorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (guestMode) {
      requireAuth();
      return;
    }
    if (isOwnVideo(authorId) || followLoading[authorId]) return;

    const wasFollowing = !!followedAuthors[authorId];
    setFollowedAuthors((prev) => ({ ...prev, [authorId]: !wasFollowing }));
    setFollowLoading((prev) => ({ ...prev, [authorId]: true }));

    try {
      if (wasFollowing) {
        await followsApi.unfollow(authorId);
      } else {
        await followsApi.follow(authorId);
      }
    } catch (error) {
      setFollowedAuthors((prev) => ({ ...prev, [authorId]: wasFollowing }));
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [authorId]: false }));
    }
  };

  const isOwnVideo = (authorId: string) => !guestMode && currentUser?.id === authorId;

  const getRepostMeta = (tok: SoundTok) => {
    const local = repostState[tok.id];
    return {
      isReposted: local?.isReposted ?? !!tok.isReposted,
      repostsCount: local?.repostsCount ?? tok.repostsCount ?? 0,
      repostPreview: local?.repostPreview ?? tok.repostPreview ?? [],
    };
  };

  const openRepostsSheet = async (soundTokId: string) => {
    if (sheetCloseTimerRef.current != null) {
      window.clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
    setSheetClosing(null);
    setRepostsSheetId(soundTokId);
    setRepostsLoading(true);
    try {
      const data = await soundTokApi.getReposts(soundTokId, { limit: 50, offset: 0 });
      setRepostUsers(data.items);
    } catch (error) {
      console.error('Failed to load reposts:', error);
      setRepostUsers([]);
    } finally {
      setRepostsLoading(false);
    }
  };

  const handleDownloadSoundTok = async (tok: SoundTok) => {
    if (downloadingId) return;
    setDownloadingId(tok.id);
    setMenuOpenId(null);
    try {
      await downloadSoundTokWithWatermark({
        videoUrl: tok.videoUrl,
        audioUrl: usesExternalSound(tok) ? tok.sound?.audioUrl : null,
        filename: `soundlab-${tok.author?.username || 'soundtok'}-${tok.id.slice(-6)}`,
      });
    } catch (error) {
      console.error('Failed to download SoundTok:', error);
      window.alert('Не удалось скачать видео. Попробуйте ещё раз.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleNotInterested = (tok: SoundTok) => {
    setMenuOpenId(null);
    setHiddenIds((prev) => ({ ...prev, [tok.id]: true }));
  };

  const submitVideoReport = async () => {
    if (!reportTok) return;
    const details = reportText.trim();
    if (details.length < 3) {
      setReportError('Напишите коротко, что не так с видео');
      return;
    }
    setReportSending(true);
    setReportError('');
    try {
      await reportsApi.create({
        reportedUserId: reportTok.authorId,
        reason: 'OTHER',
        details: `SoundTok ${reportTok.id}: ${details}`.slice(0, 1000),
      });
      setReportTok(null);
      setReportText('');
      setMenuOpenId(null);
      window.alert('Жалоба отправлена. Спасибо!');
    } catch (error) {
      setReportError(mapReportApiError(error));
    } finally {
      setReportSending(false);
    }
  };

  const handleToggleRepost = async (tok: SoundTok) => {
    if (guestMode) {
      requireAuth();
      setMenuOpenId(null);
      return;
    }
    if (repostingId) return;
    const meta = getRepostMeta(tok);
    const nextIsReposted = !meta.isReposted;
    const optimisticPreview = (() => {
      if (!currentUser) return meta.repostPreview;
      if (nextIsReposted) {
        if (meta.repostPreview.some((u) => u.id === currentUser.id)) return meta.repostPreview;
        if (meta.repostsCount >= 3) return meta.repostPreview;
        return [
          ...meta.repostPreview,
          {
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar,
          },
        ].slice(0, 3);
      }
      return meta.repostPreview.filter((u) => u.id !== currentUser.id);
    })();
    setRepostState((prev) => ({
      ...prev,
      [tok.id]: {
        isReposted: nextIsReposted,
        repostsCount: Math.max(0, meta.repostsCount + (nextIsReposted ? 1 : -1)),
        repostPreview: optimisticPreview,
      },
    }));
    setRepostingId(tok.id);
    try {
      const result = nextIsReposted
        ? await soundTokApi.repostSoundTok(tok.id)
        : await soundTokApi.unrepostSoundTok(tok.id);
      setRepostState((prev) => ({
        ...prev,
        [tok.id]: {
          isReposted: Boolean(result.isReposted),
          repostsCount: Math.max(0, result.repostsCount ?? 0),
          repostPreview: Array.isArray(result.repostPreview)
            ? result.repostPreview
            : optimisticPreview,
        },
      }));
    } catch (error) {
      setRepostState((prev) => ({
        ...prev,
        [tok.id]: meta,
      }));
      console.error('Failed to toggle repost:', error);
    } finally {
      setRepostingId(null);
      setMenuOpenId(null);
    }
  };

  // Only jump when parent asks (resume / deep-link) — never on load-more length growth
  useEffect(() => {
    if (soundToks.length === 0) return;
    const safeIndex = Math.min(Math.max(initialIndex, 0), soundToks.length - 1);
    setCurrentIndex(safeIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (soundToks.length === 0) return;
    setCurrentIndex((prev) => Math.min(prev, soundToks.length - 1));
  }, [soundToks.length]);

  useEffect(() => {
    const tok = feedToks[currentIndex];
    if (tok?.id) saveSoundTokResume(tok.id);
  }, [currentIndex, feedToks]);

  useEffect(() => {
    if (!onNearEnd || feedToks.length === 0) return;
    if (currentIndex >= feedToks.length - 3) {
      onNearEnd();
    }
  }, [currentIndex, feedToks.length, onNearEnd]);

  // Merge follow flags from feed rows cheaply as pages append
  useEffect(() => {
    if (!currentUser || guestMode) return;
    const fromVideos: Record<string, boolean> = {};
    soundToks.forEach((tok) => {
      if (tok.authorIsFollowed) fromVideos[tok.authorId] = true;
    });
    if (Object.keys(fromVideos).length === 0) return;
    setFollowedAuthors((prev) => ({ ...prev, ...fromVideos }));
  }, [currentUser, soundToks, guestMode]);

  // Full following list once per session user — not on every feed page
  useEffect(() => {
    if (!currentUser || guestMode) return;
    followsApi
      .getFollowingIds()
      .then((ids) => {
        const map: Record<string, boolean> = {};
        ids.forEach((id) => {
          map[id] = true;
        });
        setFollowedAuthors((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {
        // Non-critical — feed already has authorIsFollowed; don't spam console on slow networks
      });
  }, [currentUser, guestMode]);

  useEffect(() => {
    // Guests record the shared video in SoundTok.tsx on load.
    if (guestMode) return;
    const tok = soundToks[currentIndex];
    if (!tok) return;
    if (recordedViewsRef.current.has(tok.id)) return;
    recordedViewsRef.current.add(tok.id);
    void soundTokApi.recordView(tok.id).catch(() => {
      recordedViewsRef.current.delete(tok.id);
    });
  }, [currentIndex, soundToks, guestMode]);

  useEffect(() => {
    setMenuOpenId(null);
  }, [currentIndex]);

  useEffect(() => {
    const counts: Record<string, number> = {};
    soundToks.forEach((t) => {
      counts[t.id] = t.commentsCount ?? 0;
    });
    setLocalCounts(counts);
  }, [soundToks]);

  useEffect(() => {
    commentsOpenRef.current = commentsLayoutOpen;
  }, [commentsLayoutOpen]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!commentsOpen) {
      document.documentElement.style.removeProperty('--vf-keyboard-inset');
      document.documentElement.classList.remove('vf-keyboard-open');
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      // Align sheet bottom to the visual viewport bottom (avoids black gap above keyboard)
      const layoutBottom = window.innerHeight;
      const visualBottom = vv.offsetTop + vv.height;
      let inset = Math.max(0, Math.round(layoutBottom - visualBottom));
      // Ignore jitter / browser chrome noise
      if (inset < 48) inset = 0;
      // interactive-widget=resizes-content already shrinks the layout viewport —
      // lifting the sheet again creates a black strip between composer and keyboard
      const docH = document.documentElement.clientHeight;
      if (docH > 0 && docH < layoutBottom - 40) {
        inset = 0;
      }
      document.documentElement.style.setProperty('--vf-keyboard-inset', `${inset}px`);
      const keyboardLikelyOpen =
        inset > 48 ||
        (docH > 0 && docH < layoutBottom - 40) ||
        document.activeElement === commentInputRef.current;
      document.documentElement.classList.toggle('vf-keyboard-open', keyboardLikelyOpen);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty('--vf-keyboard-inset');
      document.documentElement.classList.remove('vf-keyboard-open');
    };
  }, [commentsOpen]);

  const enableSound = useCallback(() => {
    unlockMediaPlayback();
    setSoundTokAudioPreference(true);
    const tok = soundToksRef.current[currentIndex];
    const external = usesExternalSound(tok);
    const video = videoRefs.current[currentIndex];
    const bed = bedAudioRefs.current[currentIndex];
    const paused = isPausedRef.current;

    soundEnabledRef.current = true;
    setSoundEnabled(true);

    if (video) {
      // Keep video unmuted until external bed is confirmed playing.
      video.muted = shouldMuteForExternalSound(tok);
      // While paused, only unlock/unmute — never auto-resume from menu taps.
      if (!paused) void video.play().catch(() => undefined);
    }
    if (external && bed && tok) {
      bed.muted = false;
      if (!paused) {
        void bed
          .play()
          .then(() => {
            markExternalSoundReady(tok.id);
            const current = videoRefs.current[currentIndex];
            if (current) current.muted = true;
          })
          .catch(() => {
            markExternalSoundFailed(tok.id);
            if (video) video.muted = false;
          });
      } else bed.pause();
    }
  }, [currentIndex, markExternalSoundFailed, markExternalSoundReady]);

  const playVideoAt = useCallback(async (index: number) => {
    if (commentsOpenRef.current || isPausedRef.current) return;

    videoRefs.current.forEach((video, i) => {
      if (!video || i === index) return;
      video.pause();
      video.muted = true;
      // Don't seek neighbors during rapid scroll — seeking stalls the main thread
    });
    bedAudioRefs.current.forEach((audio, i) => {
      if (!audio || i === index) return;
      audio.pause();
      audio.muted = true;
    });

    const video = videoRefs.current[index];
    if (!video) return;
    const tok = soundToksRef.current[index];
    const external = usesExternalSound(tok);
    const bed = bedAudioRefs.current[index];
    const rate = playbackRateRef.current;
    try {
      video.playbackRate = rate;
      if (bed) bed.playbackRate = rate;
    } catch {
      /* ignore */
    }

    if (video.readyState >= 2) {
      setVideoLoading(false);
    } else {
      setVideoLoading(true);
    }

    const wantSound = soundEnabledRef.current;
    const alreadyPlaying = !video.paused && !video.ended;
    try {
      // Never mute the video solely because a remix soundtrack *might* load.
      // Mute only after the bed track is actually playing; otherwise keep video audio.
      if (!alreadyPlaying) {
        video.muted = shouldMuteForExternalSound(tok) ? true : !wantSound;
      }
      if (external && bed && tok) {
        if (!alreadyPlaying) {
          try {
            bed.currentTime = video.currentTime || 0;
          } catch {
            /* ignore seek errors */
          }
        }
        bed.muted = !wantSound;
        if (wantSound) {
          if (bed.paused || bed.ended) {
            void bed
              .play()
              .then(() => {
                if (
                  videoRefs.current[index] !== video ||
                  !usesExternalSound(tok) ||
                  !soundEnabledRef.current
                ) {
                  return;
                }
                markExternalSoundReady(tok.id);
                video.muted = true;
              })
              .catch(() => {
                markExternalSoundFailed(tok.id);
                video.muted = !soundEnabledRef.current;
              });
          } else if (confirmedExternalSoundIdsRef.current.has(tok.id)) {
            video.muted = true;
          }
        } else bed.pause();
      }
      // Fire-and-forget play — don't await so swipe stays instant
      if (alreadyPlaying) {
        setVideoLoading(false);
        return;
      }
      void video.play().then(() => {
        setVideoLoading(false);
        if (wantSound) setSoundTokAudioPreference(true);
      }).catch(async () => {
        try {
          // Start muted so the first frame paints, then retry with sound.
          // SoundTok tab click already unlocks audio on phone/desktop.
          video.muted = true;
          if (bed) {
            bed.muted = true;
            bed.pause();
          }
          await video.play();
          setVideoLoading(false);
          if (!wantSound) return;
          window.setTimeout(() => {
            if (videoRefs.current[index] !== video || isPausedRef.current) return;
            soundEnabledRef.current = true;
            setSoundEnabled(true);
            const stillExternal = usesExternalSound(tok);
            video.muted = false;
            if (!stillExternal) void video.play().catch(() => undefined);
            if (stillExternal && bed && tok) {
              bed.muted = false;
              void bed
                .play()
                .then(() => {
                  if (videoRefs.current[index] === video && usesExternalSound(tok)) {
                    markExternalSoundReady(tok.id);
                    video.muted = true;
                  }
                })
                .catch(() => {
                  markExternalSoundFailed(tok.id);
                  video.muted = false;
                });
            }
            setSoundTokAudioPreference(true);
          }, 60);
        } catch {
          setVideoLoading(false);
        }
      });
    } catch {
      setVideoLoading(false);
    }
  }, [markExternalSoundFailed, markExternalSoundReady]);

  useEffect(() => {
    setDescExpanded(false);
    setIsPaused(false);
    isPausedRef.current = false;

    // A clip must always start from the beginning when it becomes active.
    // Reset both the video and an optional external soundtrack before play.
    const video = videoRefs.current[currentIndex];
    const bed = bedAudioRefs.current[currentIndex];
    try {
      if (video) video.currentTime = 0;
      if (bed) bed.currentTime = 0;
    } catch {
      /* metadata may not be loaded yet; its initial position is already zero */
    }

    playVideoAt(currentIndex);
  }, [currentIndex, playVideoAt]);

  // Preflight remix soundtrack — if the file is already gone, don't keep waiting on <audio>.
  useEffect(() => {
    const tok = feedToks[currentIndex];
    if (!tok || !usesExternalSound(tok) || !tok.sound?.audioUrl) return;
    const url = resolveMediaUrl(tok.sound.audioUrl);
    if (!url) {
      markExternalSoundFailed(tok.id);
      return;
    }
    let cancelled = false;
    void fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        if (cancelled || res.ok) return;
        markExternalSoundFailed(tok.id);
        const video = videoRefs.current[currentIndex];
        if (video && !isPausedRef.current) {
          video.muted = !soundEnabledRef.current;
          void video.play().catch(() => undefined);
        }
      })
      .catch(() => {
        /* CORS/network — rely on <audio onError> */
      });
    return () => {
      cancelled = true;
    };
  }, [currentIndex, feedToks, markExternalSoundFailed]);

  useEffect(() => {
    if (isPaused) {
      videoRefs.current[currentIndex]?.pause();
      bedAudioRefs.current[currentIndex]?.pause();
    } else {
      playVideoAt(currentIndex);
    }
  }, [isPaused, currentIndex, playVideoAt]);

  useEffect(() => {
    if (currentIndex >= feedToks.length) {
      setCurrentIndex(Math.max(0, feedToks.length - 1));
    }
  }, [feedToks.length, currentIndex]);

  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    const bed = bedAudioRefs.current[currentIndex];
    try {
      if (video) video.playbackRate = playbackRate;
      if (bed) bed.playbackRate = playbackRate;
    } catch {
      /* ignore */
    }
  }, [playbackRate, currentIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code !== 'Space' && event.key !== ' ') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (commentsOpenRef.current || reportTok || speedPickerOpen) return;
      event.preventDefault();
      setIsPaused((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reportTok, speedPickerOpen]);

  useEffect(() => {
    unlockMediaPlayback();
    setSoundTokAudioPreference(true);
    soundEnabledRef.current = true;
    setSoundEnabled(true);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const unlockOnGesture = () => {
      enableSound();
    };

    stage.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    stage.addEventListener('wheel', unlockOnGesture, { passive: true });
    return () => {
      stage.removeEventListener('pointerdown', unlockOnGesture);
      stage.removeEventListener('wheel', unlockOnGesture);
    };
  }, [enableSound]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const h = stage.clientHeight;
      if (h > 0) {
        stageHeightPxRef.current = h;
        setStageHeightPx(h);
      }
    };
    measure();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(stage);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      vv?.removeEventListener('resize', measure);
    };
  }, [commentsLayoutOpen]);

  const isPhoneViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  const touchDistance = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const getPinchMid = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return {
      x: (a.clientX + b.clientX) / 2 - (rect.left + rect.width / 2),
      y: (a.clientY + b.clientY) / 2 - (rect.top + rect.height / 2),
    };
  };

  const clampZoomPan = (panX: number, panY: number, scale: number) => {
    const w = stageRef.current?.clientWidth || 360;
    const h = stageRef.current?.clientHeight || 640;
    const maxX = ((Math.max(scale, 1) - 1) * w) / 2;
    const maxY = ((Math.max(scale, 1) - 1) * h) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, panX)),
      y: Math.max(-maxY, Math.min(maxY, panY)),
    };
  };

  const suppressTapPause = useCallback((ms = 480) => {
    suppressTapUntilRef.current = Date.now() + ms;
    if (singleTapTimerRef.current != null) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const animateZoomTo = useCallback((targetScale: number, targetPan: { x: number; y: number }, onDone?: () => void) => {
    if (zoomSettleRafRef.current != null) {
      cancelAnimationFrame(zoomSettleRafRef.current);
      zoomSettleRafRef.current = null;
    }
    setPinching(false);
    const startScale = zoomScaleRef.current;
    const startPan = { ...zoomPanRef.current };
    if (
      Math.abs(startScale - targetScale) < 0.01 &&
      Math.abs(startPan.x - targetPan.x) < 1 &&
      Math.abs(startPan.y - targetPan.y) < 1
    ) {
      zoomScaleRef.current = targetScale;
      zoomPanRef.current = targetPan;
      setZoomScale(targetScale);
      setZoomPan(targetPan);
      onDone?.();
      return;
    }
    const start = performance.now();
    const duration = 280;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const s = startScale + (targetScale - startScale) * eased;
      const x = startPan.x + (targetPan.x - startPan.x) * eased;
      const y = startPan.y + (targetPan.y - startPan.y) * eased;
      zoomScaleRef.current = s;
      zoomPanRef.current = { x, y };
      setZoomScale(s);
      setZoomPan({ x, y });
      if (t < 1) {
        zoomSettleRafRef.current = requestAnimationFrame(tick);
      } else {
        zoomScaleRef.current = targetScale;
        zoomPanRef.current = targetPan;
        setZoomScale(targetScale);
        setZoomPan(targetPan);
        zoomSettleRafRef.current = null;
        onDone?.();
      }
    };
    zoomSettleRafRef.current = requestAnimationFrame(tick);
  }, []);

  const settleZoomToFit = useCallback(() => {
    animateZoomTo(1, { x: 0, y: 0 });
  }, [animateZoomTo]);

  const exitZoomMode = useCallback(() => {
    suppressTapPause(500);
    pinchActiveRef.current = false;
    panStartRef.current = null;
    setPinching(false);
    // Restore chrome immediately with a short fade; scale settles in parallel
    zoomModeRef.current = false;
    setZoomMode(false);
    setChromeEntering(true);
    window.setTimeout(() => setChromeEntering(false), 220);
    animateZoomTo(1, { x: 0, y: 0 });
  }, [animateZoomTo, suppressTapPause]);

  const goToProfile = useCallback(
    (username?: string | null) => {
      if (!username) return;
      const tok = feedToks[currentIndex];
      if (tok?.id) saveSoundTokResume(tok.id);
      // Persist full loaded feed so return lands on the same clip (not just page 1).
      saveSoundTokFeedSnapshot(feedToks);
      navigate(`/profile/${username}`, {
        state: {
          fromSoundTok: true,
          soundTokId: tok?.id ?? null,
        },
      });
    },
    [feedToks, currentIndex, navigate]
  );

  const openProfileFromSwipe = useCallback(() => {
    const username = feedToks[currentIndex]?.author?.username;
    if (!username || profileAnimatingRef.current) return;
    profileAnimatingRef.current = true;
    const stage = stageRef.current;
    const width = stage?.clientWidth || window.innerWidth || 360;
    const start = profileSwipeXRef.current;
    const startTime = performance.now();
    const duration = 280;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const x = start + (-width - start) * eased;
      profileSwipeXRef.current = x;
      setProfileSwipeX(x);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        goToProfile(username);
        // Reset after navigation so back-nav doesn't flash
        window.setTimeout(() => {
          profileSwipeXRef.current = 0;
          setProfileSwipeX(0);
          profileAnimatingRef.current = false;
        }, 80);
      }
    };
    animationRef.current = requestAnimationFrame(tick);
  }, [feedToks, currentIndex, goToProfile]);

  const springProfileBack = useCallback(() => {
    const start = profileSwipeXRef.current;
    if (start >= 0) {
      profileSwipeXRef.current = 0;
      setProfileSwipeX(0);
      return;
    }
    const startTime = performance.now();
    const duration = 220;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const x = start * (1 - eased);
      profileSwipeXRef.current = x;
      setProfileSwipeX(x);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        profileSwipeXRef.current = 0;
        setProfileSwipeX(0);
      }
    };
    animationRef.current = requestAnimationFrame(tick);
  }, []);

  const cyclePlaybackSpeed = useCallback(() => {
    setPlaybackRate((prev) => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    });
  }, []);

  const togglePauseFromChrome = useCallback(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;
    enableSound();
    const bed = bedAudioRefs.current[currentIndex];
    const tok = feedToks[currentIndex];
    if (isPausedRef.current) {
      void video.play().catch(() => undefined);
      if (tok && usesExternalSound(tok) && bed && soundEnabledRef.current) {
        bed.muted = false;
        void bed.play().catch(() => undefined);
      }
      setIsPaused(false);
    } else {
      video.pause();
      bed?.pause();
      setIsPaused(true);
    }
  }, [currentIndex, feedToks, enableSound]);

  const beginSheetDrag = useCallback(
    (el: HTMLDivElement | null, onClose: () => void, clientY: number) => {
      if (!el) return;
      sheetDragRef.current = { el, startY: clientY, active: true, onClose };
      el.style.transition = 'none';
      el.style.willChange = 'transform';
    },
    []
  );

  const moveSheetDrag = useCallback((clientY: number) => {
    const drag = sheetDragRef.current;
    if (!drag.active || !drag.el) return;
    const dy = Math.max(0, clientY - drag.startY);
    drag.el.style.transform = `translateX(-50%) translateY(${dy}px)`;
  }, []);

  const endSheetDrag = useCallback((clientY: number) => {
    const drag = sheetDragRef.current;
    if (!drag.active || !drag.el) return;
    const el = drag.el;
    const dy = clientY - drag.startY;
    drag.active = false;
    el.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
    if (dy > 88) {
      el.style.transform = 'translateX(-50%) translateY(110%)';
      const close = drag.onClose;
      window.setTimeout(() => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        close?.();
      }, 200);
    } else {
      el.style.transform = 'translateX(-50%) translateY(0)';
      window.setTimeout(() => {
        el.style.transition = '';
        el.style.willChange = '';
      }, 220);
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (commentsLayoutOpen || isSeekingRef.current || profileAnimatingRef.current) return;
    // Allow grabbing mid-animation so scrolling never feels "locked"
    if (isAnimatingRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      isAnimatingRef.current = false;
      setIsAnimating(false);
    }
    enableSound();

    // Pinch-to-zoom (phones only)
    if (isPhoneViewport() && e.touches.length === 2) {
      if (zoomSettleRafRef.current != null) {
        cancelAnimationFrame(zoomSettleRafRef.current);
        zoomSettleRafRef.current = null;
      }
      suppressTapPause();
      pinchActiveRef.current = true;
      setPinching(true);
      setIsDragging(false);
      gestureAxisRef.current = null;
      pinchStartDistRef.current = touchDistance(e.touches[0], e.touches[1]);
      pinchStartScaleRef.current = Math.max(1, zoomScaleRef.current);
      pinchStartMidRef.current = getPinchMid(e.touches[0], e.touches[1]);
      pinchStartPanRef.current = { ...zoomPanRef.current };
      panStartRef.current = null;
      return;
    }

    if (zoomModeRef.current && e.touches.length === 1) {
      const t = e.touches[0];
      panStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        panX: zoomPanRef.current.x,
        panY: zoomPanRef.current.y,
      };
      setIsDragging(false);
      gestureAxisRef.current = null;
      return;
    }

    if (zoomModeRef.current) return;

    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchLastY.current = touch.clientY;
    touchLastX.current = touch.clientX;
    touchStartTime.current = Date.now();
    lastTouchTime.current = Date.now();
    touchVelocity.current = 0;
    touchVelocityX.current = 0;
    gestureAxisRef.current = null;
    profileSwipeXRef.current = 0;
    setProfileSwipeX(0);
    setIsDragging(true);
    setIsAnimating(false);
    isAnimatingRef.current = false;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (isSeekingRef.current || profileAnimatingRef.current) return;

      const touches = 'touches' in e ? e.touches : null;
      if (!touches) return;

      if (isPhoneViewport() && (pinchActiveRef.current || touches.length === 2)) {
        if (touches.length === 2) {
          if (e.cancelable) e.preventDefault();
          suppressTapPause();
          const dist = touchDistance(touches[0] as React.Touch, touches[1] as React.Touch);
          if (pinchStartDistRef.current <= 0) {
            pinchStartDistRef.current = dist;
            pinchStartScaleRef.current = Math.max(1, zoomScaleRef.current);
            pinchStartMidRef.current = getPinchMid(
              touches[0] as React.Touch,
              touches[1] as React.Touch,
            );
            pinchStartPanRef.current = { ...zoomPanRef.current };
            pinchActiveRef.current = true;
            return;
          }
          const raw = (pinchStartScaleRef.current * dist) / pinchStartDistRef.current;
          let next =
            raw < 1 ? 1 - (1 - raw) * 0.45 : raw > 3.2 ? 3.2 + (raw - 3.2) * 0.25 : raw;
          if (!zoomModeRef.current && next < 1) next = 1;
          const mid = getPinchMid(touches[0] as React.Touch, touches[1] as React.Touch);
          const ratio = next / Math.max(pinchStartScaleRef.current, 0.001);
          const pan = clampZoomPan(
            mid.x - (pinchStartMidRef.current.x - pinchStartPanRef.current.x) * ratio,
            mid.y - (pinchStartMidRef.current.y - pinchStartPanRef.current.y) * ratio,
            Math.max(next, 1)
          );
          zoomScaleRef.current = next;
          zoomPanRef.current = pan;
          setZoomScale(next);
          setZoomPan(pan);
          if (next > 1.02 && !zoomModeRef.current) {
            zoomModeRef.current = true;
            setZoomMode(true);
          }
        }
        return;
      }

      if (zoomModeRef.current && panStartRef.current && touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        const t = touches[0];
        const scale = zoomScaleRef.current;
        const pan = clampZoomPan(
          panStartRef.current.panX + (t.clientX - panStartRef.current.x),
          panStartRef.current.panY + (t.clientY - panStartRef.current.y),
          scale
        );
        zoomPanRef.current = pan;
        setZoomPan(pan);
        return;
      }

      if (!isDragging || commentsLayoutOpenRef.current || zoomModeRef.current) return;
      const touch = touches[0];
      const currentY = touch.clientY;
      const currentX = touch.clientX;
      const diffY = touchStartY.current - currentY;
      const diffX = currentX - touchStartX.current;
      const now = Date.now();
      const dt = now - lastTouchTime.current;

      // Lock axis after a small move so vertical/horizontal don't fight
      if (!gestureAxisRef.current) {
        const adx = Math.abs(diffX);
        const ady = Math.abs(diffY);
        if (adx < 10 && ady < 10) return;
        gestureAxisRef.current = adx > ady * 1.15 ? 'h' : 'v';
      }

      if (gestureAxisRef.current === 'h') {
        if (e.cancelable) e.preventDefault();
        // Only swipe-left opens profile (right gets a slight rubber effect)
        const x = diffX < 0 ? diffX : diffX * 0.15;
        if (dt > 0) {
          touchVelocityX.current = (currentX - touchLastX.current) / dt;
        }
        lastTouchTime.current = now;
        touchLastX.current = currentX;
        profileSwipeXRef.current = x;
        setProfileSwipeX(x);
        setDragOffset(0);
        return;
      }

      if (e.cancelable) e.preventDefault();
      if (dt > 0) {
        touchVelocity.current = (touchLastY.current - currentY) / dt;
      }
      lastTouchTime.current = now;
      touchLastY.current = currentY;
      let resistance = 1;
      if (currentIndex === 0 && diffY < 0) resistance = 0.35;
      if (currentIndex === feedToks.length - 1 && diffY > 0) resistance = 0.35;
      dragOffsetRef.current = diffY * resistance;
      setDragOffset(diffY * resistance);
    },
    [isDragging, currentIndex, feedToks.length]
  );

  const springToPosition = useCallback(
    (targetOffset: number, targetIndex: number | null = null) => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsAnimating(true);
      isAnimatingRef.current = true;
      setIsDragging(false);

      const startTime = performance.now();
      // Snap-back vs slide — keep motion short so the feed feels instant
      const duration = targetIndex === null ? 140 : 180;
      let from = dragOffsetRef.current;

      if (targetIndex !== null && targetIndex !== currentIndex) {
        const direction = targetIndex > currentIndex ? 1 : -1;
        const stageHeight =
          Math.abs(targetOffset) || getStageHeight() || stageHeightPxRef.current || 1;
        // Commit the next clip immediately, remap offset so the frame doesn't jump
        from = from - direction * stageHeight;
        dragOffsetRef.current = from;
        setDragOffset(from);
        setCurrentIndex(targetIndex);
        // Touch/swipe shouldn't inherit a long wheel lock — wheel handler manages its own
        wheelLockUntil.current = Math.max(wheelLockUntil.current, Date.now() + duration + 40);
        wheelAccum.current = 0;
      } else {
        wheelLockUntil.current = Math.max(wheelLockUntil.current, Date.now() + duration + 40);
      }

      const animate = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = from + (0 - from) * eased;
        dragOffsetRef.current = next;
        setDragOffset(next);
        if (t < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          dragOffsetRef.current = 0;
          setDragOffset(0);
          setIsAnimating(false);
          isAnimatingRef.current = false;
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [currentIndex, getStageHeight]
  );

  const goToAdjacent = useCallback(
    (direction: 1 | -1) => {
      if (isSeekingRef.current) return;
      // Allow chaining scrolls: cancel an in-flight settle instead of waiting
      if (isAnimatingRef.current) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        isAnimatingRef.current = false;
        setIsAnimating(false);
        dragOffsetRef.current = 0;
        setDragOffset(0);
      }
      const next = currentIndex + direction;
      if (next < 0 || next >= feedToks.length) return;
      const stageHeight = getStageHeight();
      if (!stageHeight) return;
      springToPosition(direction * stageHeight, next);
    },
    [currentIndex, feedToks.length, springToPosition, getStageHeight]
  );

  const handleTouchEnd = useCallback(() => {
    if (pinchActiveRef.current) {
      pinchActiveRef.current = false;
      pinchStartDistRef.current = 0;
      setPinching(false);
      suppressTapPause(520);
      if (zoomModeRef.current) {
        if (zoomScaleRef.current <= 1.15) {
          exitZoomMode();
        } else {
          settleZoomToFit();
        }
      } else if (Math.abs(zoomScaleRef.current - 1) > 0.01) {
        settleZoomToFit();
      }
      gestureAxisRef.current = null;
      return;
    }
    if (zoomModeRef.current) {
      panStartRef.current = null;
      suppressTapPause(200);
      gestureAxisRef.current = null;
      return;
    }

    if (gestureAxisRef.current === 'h') {
      setIsDragging(false);
      const x = profileSwipeXRef.current;
      const flingLeft = touchVelocityX.current < -0.55;
      if ((x < -PROFILE_SWIPE_THRESHOLD || flingLeft) && feedToks[currentIndex]?.author?.username) {
        openProfileFromSwipe();
      } else {
        springProfileBack();
      }
      gestureAxisRef.current = null;
      return;
    }

    if (!isDragging || commentsLayoutOpen || isSeekingRef.current) return;
    const dragDistance = dragOffset;
    const velocity = touchVelocity.current;
    const dragDuration = Date.now() - touchStartTime.current;
    const isFlingUp = velocity > FLING_VELOCITY_THRESHOLD && dragDuration < 280;
    const isFlingDown = velocity < -FLING_VELOCITY_THRESHOLD && dragDuration < 280;
    const isSwipeUp = dragDistance > DRAG_THRESHOLD;
    const isSwipeDown = dragDistance < -DRAG_THRESHOLD;
    const stageHeight = getStageHeight();
    if (!stageHeight) return;

    if ((isFlingUp || isSwipeUp) && currentIndex < feedToks.length - 1) {
      springToPosition(stageHeight, currentIndex + 1);
    } else if ((isFlingDown || isSwipeDown) && currentIndex > 0) {
      springToPosition(-stageHeight, currentIndex - 1);
    } else {
      springToPosition(0);
    }
    gestureAxisRef.current = null;
  }, [
    isDragging,
    commentsLayoutOpen,
    dragOffset,
    currentIndex,
    feedToks,
    springToPosition,
    getStageHeight,
    exitZoomMode,
    settleZoomToFit,
    suppressTapPause,
    openProfileFromSwipe,
    springProfileBack,
  ]);

  // Leave zoom when changing clip
  useEffect(() => {
    if (zoomModeRef.current) exitZoomMode();
  }, [currentIndex, exitZoomMode]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
    };
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (commentsLayoutOpenRef.current || isSeekingRef.current || zoomModeRef.current) return;
      if (profileAnimatingRef.current || Math.abs(profileSwipeXRef.current) > 8) return;

      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX > 28 && absX > absY * 1.35) {
        if (e.cancelable) e.preventDefault();
        enableSound();
        const now = Date.now();
        if (now >= wheelLockUntil.current) wheelGestureConsumedRef.current = false;
        if (now < wheelLockUntil.current || wheelGestureConsumedRef.current) return;
        if (e.deltaX > 0 && feedToks[currentIndex]?.author?.username) {
          wheelGestureConsumedRef.current = true;
          wheelLockUntil.current = now + WHEEL_COOLDOWN_MS;
          wheelAccum.current = 0;
          openProfileFromSwipe();
        }
        return;
      }

      if (e.cancelable) e.preventDefault();
      enableSound();

      const now = Date.now();
      const raw =
        e.deltaMode === 1
          ? e.deltaY * 40
          : e.deltaMode === 2
            ? e.deltaY * getStageHeight()
            : e.deltaY;

      if (Math.abs(raw) < 1.5) return;

      const absRaw = Math.abs(raw);
      const direction: 1 | -1 = raw > 0 ? 1 : -1;
      const eventGap = now - wheelLastAtRef.current;
      const previousAbs = wheelLastAbsRef.current;
      const previousDirection = wheelLastDirectionRef.current;
      const isRising =
        direction === previousDirection &&
        absRaw >= 12 &&
        absRaw > previousAbs * 1.22;
      wheelRiseStreakRef.current = isRising
        ? wheelRiseStreakRef.current + 1
        : 0;
      // Require a sustained rise, not one noisy spike. Strong inertial tails can
      // occasionally jump once, which previously caused a tiny extra pull/flip.
      const startsNewBurst =
        eventGap > WHEEL_IDLE_MS ||
        (direction !== previousDirection && absRaw >= 28) ||
        wheelRiseStreakRef.current >= 2 ||
        absRaw >= Math.max(56, previousAbs * 3);

      wheelLastAtRef.current = now;
      wheelLastAbsRef.current = absRaw;
      wheelLastDirectionRef.current = direction;

      if (
        wheelGestureConsumedRef.current &&
        now >= wheelLockUntil.current &&
        startsNewBurst
      ) {
        wheelGestureConsumedRef.current = false;
        wheelAccum.current = 0;
        wheelRiseStreakRef.current = 0;
      }

      const isLineWheel = e.deltaMode === 1;

      // One inertial burst = one video. A genuinely new gesture unlocks above.
      if (now < wheelLockUntil.current || wheelGestureConsumedRef.current) {
        wheelAccum.current = 0;
        // Keep the gesture consumed while inertial events are still arriving.
        // A real second swipe can still unlock via acceleration above.
        if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
        wheelIdleTimer.current = window.setTimeout(() => {
          wheelGestureConsumedRef.current = false;
          wheelLastAbsRef.current = 0;
          wheelLastDirectionRef.current = 0;
          wheelRiseStreakRef.current = 0;
        }, WHEEL_IDLE_MS);
        return;
      }

      if (isLineWheel) {
        wheelAccum.current = 0;
        wheelGestureConsumedRef.current = true;
        wheelLockUntil.current = now + 260;
        goToAdjacent(raw > 0 ? 1 : -1);
        if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
        wheelIdleTimer.current = window.setTimeout(() => {
          wheelGestureConsumedRef.current = false;
          wheelLastAbsRef.current = 0;
          wheelLastDirectionRef.current = 0;
          wheelRiseStreakRef.current = 0;
        }, WHEEL_IDLE_MS);
        return;
      }

      wheelAccum.current += raw;
      if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = window.setTimeout(() => {
        wheelAccum.current = 0;
        wheelGestureConsumedRef.current = false;
        wheelLastAbsRef.current = 0;
        wheelLastDirectionRef.current = 0;
        wheelRiseStreakRef.current = 0;
        wheelGestureId.current += 1;
      }, WHEEL_IDLE_MS);

      if (Math.abs(wheelAccum.current) < WHEEL_THRESHOLD) return;

      const flipDirection: 1 | -1 = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current = 0;
      wheelGestureConsumedRef.current = true;
      wheelLockUntil.current = now + WHEEL_COOLDOWN_MS;
      goToAdjacent(flipDirection);
    },
    [enableSound, goToAdjacent, getStageHeight, feedToks, currentIndex, openProfileFromSwipe]
  );

  // Native non-passive listeners — React's passive touch/wheel can't preventDefault (spam + lag)
  const handleWheelRef = useRef(handleWheel);
  handleWheelRef.current = handleWheel;
  const handleTouchMoveRef = useRef(handleTouchMove);
  handleTouchMoveRef.current = handleTouchMove;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (e: WheelEvent) => handleWheelRef.current(e);
    const onTouchMove = (e: TouchEvent) => handleTouchMoveRef.current(e);

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const formatSeekTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const applySeekUi = useCallback((ratio: number, time: number, dur: number) => {
    const clamped = Math.min(1, Math.max(0, ratio));
    if (seekRef.current) {
      seekRef.current.style.setProperty('--seek-p', String(clamped));
    }
    if (seekTimeRef.current) {
      seekTimeRef.current.textContent = `${formatSeekTime(time)} / ${formatSeekTime(dur)}`;
    }
  }, []);

  const ratioFromClientX = useCallback((clientX: number) => {
    const el = seekRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRefs.current[currentIndex];
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    enableSound();
    isSeekingRef.current = true;
    setIsSeeking(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const ratio = ratioFromClientX(e.clientX);
    pendingSeekRatioRef.current = ratio;
    durationRef.current = video.duration;
    applySeekUi(ratio, ratio * video.duration, video.duration);
  };

  const handleSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    e.stopPropagation();
    const video = videoRefs.current[currentIndex];
    const dur = video?.duration || durationRef.current;
    if (!Number.isFinite(dur) || dur <= 0) return;
    const ratio = ratioFromClientX(e.clientX);
    pendingSeekRatioRef.current = ratio;
    applySeekUi(ratio, ratio * dur, dur);

    const now = performance.now();
    if (video && now - lastSeekApplyRef.current > 80) {
      lastSeekApplyRef.current = now;
      video.currentTime = ratio * dur;
    }
  };

  const handleSeekPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const video = videoRefs.current[currentIndex];
    const dur = video?.duration || durationRef.current;
    const ratio = pendingSeekRatioRef.current ?? ratioFromClientX(e.clientX);
    if (video && Number.isFinite(dur) && dur > 0) {
      video.currentTime = ratio * dur;
      applySeekUi(ratio, ratio * dur, dur);
      setSeekAria({ now: Math.floor(ratio * dur), max: Math.floor(dur) });
    }
    pendingSeekRatioRef.current = null;
    isSeekingRef.current = false;
    setIsSeeking(false);
  };

  // Smooth seek UI via rAF (no React re-renders per frame)
  useEffect(() => {
    applySeekUi(0, 0, 0);
    durationRef.current = 0;
    isSeekingRef.current = false;
    setIsSeeking(false);
    setSeekAria({ now: 0, max: 0 });

    const video = videoRefs.current[currentIndex];
    if (!video) return;

    const stopRaf = () => {
      if (progressRafRef.current != null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };

    const tick = () => {
      progressRafRef.current = null;
      if (isSeekingRef.current) {
        progressRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > 0) {
        durationRef.current = dur;
        const t = video.currentTime || 0;
        applySeekUi(t / dur, t, dur);
      }
      if (!video.paused && !video.ended) {
        progressRafRef.current = requestAnimationFrame(tick);
      }
    };

    const startRaf = () => {
      if (progressRafRef.current != null) return;
      progressRafRef.current = requestAnimationFrame(tick);
    };

    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        durationRef.current = video.duration;
        setSeekAria((prev) => ({ ...prev, max: Math.floor(video.duration) }));
        applySeekUi(
          Math.min(1, Math.max(0, (video.currentTime || 0) / video.duration)),
          video.currentTime || 0,
          video.duration
        );
      }
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('durationchange', onMeta);
    video.addEventListener('play', startRaf);
    video.addEventListener('playing', startRaf);
    video.addEventListener('pause', stopRaf);
    video.addEventListener('ended', stopRaf);
    onMeta();
    if (!video.paused) startRaf();

    return () => {
      stopRaf();
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onMeta);
      video.removeEventListener('play', startRaf);
      video.removeEventListener('playing', startRaf);
      video.removeEventListener('pause', stopRaf);
      video.removeEventListener('ended', stopRaf);
    };
  }, [currentIndex, applySeekUi]);

  useEffect(() => {
    if (!initialOpenComments || openedCommentsFromQueryRef.current) return;
    const tok = soundToks[currentIndex];
    if (!tok) return;
    openedCommentsFromQueryRef.current = true;
    void openComments(tok.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from deep-link
  }, [initialOpenComments, currentIndex, soundToks]);

  const openComments = async (id: string) => {
    if (guestMode) {
      requireAuth();
      return;
    }
    if (sheetCloseTimerRef.current != null) {
      window.clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
    setSheetClosing(null);
    setCurrentSoundTokId(id);
    setCommentsOpen(true);
    setComments([]);
    setReplyTo(null);
    setNewComment('');
    setCommentsLoading(true);
    // Keep composer avatar fresh (persisted session can miss avatar)
    void authApi
      .getMe()
      .then((res) => {
        if (res.data) updateUser(res.data);
      })
      .catch(() => undefined);
    try {
      const data = await soundTokApi.getComments(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeComments = (opts?: { immediate?: boolean }) => {
    commentInputRef.current?.blur();
    document.documentElement.classList.remove('vf-keyboard-open');
    document.documentElement.style.removeProperty('--vf-keyboard-inset');

    const finish = () => {
      setCommentsOpen(false);
      setCurrentSoundTokId(null);
      setNewComment('');
      setReplyTo(null);
      setSheetClosing(null);
      sheetCloseTimerRef.current = null;
    };

    if (opts?.immediate || !commentsOpen) {
      if (sheetCloseTimerRef.current != null) {
        window.clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      finish();
      return;
    }

    commentsOpenRef.current = false;
    setSheetClosing('comments');
    if (sheetCloseTimerRef.current != null) window.clearTimeout(sheetCloseTimerRef.current);
    sheetCloseTimerRef.current = window.setTimeout(finish, 260);
  };

  const closeMoreMenu = (opts?: { immediate?: boolean }) => {
    const finish = () => {
      setMenuOpenId(null);
      setSheetClosing(null);
      sheetCloseTimerRef.current = null;
    };
    if (opts?.immediate || !menuOpenId) {
      if (sheetCloseTimerRef.current != null) {
        window.clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      finish();
      return;
    }
    setSheetClosing('more');
    if (sheetCloseTimerRef.current != null) window.clearTimeout(sheetCloseTimerRef.current);
    sheetCloseTimerRef.current = window.setTimeout(finish, 260);
  };

  const closeRepostsSheet = (opts?: { immediate?: boolean }) => {
    const finish = () => {
      setRepostsSheetId(null);
      setRepostUsers([]);
      setSheetClosing(null);
      sheetCloseTimerRef.current = null;
    };
    if (opts?.immediate || !repostsSheetId) {
      if (sheetCloseTimerRef.current != null) {
        window.clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      finish();
      return;
    }
    setSheetClosing('reposts');
    if (sheetCloseTimerRef.current != null) window.clearTimeout(sheetCloseTimerRef.current);
    sheetCloseTimerRef.current = window.setTimeout(finish, 260);
  };

  const startReply = (comment: Comment) => {
    const rootId = comment.parentId || comment.id;
    const username = comment.author.username;
    const mention = `@${username} `;
    setReplyTo({ id: rootId, username });
    setNewComment((prev) => {
      const withoutOldMention = prev.replace(/^@[a-zA-Z0-9._]+ /, '');
      return `${mention}${withoutOldMention}`;
    });
    window.setTimeout(() => {
      const input = commentInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(mention.length, mention.length);
      resizeCommentField(input);
    }, 0);
  };

  const cancelReply = () => {
    setNewComment((prev) => {
      if (!replyTo) return prev;
      const mention = `@${replyTo.username} `;
      return prev.startsWith(mention) ? prev.slice(mention.length) : prev;
    });
    setReplyTo(null);
  };

  const openCommentProfile = (username: string) => {
    goToProfile(username);
  };

  const handleSubmitComment = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!currentSoundTokId || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    const text = newComment.trim();
    const parentId = replyTo?.id;
    const parentUsername = replyTo?.username;
    setNewComment('');
    setReplyTo(null);
    window.setTimeout(() => resizeCommentField(commentInputRef.current), 0);

    try {
      const { comment, commentsCount } = await soundTokApi.createComment(
        currentSoundTokId,
        text,
        parentId,
      );
      setComments((prev) => [comment, ...prev]);
      setLocalCounts((prev) => ({ ...prev, [currentSoundTokId]: commentsCount }));
      onCommentCountChange?.(currentSoundTokId, commentsCount);
    } catch (error) {
      console.error('Failed to create comment:', error);
      setNewComment(text);
      if (parentId && parentUsername) {
        setReplyTo({ id: parentId, username: parentUsername });
      }
      window.setTimeout(() => resizeCommentField(commentInputRef.current), 0);
    } finally {
      setSubmittingComment(false);
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
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likes: result.likes,
              dislikes: result.dislikes,
              isLiked: result.isLiked,
              isDisliked: result.isDisliked,
              isHidden: result.isHidden,
              text: result.text,
            }
          : c,
      ),
    );
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentSoundTokId || votingCommentId) return;
    setVotingCommentId(commentId);
    try {
      const result = await soundTokApi.likeComment(currentSoundTokId, commentId);
      applyCommentVote(commentId, result);
    } catch (error) {
      console.error('Failed to like comment:', error);
    } finally {
      setVotingCommentId(null);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!currentSoundTokId || votingCommentId) return;
    setVotingCommentId(commentId);
    try {
      const result = await soundTokApi.dislikeComment(currentSoundTokId, commentId);
      applyCommentVote(commentId, result);
    } catch (error) {
      console.error('Failed to dislike comment:', error);
    } finally {
      setVotingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentSoundTokId || deletingCommentId) return;
    if (!window.confirm('Удалить этот комментарий?')) return;
    setDeletingCommentId(commentId);
    try {
      const result = await soundTokApi.deleteComment(currentSoundTokId, commentId);
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
      );
      setLocalCounts((prev) => ({ ...prev, [currentSoundTokId]: result.commentsCount }));
      onCommentCountChange?.(currentSoundTokId, result.commentsCount);
      setReplyTo((current) => (current?.id === commentId ? null : current));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteSoundTok = async (id: string) => {
    if (deletingSoundTokId) return;
    if (!window.confirm('Удалить это видео из SoundTok?')) return;
    setDeletingSoundTokId(id);
    try {
      await soundTokApi.deleteSoundTok(id);
      if (currentSoundTokId === id) closeComments();
      onDeleted?.(id);
    } catch (error) {
      console.error('Failed to delete SoundTok:', error);
    } finally {
      setDeletingSoundTokId(null);
    }
  };

  const sheetCommentCount = currentSoundTokId
    ? localCounts[currentSoundTokId] ??
      soundToks.find((t) => t.id === currentSoundTokId)?.commentsCount ??
      0
    : 0;

  if (!feedToks.length) {
    return (
      <div className="vf-root">
        <style>{css}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
          Нет видео
        </div>
      </div>
    );
  }

  return (
    <div className="vf-root">
      <style>{css}</style>

      <div
        className={`vf-phone${commentsLayoutOpen ? ' vf-phone--comments' : ''}${
          zoomMode ? ' vf-phone--zoomed' : ''
        }${pinching ? ' vf-phone--pinching' : ''}${
          chromeEntering ? ' vf-phone--chrome-in' : ''
        }`}
      >
        <div
          ref={stageRef}
          className="vf-stage"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {(() => {
            const activeTok = feedToks[currentIndex];
            const peekAvatar = resolveMediaUrl(activeTok?.author?.avatar);
            const peekName = activeTok?.author?.username;
            const peekOn = profileSwipeX < -4;
            return (
              <div className={`vf-profile-peek${peekOn ? ' is-on' : ''}`} aria-hidden={!peekOn}>
                <div className="vf-profile-peek-avatar">
                  {(peekName?.[0] ?? '?').toUpperCase()}
                  {peekAvatar ? (
                    <img
                      src={peekAvatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
                {peekName ? <div className="vf-profile-peek-name">@{peekName}</div> : null}
                <div className="vf-profile-peek-hint">Профиль</div>
              </div>
            );
          })()}

          <div
            className="vf-stage-track"
            style={{
              transform: `translate3d(${Math.min(0, profileSwipeX)}px, 0, 0)`,
              transition: 'none',
            }}
          >
          <div className="vf-top-bar">
            <span className="vf-top-title">SoundTok</span>
          </div>

          {feedToks.map((soundTok, index) => {
          // Mount neighbor slides (±2) so desktop/mobile prefetch feels instant
          if (Math.abs(index - currentIndex) > 2) return null;
          const isActive = index === currentIndex;
          const commentCount = getCommentCount(soundTok);
          const authorAvatar = resolveMediaUrl(soundTok.author?.avatar);
          const soundAuthor = soundTok.sound?.author ?? null;
          // Disc = author of the sound (original creator), not necessarily the video poster.
          const soundAvatar =
            resolveMediaUrl(soundAuthor?.avatar) ||
            (soundAuthor?.id && soundAuthor.id === soundTok.authorId ? authorAvatar : null) ||
            (!soundTok.sound || soundTok.sound.authorId === soundTok.authorId ? authorAvatar : null);
          const soundDiscLetter = (
            soundAuthor?.username?.[0] ||
            soundTok.author?.username?.[0] ||
            'S'
          ).toUpperCase();
          const soundLabel = soundTok.sound?.title
            ? soundAuthor?.username && soundAuthor.username !== soundTok.author?.username
              ? `${soundTok.sound.title} · @${soundAuthor.username}`
              : soundTok.sound.title
            : `Оригинальный звук — ${soundTok.author?.username || 'user'}`;

          return (
            <div
              key={soundTok.id}
              className="vf-video-container"
              style={{
                transform: `translate3d(0, ${(index - currentIndex) * (stageHeightPx || stageHeightPxRef.current) - dragOffset}px, 0)`,
                opacity:
                  Math.abs(index - currentIndex) <= 1
                    ? isActive || isDragging || isAnimating
                      ? 1
                      : 0
                    : 0,
                visibility: Math.abs(index - currentIndex) <= 2 ? 'visible' : 'hidden',
                transition:
                  isDragging || isAnimating ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 10 : 0,
              }}
            >
              <video
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                src={resolveMediaUrl(soundTok.videoUrl) || undefined}
                className="vf-video"
                style={
                  isActive && (zoomMode || zoomScale !== 1 || zoomPan.x !== 0 || zoomPan.y !== 0)
                    ? {
                        transform: `translate3d(${zoomPan.x}px, ${zoomPan.y}px, 0) scale(${zoomScale})`,
                        transformOrigin: 'center center',
                      }
                    : undefined
                }
                loop
                autoPlay
                playsInline
                disablePictureInPicture
                preload={
                  Math.abs(index - currentIndex) <= 2 ? 'auto' : 'none'
                }
                muted={
                  index !== currentIndex ||
                  !soundEnabled ||
                  shouldMuteForExternalSound(soundTok)
                }
                onLoadedData={() => {
                  if (index === currentIndex && !commentsOpenRef.current && !isPausedRef.current) {
                    const video = videoRefs.current[index];
                    if (video && !video.paused) return;
                    playVideoAt(index);
                  }
                }}
                onCanPlay={() => {
                  if (index === currentIndex && !commentsOpenRef.current && !isPausedRef.current) {
                    const video = videoRefs.current[index];
                    if (video && !video.paused) return;
                    playVideoAt(index);
                  }
                }}
                onWaiting={() => {
                  if (index === currentIndex && !commentsOpenRef.current && !isPausedRef.current) {
                    setVideoLoading(true);
                  }
                }}
                onPlaying={() => {
                  if (index === currentIndex) setVideoLoading(false);
                }}
                onError={() => {
                  setVideoLoading(false);
                  setHiddenIds((prev) => ({ ...prev, [soundTok.id]: true }));
                  if (index === currentIndex && currentIndex >= feedToks.length - 1) {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                  }
                }}
                onTimeUpdate={() => {
                  if (index !== currentIndex || !usesExternalSound(soundTok)) return;
                  const bed = bedAudioRefs.current[index];
                  const video = videoRefs.current[index];
                  if (!bed || !video || bed.paused || video.paused) return;
                  if (Math.abs((bed.currentTime || 0) - (video.currentTime || 0)) > 0.85) {
                    try {
                      bed.currentTime = video.currentTime;
                    } catch {
                      /* ignore */
                    }
                  }
                }}
                onPointerUp={(e) => {
                  if (!isActive || e.button !== 0) return;
                  // Ignore swipe (stage sets dragOffset); don't use isDragging —
                  // touchStart marks dragging before a simple tap finishes.
                  if (Math.abs(dragOffset) > 10) return;
                  // Pinch / immersive zoom must never toggle pause
                  if (
                    pinchActiveRef.current ||
                    zoomModeRef.current ||
                    Date.now() < suppressTapUntilRef.current
                  ) {
                    return;
                  }
                  const rect = (e.currentTarget as HTMLVideoElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const now = Date.now();
                  const prev = lastTapRef.current;
                  const isMulti =
                    prev &&
                    now - prev.t < 320 &&
                    Math.abs(prev.x - x) < 56 &&
                    Math.abs(prev.y - y) < 56;

                  if (isMulti) {
                    if (singleTapTimerRef.current != null) {
                      window.clearTimeout(singleTapTimerRef.current);
                      singleTapTimerRef.current = null;
                    }
                    lastTapRef.current = { t: now, x, y };
                    enableSound();
                    if (guestMode) {
                      requireAuth();
                      return;
                    }
                    // Double-tap always shows like feedback, even if already liked.
                    setLikePulse((value) => ({ tokId: soundTok.id, seq: value.seq + 1 }));
                    const id = ++tapHeartIdRef.current;
                    setTapHearts((list) => [...list.slice(-10), { id, x, y }]);
                    window.setTimeout(() => {
                      setTapHearts((list) => list.filter((h) => h.id !== id));
                    }, 850);
                    if (!soundTok.isLiked) onLike(soundTok.id);
                    return;
                  }

                  lastTapRef.current = { t: now, x, y };
                  if (singleTapTimerRef.current != null) {
                    window.clearTimeout(singleTapTimerRef.current);
                  }
                  // Short delay so double-tap like still works, but pause feels snappy
                  singleTapTimerRef.current = window.setTimeout(() => {
                    singleTapTimerRef.current = null;
                    const video = videoRefs.current[index];
                    if (!video) return;
                    enableSound();
                    const bed = bedAudioRefs.current[index];
                    if (isPausedRef.current) {
                      void video.play().catch(() => undefined);
                      if (usesExternalSound(soundTok) && bed && soundEnabledRef.current) {
                        bed.muted = false;
                        void bed.play().catch(() => undefined);
                      }
                      setIsPaused(false);
                    } else {
                      video.pause();
                      bed?.pause();
                      setIsPaused(true);
                    }
                  }, 180);
                }}
              />
              {isActive && tapHearts.length > 0 && (
                <div className="vf-tap-hearts" aria-hidden>
                  {tapHearts.map((heart) => (
                    <Heart
                      key={heart.id}
                      className="vf-tap-heart"
                      size={88}
                      fill="currentColor"
                      style={{ left: heart.x, top: heart.y }}
                    />
                  ))}
                </div>
              )}
              {usesExternalSound(soundTok) &&
                soundTok.sound?.audioUrl &&
                index === currentIndex && (
                <audio
                  ref={(el) => {
                    bedAudioRefs.current[index] = el;
                  }}
                  src={resolveMediaUrl(soundTok.sound.audioUrl) || undefined}
                  loop
                  autoPlay
                  preload="metadata"
                  onCanPlay={() => {
                    if (index === currentIndex && !isPausedRef.current) {
                      const video = videoRefs.current[index];
                      if (video && !video.paused) return;
                      void playVideoAt(index);
                    }
                  }}
                  onError={() => {
                    markExternalSoundFailed(soundTok.id);
                    const video = videoRefs.current[index];
                    if (video) {
                      video.muted = !soundEnabledRef.current;
                      if (!isPausedRef.current) {
                        void video.play().catch(() => undefined);
                      }
                    }
                  }}
                />
              )}

              {isActive && videoLoading && !isPaused && !commentsLayoutOpen && (
                <div className="vf-video-loading" aria-hidden />
              )}

              {isActive && isPaused && !commentsLayoutOpen && (
                <div className="vf-pause-overlay">
                  <Play size={64} fill="white" />
                </div>
              )}

              {isActive && (
                <>
                  <div className="vf-gradient-top" />
                  <div className="vf-gradient-bottom" />

                  <div
                    ref={seekRef}
                    className={`vf-seek ${isSeeking ? 'active' : ''}`}
                    onPointerDown={handleSeekPointerDown}
                    onPointerMove={handleSeekPointerMove}
                    onPointerUp={handleSeekPointerUp}
                    onPointerCancel={handleSeekPointerUp}
                    onClick={(e) => e.stopPropagation()}
                    role="slider"
                    aria-label="Перемотка видео"
                    aria-valuemin={0}
                    aria-valuemax={seekAria.max}
                    aria-valuenow={seekAria.now}
                    style={{ ['--seek-p' as string]: 0 }}
                  >
                    <div className="vf-seek-track">
                      <div className="vf-seek-fill" />
                      <div className="vf-seek-thumb" />
                    </div>
                    <div className="vf-seek-time" ref={seekTimeRef}>
                      0:00 / 0:00
                    </div>
                  </div>

                  <div className="vf-bottom-info">
                    {(() => {
                      if (guestMode) return null;
                      const meta = getRepostMeta(soundTok);
                      const count = meta.repostsCount;
                      const preview = meta.repostPreview.slice(0, 3);
                      if (count <= 0) return null;

                      if (count === 1) {
                        const person = meta.isReposted ? currentUser : preview[0];
                        if (!person) return null;
                        const avatarUrl = resolveMediaUrl(person.avatar);
                        const letter = (person.displayName || person.username)[0]?.toUpperCase() ?? '?';
                        return (
                          <div className="vf-repost-attr vf-repost-attr-static">
                            <div className="vf-repost-avatars">
                              <span className="vf-repost-avatar">
                                {letter}
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                              </span>
                            </div>
                            <span className="vf-repost-attr-text">
                              {meta.isReposted ? (
                                'вы сделали репост'
                              ) : (
                                <>
                                  <span className="vf-repost-attr-user">@{person.username}</span>
                                  {' '}репостнули
                                </>
                              )}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          className="vf-repost-attr"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openRepostsSheet(soundTok.id);
                          }}
                          aria-label={`Репосты: ${count}`}
                        >
                          <div className="vf-repost-avatars">
                            {preview.map((person) => {
                              const avatarUrl = resolveMediaUrl(person.avatar);
                              const letter =
                                (person.displayName || person.username)[0]?.toUpperCase() ?? '?';
                              return (
                                <span key={person.id} className="vf-repost-avatar">
                                  {letter}
                                  {avatarUrl ? (
                                    <img
                                      src={avatarUrl}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                </span>
                              );
                            })}
                          </div>
                          <span className="vf-repost-attr-text">Репосты:{count}</span>
                        </button>
                      );
                    })()}
                    <div className="vf-author-row">
                      <button
                        type="button"
                        className="vf-author-name"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToProfile(soundTok.author?.username);
                        }}
                      >
                        @{soundTok.author?.username || 'user'}
                        <PlatinumBadge
                          plan={soundTok.author?.plan}
                          planExpiresAt={soundTok.author?.planExpiresAt}
                          role={soundTok.author?.role}
                          size={12}
                        />
                        <AdminBadge role={soundTok.author?.role} size={12} />
                      </button>
                    </div>
                    {soundTok.description && (
                      <>
                        <div className={`vf-description ${descExpanded ? 'vf-desc-expanded' : ''}`}>
                          {soundTok.description}
                        </div>
                        {soundTok.description.length > 80 && (
                          <button
                            type="button"
                            className="vf-desc-toggle"
                            onClick={() => setDescExpanded((v) => !v)}
                          >
                            {descExpanded ? 'Свернуть' : 'Ещё'}
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="vf-music-row"
                      onClick={(e) => void openSoundPage(soundTok, e)}
                    >
                      <Music2 size={14} className="vf-music-icon" />
                      <span>{soundLabel}</span>
                    </button>
                  </div>

                  {onCreateClick && (
                    <button
                      type="button"
                      className="vf-create-bar"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateClick();
                      }}
                      aria-label="Выложить видео"
                      title="Выложить видео"
                    >
                      <Plus />
                    </button>
                  )}

                  <div className="vf-actions">
                    <div className="vf-author-block">
                      <div
                        className="vf-author-avatar"
                        onClick={() => goToProfile(soundTok.author?.username)}
                        title={soundTok.author?.username}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') goToProfile(soundTok.author?.username);
                        }}
                      >
                        {(soundTok.author?.username?.[0] ?? 'U').toUpperCase()}
                        {authorAvatar ? (
                          <img
                            src={authorAvatar}
                            alt={soundTok.author.username}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                      {!isOwnVideo(soundTok.authorId) && (
                        <button
                          type="button"
                          className={`vf-follow-btn ${followedAuthors[soundTok.authorId] ? 'following' : ''}`}
                          onClick={(e) => toggleFollow(soundTok.authorId, e)}
                          aria-label={
                            followedAuthors[soundTok.authorId] ? 'Отписаться' : 'Подписаться'
                          }
                          title={followedAuthors[soundTok.authorId] ? 'Подписка оформлена' : 'Подписаться'}
                        >
                          {followedAuthors[soundTok.authorId] ? (
                            <Check size={12} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="vf-action-group">
                      <button
                        type="button"
                        className={`vf-action-btn ${soundTok.isLiked ? 'liked' : ''}`}
                        onClick={() => {
                          if (guestMode) {
                            requireAuth();
                            return;
                          }
                          if (!soundTok.isLiked) {
                            setLikePulse((value) => ({ tokId: soundTok.id, seq: value.seq + 1 }));
                          }
                          onLike(soundTok.id);
                        }}
                        aria-label="Нравится"
                      >
                        <Heart
                          key={`${soundTok.id}-${likePulse.tokId === soundTok.id ? likePulse.seq : 0}`}
                          className={likePulse.tokId === soundTok.id ? 'vf-like-pop' : undefined}
                          size={28}
                          fill={soundTok.isLiked ? 'currentColor' : 'none'}
                          strokeWidth={1.8}
                        />
                      </button>
                      <span className="vf-action-count">{formatCount(soundTok.likes)}</span>
                    </div>

                    <div className="vf-action-group">
                      <button
                        type="button"
                        className="vf-action-btn"
                        onClick={() => openComments(soundTok.id)}
                        aria-label="Комментарии"
                      >
                        <MessageCircle size={28} strokeWidth={1.8} />
                      </button>
                      <span className="vf-action-count">{formatCount(commentCount)}</span>
                    </div>

                    <div className="vf-action-group">
                      <button
                        type="button"
                        className="vf-action-btn vf-share-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (guestMode) {
                            requireAuth();
                            return;
                          }
                          setShareTok(soundTok);
                        }}
                        aria-label="Поделиться"
                      >
                        <ShareCurvedIcon size={28} />
                      </button>
                      <span className="vf-action-count">
                        {formatCount(shareCounts[soundTok.id] ?? soundTok.sharesCount ?? 0)}
                      </span>
                    </div>

                    <div className="vf-action-group vf-more-wrap">
                      <button
                        type="button"
                        className="vf-action-btn"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuOpenId === soundTok.id) {
                            closeMoreMenu();
                            return;
                          }
                          if (sheetCloseTimerRef.current != null) {
                            window.clearTimeout(sheetCloseTimerRef.current);
                            sheetCloseTimerRef.current = null;
                          }
                          setSheetClosing(null);
                          setMenuOpenId(soundTok.id);
                        }}
                        aria-label="Ещё"
                        aria-expanded={menuOpenId === soundTok.id}
                      >
                        <MoreVertical size={24} strokeWidth={1.8} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="vf-music-disc"
                      onClick={(e) => void openSoundPage(soundTok, e)}
                      aria-label="Открыть звук"
                    >
                      <span className="vf-music-disc-letter">{soundDiscLetter}</span>
                      {soundAvatar ? (
                        <img
                          src={soundAvatar}
                          alt={soundAuthor?.username || 'Звук'}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>

        {zoomMode && (
          <div className="vf-zoom-chrome">
            <button
              type="button"
              className="vf-zoom-close"
              onClick={(e) => {
                e.stopPropagation();
                exitZoomMode();
              }}
              aria-label="Вернуть интерфейс"
            >
              <X size={22} />
            </button>
            <div className="vf-zoom-pill">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePauseFromChrome();
                }}
                aria-label={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cyclePlaybackSpeed();
                }}
                aria-label="Скорость видео"
              >
                {playbackRate === 1 ? '1x' : `${playbackRate}x`}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {menuOpenId && (() => {
        const menuTok = feedToks.find((t) => t.id === menuOpenId) || soundToks.find((t) => t.id === menuOpenId);
        if (!menuTok) return null;
        return (
          <>
            <div
              className={`vf-sheet-backdrop${sheetClosing === 'more' ? ' vf-sheet-backdrop--closing' : ''}`}
              onClick={() => closeMoreMenu()}
              aria-hidden
            />
            <div
              ref={moreSheetRef}
              className={`vf-sheet vf-more-sheet${sheetClosing === 'more' ? ' vf-sheet--closing' : ''}`}
              role="dialog"
              aria-label="Ещё"
              onTouchStart={(e) => {
                if (e.touches.length !== 1 || sheetClosing === 'more') return;
                beginSheetDrag(
                  moreSheetRef.current,
                  () => closeMoreMenu({ immediate: true }),
                  e.touches[0].clientY
                );
              }}
              onTouchMove={(e) => {
                if (!sheetDragRef.current.active) return;
                if (e.cancelable) e.preventDefault();
                moveSheetDrag(e.touches[0].clientY);
              }}
              onTouchEnd={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
              onTouchCancel={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
            >
              <div className="vf-sheet-handle" />
              <div className="vf-sheet-header">
                <span className="vf-sheet-title">Действия</span>
                <button
                  type="button"
                  className="vf-sheet-close"
                  onClick={() => closeMoreMenu()}
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="vf-more-list" role="menu">
                <button
                  type="button"
                  className="vf-more-item"
                  role="menuitem"
                  disabled={downloadingId === menuTok.id}
                  onClick={() => void handleDownloadSoundTok(menuTok)}
                >
                  <Download size={18} />
                  {downloadingId === menuTok.id ? 'Скачивание…' : 'Скачать'}
                </button>
                <button
                  type="button"
                  className="vf-more-item"
                  role="menuitem"
                  disabled={repostingId === menuTok.id}
                  onClick={() => void handleToggleRepost(menuTok)}
                >
                  <Repeat2 size={18} />
                  {getRepostMeta(menuTok).isReposted ? 'Убрать репост' : 'Репост'}
                </button>
                <button
                  type="button"
                  className="vf-more-item"
                  role="menuitem"
                  onClick={() => handleNotInterested(menuTok)}
                >
                  <Ban size={18} />
                  Не интересно
                </button>
                <button
                  type="button"
                  className="vf-more-item"
                  role="menuitem"
                  onClick={() => {
                    if (guestMode) {
                      requireAuth();
                      return;
                    }
                    closeMoreMenu({ immediate: true });
                    setReportText('');
                    setReportError('');
                    setReportTok(menuTok);
                  }}
                >
                  <Flag size={18} />
                  Жалоба
                </button>
                <button
                  type="button"
                  className="vf-more-item"
                  role="menuitem"
                  onClick={() => {
                    closeMoreMenu({ immediate: true });
                    setSpeedPickerOpen(true);
                  }}
                >
                  <Gauge size={18} />
                  Скорость видео
                </button>
                {isOwnVideo(menuTok.authorId) && (
                  <button
                    type="button"
                    className="vf-more-item danger"
                    role="menuitem"
                    disabled={deletingSoundTokId === menuTok.id}
                    onClick={() => {
                      closeMoreMenu({ immediate: true });
                      void handleDeleteSoundTok(menuTok.id);
                    }}
                  >
                    <Trash2 size={18} />
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {commentsOpen && (
        <>
          <div
            className={`vf-sheet-backdrop${sheetClosing === 'comments' ? ' vf-sheet-backdrop--closing' : ''}`}
            onClick={() => closeComments()}
            aria-hidden
          />
          <div
            ref={commentsSheetRef}
            className={`vf-sheet vf-sheet--comments${sheetClosing === 'comments' ? ' vf-sheet--closing' : ''}`}
            role="dialog"
            aria-label="Комментарии"
          >
            <div
              className="vf-sheet-handle"
              onTouchStart={(e) => {
                if (e.touches.length !== 1) return;
                beginSheetDrag(
                  commentsSheetRef.current,
                  () => closeComments({ immediate: true }),
                  e.touches[0].clientY
                );
              }}
              onTouchMove={(e) => {
                if (!sheetDragRef.current.active) return;
                if (e.cancelable) e.preventDefault();
                moveSheetDrag(e.touches[0].clientY);
              }}
              onTouchEnd={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
              onTouchCancel={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
            />
            <div
              className="vf-sheet-header"
              onTouchStart={(e) => {
                if (e.touches.length !== 1) return;
                beginSheetDrag(
                  commentsSheetRef.current,
                  () => closeComments({ immediate: true }),
                  e.touches[0].clientY
                );
              }}
              onTouchMove={(e) => {
                if (!sheetDragRef.current.active) return;
                if (e.cancelable) e.preventDefault();
                moveSheetDrag(e.touches[0].clientY);
              }}
              onTouchEnd={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
              onTouchCancel={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
            >
              <span className="vf-sheet-title">
                {sheetCommentCount === 0
                  ? 'Комментарии'
                  : `${formatCount(sheetCommentCount)} ${pluralizeComments(sheetCommentCount)}`}
              </span>
              <button
                type="button"
                className="vf-sheet-close"
                onClick={() => closeComments()}
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="vf-comments-list">
              {commentsLoading ? (
                <div className="vf-comments-loading">Загрузка...</div>
              ) : comments.length === 0 ? (
                <div className="vf-empty-comments">
                  Пока нет комментариев.<br />
                  Будьте первым!
                </div>
              ) : (
                (() => {
                  const roots = comments.filter((c) => !c.parentId);
                  const repliesOf = (rootId: string) =>
                    comments
                      .filter((c) => c.parentId === rootId)
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                      );
                  const renderComment = (comment: Comment, isReply = false) => (
                    <div
                      key={comment.id}
                      className={`vf-comment-item${isReply ? ' reply' : ''}${
                        replyTo?.id === (comment.parentId || comment.id) &&
                        replyTo?.username === comment.author.username
                          ? ' is-reply-target'
                          : ''
                      }`}
                    >
                      <CommentAvatar
                        author={comment.author}
                        onOpen={() => openCommentProfile(comment.author.username)}
                      />
                      <div className="vf-comment-body">
                        <div className="vf-comment-meta">
                          <button
                            type="button"
                            className="vf-comment-user"
                            onClick={() => openCommentProfile(comment.author.username)}
                          >
                            {comment.author.displayName || comment.author.username}
                            <PlatinumBadge
                              plan={comment.author.plan}
                              planExpiresAt={comment.author.planExpiresAt}
                              role={comment.author.role}
                              size={11}
                            />
                            <AdminBadge role={comment.author.role} size={11} />
                          </button>
                          <span className="vf-comment-time">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <div className={`vf-comment-text${comment.isHidden ? ' hidden' : ''}`}>
                          {renderTextWithMentions({
                            text: comment.text,
                            onMentionClick: (username) => openCommentProfile(username),
                            mentionClassName: 'vf-comment-mention',
                          })}
                        </div>
                        <div className="vf-comment-actions">
                          <button
                            type="button"
                            className={`vf-comment-vote${comment.isLiked ? ' liked' : ''}`}
                            title="Нравится"
                            disabled={votingCommentId === comment.id}
                            onClick={() => void handleLikeComment(comment.id)}
                          >
                            <Heart size={14} fill={comment.isLiked ? 'currentColor' : 'none'} />
                            <span>{formatCount(comment.likes ?? 0)}</span>
                          </button>
                          <button
                            type="button"
                            className={`vf-comment-vote${comment.isDisliked ? ' disliked' : ''}`}
                            title={comment.isDisliked ? 'Показать комментарий' : 'Не нравится'}
                            disabled={votingCommentId === comment.id}
                            onClick={() => void handleDislikeComment(comment.id)}
                          >
                            <ThumbsDown
                              size={14}
                              fill={comment.isDisliked ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            type="button"
                            className="vf-comment-reply"
                            onClick={() => startReply(comment)}
                          >
                            Ответить
                          </button>
                          {currentUser?.id === comment.authorId && (
                            <button
                              type="button"
                              className="vf-comment-delete"
                              title="Удалить комментарий"
                              disabled={deletingCommentId === comment.id}
                              onClick={() => void handleDeleteComment(comment.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return roots.flatMap((root) => [
                    renderComment(root, false),
                    ...repliesOf(root.id).map((reply) => renderComment(reply, true)),
                  ]);
                })()
              )}
            </div>

            <div className="vf-sheet-composer">
              {replyTo && (
                <div className="vf-reply-bar">
                  <span>
                    Ответ для
                    <span className="vf-reply-chip">@{replyTo.username}</span>
                  </span>
                  <button
                    type="button"
                    className="vf-reply-cancel"
                    aria-label="Отменить ответ"
                    onClick={cancelReply}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="vf-emoji-row" aria-label="Быстрые эмодзи">
                {['🥰', '😃', '😂', '😳', '😏', '😅'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="vf-emoji-btn"
                    onClick={() => {
                      setNewComment((prev) => `${prev}${emoji}`);
                      window.setTimeout(() => resizeCommentField(commentInputRef.current), 0);
                      commentInputRef.current?.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form className="vf-sheet-input" onSubmit={handleSubmitComment}>
                {currentUser && (
                  <span className="vf-composer-avatar" aria-hidden>
                    {(currentUser.username?.[0] || '?').toUpperCase()}
                    {resolveMediaUrl(currentUser.avatar) ? (
                      <img
                        src={resolveMediaUrl(currentUser.avatar)!}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                  </span>
                )}
                <div className="vf-comment-input-wrap">
                  {newComment && (
                    <div className="vf-comment-input-backdrop" aria-hidden>
                      {replyTo && newComment.startsWith(`@${replyTo.username}`) ? (
                        <>
                          <span className="vf-comment-input-mention">
                            @{replyTo.username}
                          </span>
                          {newComment.slice(`@${replyTo.username}`.length)}
                        </>
                      ) : (
                        newComment
                      )}
                    </div>
                  )}
                  <textarea
                    ref={commentInputRef}
                    value={newComment}
                    rows={1}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      resizeCommentField(e.target);
                    }}
                    onFocus={() => document.documentElement.classList.add('vf-keyboard-open')}
                    onScroll={(e) => {
                      const backdrop = e.currentTarget.parentElement?.querySelector(
                        '.vf-comment-input-backdrop',
                      ) as HTMLElement | null;
                      if (backdrop) backdrop.scrollTop = e.currentTarget.scrollTop;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!submittingComment && newComment.trim()) {
                          void handleSubmitComment(e);
                        }
                      }
                    }}
                    placeholder={
                      replyTo ? `Ответ @${replyTo.username}…` : 'Добавить комментарий...'
                    }
                    maxLength={500}
                    disabled={submittingComment}
                    enterKeyHint="send"
                    aria-label="Текст комментария"
                  />
                </div>
                <button
                  type="submit"
                  className="vf-send-btn"
                  disabled={submittingComment || !newComment.trim()}
                  aria-label="Отправить"
                >
                  <Send size={18} />
                </button>
              </form>
              <div className="vf-composer-hint">Enter — отправить · Shift+Enter — новая строка</div>
            </div>
          </div>
        </>
      )}

      <ShareSoundTokModal
        open={!!shareTok}
        soundTok={shareTok}
        onClose={() => setShareTok(null)}
        onShared={(id, sharesCount) => {
          setShareCounts((prev) => ({ ...prev, [id]: sharesCount }));
        }}
      />

      {repostsSheetId && (
        <>
          <div
            className={`vf-sheet-backdrop${sheetClosing === 'reposts' ? ' vf-sheet-backdrop--closing' : ''}`}
            onClick={() => closeRepostsSheet()}
          />
          <div
            ref={repostsSheetRef}
            className={`vf-sheet${sheetClosing === 'reposts' ? ' vf-sheet--closing' : ''}`}
            role="dialog"
            aria-label="Кто сделал репост"
            onTouchStart={(e) => {
              if (e.touches.length !== 1 || sheetClosing === 'reposts') return;
              beginSheetDrag(
                repostsSheetRef.current,
                () => closeRepostsSheet({ immediate: true }),
                e.touches[0].clientY
              );
            }}
            onTouchMove={(e) => {
              if (!sheetDragRef.current.active) return;
                if (e.cancelable) e.preventDefault();
              moveSheetDrag(e.touches[0].clientY);
            }}
            onTouchEnd={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
            onTouchCancel={(e) => endSheetDrag(e.changedTouches[0]?.clientY ?? 0)}
          >
            <div className="vf-sheet-handle" />
            <div className="vf-sheet-header">
              <div className="vf-sheet-title">Репосты</div>
              <button
                type="button"
                className="vf-sheet-close"
                onClick={() => closeRepostsSheet()}
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>
            <div className="vf-comments-list">
              {repostsLoading ? (
                <div className="vf-empty-comments">Загрузка…</div>
              ) : repostUsers.length === 0 ? (
                <div className="vf-empty-comments">Пока нет репостов</div>
              ) : (
                repostUsers.map((row) => {
                  const avatarUrl = resolveMediaUrl(row.user.avatar);
                  const letter =
                    (row.user.displayName || row.user.username)[0]?.toUpperCase() ?? '?';
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className="vf-repost-list-item"
                      onClick={() => {
                        setRepostsSheetId(null);
                        goToProfile(row.user.username);
                      }}
                    >
                      <span className="vf-repost-list-avatar">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : letter}
                      </span>
                      <span className="vf-repost-list-meta">
                        <span className="vf-repost-list-name">
                          {row.user.displayName || `@${row.user.username}`}
                        </span>
                        <span className="vf-repost-list-user">@{row.user.username}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {speedPickerOpen && (
        <div
          className="vf-speed-menu"
          onClick={() => setSpeedPickerOpen(false)}
          role="presentation"
        >
          <div
            className="vf-speed-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Скорость видео"
          >
            <div className="vf-speed-title">Скорость видео</div>
            <div className="vf-speed-options">
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={`vf-speed-btn ${playbackRate === speed ? 'active' : ''}`}
                  onClick={() => {
                    setPlaybackRate(speed);
                    setSpeedPickerOpen(false);
                  }}
                >
                  {speed === 1 ? 'Обычн.' : `${speed}x`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {reportTok && (
        <div
          className="vf-report-modal"
          onClick={() => !reportSending && setReportTok(null)}
          role="presentation"
        >
          <div
            className="vf-report-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Жалоба на видео"
          >
            <div className="vf-report-title">Что не так с этим видео?</div>
            <textarea
              className="vf-report-textarea"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Опишите проблему…"
              maxLength={900}
              disabled={reportSending}
            />
            {reportError && <div className="vf-report-error">{reportError}</div>}
            <div className="vf-report-actions">
              <button
                type="button"
                className="vf-report-cancel"
                disabled={reportSending}
                onClick={() => setReportTok(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="vf-report-submit"
                disabled={reportSending}
                onClick={() => void submitVideoReport()}
              >
                {reportSending ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
