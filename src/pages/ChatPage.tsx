import { useState, useEffect, useRef, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, CheckCheck, Loader2, Ban, ShieldOff, Pin, PinOff, Users, Trash2, SmilePlus, Pencil, Copy } from 'lucide-react';
import { chatsApi, Chat, Message, REACTION_EMOJIS, resolveChatPinState } from '../api/chats';
import { blocksApi, BlockStatus } from '../api/blocks';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useChatUnreadStore } from '../store/chatUnreadStore';
import { useChatSocket, Message as SocketMessage } from '../hooks/useSocket';
import ConfirmDialog from '../components/ConfirmDialog';
import { resolveMediaUrl } from '../lib/mediaUrl';
import {
  extractMentionQuery,
  insertMention,
  renderTextWithMentions,
} from '../utils/messageMentions';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.chat-root {
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
  --success: #27ae60;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

/* ── AMBIENT ── */
.chat-ambient {
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
  opacity: 0.08;
  animation: orb-float 24s ease-in-out infinite;
}
.ambient-orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(232, 228, 220, 0.15) 0%, transparent 70%);
  top: -150px;
  right: -100px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.12) 0%, transparent 70%);
  bottom: -100px;
  left: -80px;
  animation-delay: -10s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-25px, -35px) scale(1.06); }
  66% { transform: translate(15px, 25px) scale(0.94); }
}
.chat-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}

.error-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: var(--red-dim);
  border: 1px solid rgba(192, 57, 43, 0.4);
  color: #f5a9a3;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  max-width: 90%;
  text-align: center;
  animation: toast-in 0.25s ease;
}
@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── MESSAGE STATUS ── */
.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  justify-content: flex-end;
}
.message-time {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
}
.message-status {
  display: flex;
  align-items: center;
}
.message-status svg {
  width: 12px;
  height: 12px;
  stroke-width: 2;
}
.message-bubble.own .message-time {
  color: rgba(11, 11, 11, 0.68);
}
.message-bubble.own .message-status {
  color: rgba(11, 11, 11, 0.5);
}
.message-bubble.own .message-status.read {
  color: #2980b9;
}
.message-bubble.other .message-time {
  color: #8f8a83;
}

/* ── TYPING INDICATOR ── */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  border-bottom-left-radius: 6px;
  align-self: flex-start;
  margin-bottom: 8px;
}
.typing-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
}

/* ── PENDING MESSAGE ── */
.message-row.pending {
  opacity: 0.7;
}
.message-row.pending .send-btn svg {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loader {
  animation: spin 1s linear infinite;
}

.chat-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.01;
  background-image: 
    linear-gradient(rgba(232, 228, 220, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 220, 0.2) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* ── HEADER ── */
.chat-header {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(11, 11, 11, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.header-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
  flex-shrink: 0;
}
.header-back:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.header-back svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}
.header-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--accent);
  position: relative;
  overflow: hidden;
}
.header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.header-avatar .online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: var(--success);
  border-radius: 50%;
  border: 2px solid var(--bg);
  box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.25);
}
.header-avatar .offline-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: var(--text-muted);
  border-radius: 50%;
  border: 2px solid var(--bg);
}
.header-info {
  flex: 1;
  min-width: 0;
}
.header-profile-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 0;
  color: inherit;
}
.header-profile-btn:hover .header-username {
  color: var(--accent);
}
.header-block-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(192, 57, 43, 0.45);
  background: rgba(192, 57, 43, 0.14);
  color: #f0a8a2;
  font-family: 'Syne', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.header-block-btn:hover {
  background: rgba(192, 57, 43, 0.24);
  border-color: rgba(192, 57, 43, 0.7);
  color: #ffd0cb;
}
.header-block-btn.unblock {
  border-color: var(--border-mid);
  background: var(--bg-surface);
  color: var(--text-secondary);
}
.header-block-btn.unblock:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.header-block-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.header-block-label {
  display: inline;
}
.header-pin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-mid);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.header-pin-btn:hover {
  border-color: var(--border-hover);
  color: var(--accent);
}
.header-pin-btn.active {
  color: var(--accent);
  border-color: rgba(232, 228, 220, 0.25);
}
.header-pin-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.header-group-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0;
  color: inherit;
  cursor: default;
}
@media (max-width: 520px) {
  .header-block-label {
    display: none;
  }
  .header-block-btn {
    width: 40px;
    padding: 0;
  }
}
.block-banner {
  position: relative;
  z-index: 10;
  padding: 10px 20px;
  background: rgba(192, 57, 43, 0.12);
  border-bottom: 1px solid rgba(192, 57, 43, 0.25);
  color: #e8a8a2;
  font-size: 13px;
  text-align: center;
}
.header-username {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  margin-bottom: 1px;
}
.header-status {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: uppercase;
}
.header-status.online {
  color: var(--success);
}
.header-status.offline {
  color: var(--text-muted);
}
.header-status.unknown {
  color: var(--text-muted);
  opacity: 0.7;
}

/* ── MESSAGES AREA ── */
.chat-messages {
  position: relative;
  z-index: 10;
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat-messages::-webkit-scrollbar {
  width: 3px;
}
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: var(--border-mid);
  border-radius: 2px;
}

/* ── DATE DIVIDER ── */
.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}
.date-divider span {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

/* ── MESSAGE BUBBLE ── */
.message-row {
  display: flex;
  align-items: flex-end;
  position: relative;
  animation: messageIn 0.25s ease-out;
}
.message-row.own {
  justify-content: flex-end;
}
.message-row.other {
  justify-content: flex-start;
}
@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.message-bubble {
  max-width: 70%;
  padding: 10px 16px;
  border-radius: 16px;
  position: relative;
  cursor: context-menu;
}
.message-bubble.own {
  background: var(--text-primary);
  color: var(--bg);
  border-bottom-right-radius: 6px;
}
.message-bubble.other {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-bottom-left-radius: 6px;
}
.message-bubble.deleted {
  opacity: 0.72;
  font-style: italic;
}
.message-deleted-text {
  font-size: 13px;
  color: inherit;
  opacity: 0.75;
}
.message-edited-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0.7;
  margin-right: 6px;
}
.message-edit-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
}
.message-edit-input {
  width: 100%;
  min-height: 64px;
  resize: vertical;
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  color: inherit;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.45;
  padding: 8px 10px;
  outline: none;
}
.message-bubble.own .message-edit-input {
  background: rgba(11, 11, 11, 0.12);
  border-color: rgba(11, 11, 11, 0.2);
}
.message-edit-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.message-edit-btn {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 10px;
  cursor: pointer;
}
.message-bubble.own .message-edit-btn {
  background: rgba(11, 11, 11, 0.12);
  border-color: rgba(11, 11, 11, 0.2);
  color: inherit;
}
.message-edit-btn.primary {
  background: var(--text-primary);
  color: var(--bg);
  border-color: var(--text-primary);
}
.message-bubble.own .message-edit-btn.primary {
  background: rgba(11, 11, 11, 0.85);
  color: #f0ede8;
  border-color: transparent;
}
.message-edit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.message-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.message-row:hover .message-actions,
.message-row.picker-open .message-actions {
  opacity: 1;
  pointer-events: auto;
}
@media (hover: none) {
  .message-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
.message-row.own .message-actions {
  order: -1;
  margin-right: 6px;
}
.message-row.other .message-actions {
  margin-left: 6px;
}
.message-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.message-action-btn:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-hover);
}
.message-action-btn.danger:hover {
  color: #f5a9a3;
  border-color: rgba(192, 57, 43, 0.45);
  background: var(--red-dim);
}
.message-action-btn svg {
  width: 14px;
  height: 14px;
}
.msg-ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 188px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--border-mid);
  background: rgba(22, 22, 22, 0.96);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: grid;
  gap: 2px;
}
.msg-ctx-emoji-row {
  display: flex;
  gap: 2px;
  padding: 4px 2px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.msg-ctx-emoji {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.msg-ctx-emoji:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.1);
}
.msg-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  padding: 9px 10px;
  cursor: pointer;
  font: 13px 'Syne', sans-serif;
  text-align: left;
}
.msg-ctx-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.msg-ctx-item.danger {
  color: #f5a9a3;
}
.msg-ctx-item.danger:hover {
  background: rgba(192, 57, 43, 0.14);
}
.msg-ctx-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.msg-ctx-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.reaction-picker {
  position: absolute;
  bottom: calc(100% + 6px);
  z-index: 5;
  display: flex;
  gap: 2px;
  padding: 6px;
  border-radius: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.message-row.own .reaction-picker {
  right: 0;
}
.message-row.other .reaction-picker {
  left: 0;
}
.reaction-picker-emoji {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background 0.12s ease, transform 0.12s ease;
}
.reaction-picker-emoji:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: scale(1.12);
}
.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.message-reaction-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.message-reaction-chip:hover {
  border-color: var(--border-hover);
  background: rgba(255, 255, 255, 0.08);
}
.message-reaction-chip.active {
  border-color: rgba(232, 228, 220, 0.45);
  background: rgba(232, 228, 220, 0.12);
}
.message-bubble.own .message-reaction-chip {
  border-color: rgba(11, 11, 11, 0.18);
  background: rgba(11, 11, 11, 0.08);
  color: var(--bg);
}
.message-bubble.own .message-reaction-chip.active {
  border-color: rgba(11, 11, 11, 0.35);
  background: rgba(11, 11, 11, 0.14);
}
.message-text {
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0.004em;
  word-break: break-word;
}
.message-mention {
  display: inline;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  opacity: 0.92;
}
.message-bubble.own .message-mention {
  color: var(--bg);
}
.message-bubble.other .message-mention {
  color: var(--accent);
}
.message-mention:hover {
  opacity: 1;
}
.message-link {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}
.message-bubble.own .message-link {
  color: var(--bg);
}
.message-bubble.other .message-link {
  color: var(--accent);
}
.message-link:hover {
  opacity: 0.85;
}
.message-soundtok {
  margin-top: 2px;
  margin-bottom: 6px;
  width: min(260px, 72vw);
  border-radius: 14px;
  overflow: hidden;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.12);
  position: relative;
}
.message-bubble.own .message-soundtok {
  border-color: rgba(11, 11, 11, 0.18);
}
.message-soundtok-media {
  position: relative;
  background: #000;
}
.message-soundtok-video {
  display: block;
  width: 100%;
  aspect-ratio: 9 / 16;
  max-height: 360px;
  object-fit: cover;
  background: #000;
}
.message-soundtok-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #161616;
  cursor: pointer;
  text-align: left;
  color: #fff;
}
.message-bubble.own .message-soundtok-footer {
  background: #161616;
  border-top-color: rgba(255, 255, 255, 0.08);
}
.message-soundtok-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.75);
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #f0ede8;
  overflow: hidden;
  flex-shrink: 0;
}
.message-bubble.own .message-soundtok-avatar {
  border-color: rgba(255, 255, 255, 0.75);
  background: #222;
  color: #f0ede8;
}
.message-soundtok-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.message-soundtok-author-info {
  min-width: 0;
  flex: 1;
}
.message-soundtok-author-name {
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #f0ede8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.message-soundtok-author-username {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: rgba(240, 237, 232, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.message-soundtok-footer:hover .message-soundtok-author-name {
  text-decoration: underline;
}
.message-soundtok-desc {
  margin: 0;
  padding: 0 12px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(240, 237, 232, 0.85);
  background: #161616;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.message-sender {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--accent-dim);
  margin-bottom: 4px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.message-sender:hover {
  color: var(--accent);
  text-decoration: underline;
}
.mention-suggest {
  position: absolute;
  left: 16px;
  right: 72px;
  bottom: calc(100% + 8px);
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  z-index: 20;
}
.mention-suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.mention-suggest-item:last-child {
  border-bottom: none;
}
.mention-suggest-item:hover,
.mention-suggest-item.active {
  background: var(--bg-surface);
}
.mention-suggest-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-mid);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
  overflow: hidden;
}
.mention-suggest-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mention-suggest-meta {
  min-width: 0;
}
.mention-suggest-name {
  font-weight: 600;
}
.mention-suggest-display {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── TYPING INDICATOR ── */
.typing-dots {
  display: flex;
  gap: 3px;
  padding: 4px 0;
}
.typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typingBounce 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typingBounce {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* ── EMPTY STATE ── */
.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
}
.empty-icon {
  font-size: 36px;
  opacity: 0.3;
  margin-bottom: 8px;
}
.empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ── INPUT AREA ── */
.chat-input-area {
  position: relative;
  z-index: 10;
  padding: 14px 20px;
  background: rgba(11, 11, 11, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.input-form {
  display: flex;
  gap: 8px;
}
.message-input {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.message-input:focus {
  border-color: var(--border-hover);
}
.message-input::placeholder {
  color: var(--text-muted);
}
.message-input:disabled {
  opacity: 0.5;
}
.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--text-primary);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--bg);
  flex-shrink: 0;
}
.send-btn:hover {
  background: var(--accent-dim);
}
.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.send-btn:disabled:hover {
  background: var(--text-primary);
}
.send-btn svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* ── LOADING ── */
.chat-loading {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ── NOT FOUND ── */
.chat-not-found {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
}
.not-found-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.back-btn {
  height: 38px;
  padding: 0 20px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-surface);
}
`;

// ── Types ──
interface PendingMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string | null;
  chatId: string;
  createdAt: string;
  status: 'PENDING';
  clientMessageId: string;
}

type DisplayMessage = Message | PendingMessage;

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState<'block' | 'unblock' | null>(null);
  const [pinning, setPinning] = useState(false);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    x: number;
    y: number;
    isOwn: boolean;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  }>>([]);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const clearChatUnread = useChatUnreadStore((s) => s.clearChatUnread);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markAsReadRef = useRef<(ids: string[]) => void>(() => {});
  const markedReadIds = useRef(new Set<string>());
  
  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef(new Set<string>());
  const processedClientIds = useRef(new Set<string>());
  
  // Track other user's presence and typing
  const [presenceStatus, setPresenceStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const isGroupChat = chat?.type === 'GROUP';
  const pinState = useMemo(
    () => (chat && user ? resolveChatPinState(chat, user.id) : { isPinned: false, pinnedAt: null }),
    [chat, user]
  );

  // Get other user info (direct chats only)
  const otherUser = useMemo(() => {
    if (!chat || !user || isGroupChat) return null;
    if (chat.otherUser) return chat.otherUser;
    return chat.users.find(cu => cu.user.id !== user.id)?.user ?? null;
  }, [chat, user, isGroupChat]);

  // Handle new message from socket
  const handleNewMessage = (message: SocketMessage) => {
    if (processedMessageIds.current.has(message.id)) return;

    if (message.clientMessageId && processedClientIds.current.has(message.clientMessageId)) {
      setMessages(prev =>
        prev.map(m =>
          m.id === message.clientMessageId
            ? { ...message, createdAt: new Date(message.createdAt).toISOString() } as Message
            : m
        )
      );
      processedMessageIds.current.add(message.id);
      return;
    }

    processedMessageIds.current.add(message.id);
    setMessages(prev => [...prev, { ...message, createdAt: new Date(message.createdAt).toISOString() } as Message]);

    if (message.senderId !== user?.id) {
      markAsReadRef.current([message.id]);
    }
  };

  const handleMessageDelivered = (data: { clientMessageId: string; messageId: string }) => {
    setMessages(prev =>
      prev.map(m => {
        if (data.clientMessageId && m.clientMessageId === data.clientMessageId) {
          return { ...m, id: data.messageId, status: 'DELIVERED' } as Message;
        }
        if (m.id === data.messageId) {
          return { ...m, status: 'DELIVERED' } as Message;
        }
        return m;
      })
    );
  };

  const handleMessageRead = (data: { messageId: string; status: string }) => {
    if (data.status !== 'READ') return;
    setMessages(prev =>
      prev.map(m =>
        m.id === data.messageId ? { ...m, status: 'READ' } as Message : m
      )
    );
  };

  const normalizeIncomingMessage = (message: SocketMessage | Message): Message => ({
    ...message,
    createdAt: new Date(message.createdAt).toISOString(),
    deletedAt: message.deletedAt ? String(message.deletedAt) : null,
    reactions: message.reactions || [],
  } as Message);

  const handleMessageDeleted = (data: { chatId: string; message: SocketMessage }) => {
    const updated = normalizeIncomingMessage(data.message);
    setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    setReactionPickerId(prev => (prev === updated.id ? null : prev));
    setEditingId(prev => (prev === updated.id ? null : prev));
  };

  const handleMessageEdited = (data: { chatId: string; message: SocketMessage }) => {
    const updated = normalizeIncomingMessage(data.message);
    setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    setEditingId(prev => (prev === updated.id ? null : prev));
  };

  const handleMessageReaction = (data: { chatId: string; message: SocketMessage }) => {
    const updated = normalizeIncomingMessage(data.message);
    setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId || deletingId) return;
    setDeletingId(messageId);
    try {
      const updated = await chatsApi.deleteMessage(chatId, messageId);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, ...updated } as Message : m))
      );
      setReactionPickerId(prev => (prev === messageId ? null : prev));
      setEditingId(prev => (prev === messageId ? null : prev));
    } catch {
      setSendError('Не удалось удалить сообщение');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditMessage = (message: DisplayMessage) => {
    if (!('content' in message) || message.status === 'PENDING') return;
    if ('deletedAt' in message && message.deletedAt) return;
    setReactionPickerId(null);
    setEditingId(message.id);
    setEditDraft(message.content || '');
  };

  const cancelEditMessage = () => {
    setEditingId(null);
    setEditDraft('');
    setEditSaving(false);
  };

  const saveEditMessage = async () => {
    if (!chatId || !editingId || editSaving) return;
    const content = editDraft.trim();
    setEditSaving(true);
    try {
      const updated = await chatsApi.editMessage(chatId, editingId, content);
      setMessages(prev =>
        prev.map(m => (m.id === editingId ? { ...m, ...updated } as Message : m))
      );
      cancelEditMessage();
    } catch {
      setSendError('Не удалось изменить сообщение');
      setEditSaving(false);
    }
  };

  const handleCopyMessage = async (message: DisplayMessage) => {
    if (!('content' in message) || !message.content?.trim()) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === message.id ? null : prev));
      }, 1500);
    } catch {
      setSendError('Не удалось скопировать сообщение');
    }
  };

  const closeContextMenu = () => setContextMenu(null);

  const openMessageContextMenu = (
    event: ReactMouseEvent,
    message: DisplayMessage,
    isOwn: boolean,
  ) => {
    if (message.status === 'PENDING') return;
    if ('deletedAt' in message && message.deletedAt) return;
    if (editingId === message.id) return;
    event.preventDefault();
    event.stopPropagation();
    setReactionPickerId(null);

    const menuWidth = 220;
    const menuHeight = isOwn ? 220 : 160;
    const padding = 8;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding);
    setContextMenu({
      messageId: message.id,
      x: Math.max(padding, x),
      y: Math.max(padding, y),
      isOwn,
    });
  };

  useEffect(() => {
    if (!contextMenu) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContextMenu();
    };
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (contextMenuRef.current && target && contextMenuRef.current.contains(target)) return;
      closeContextMenu();
    };
    const onScroll = () => closeContextMenu();

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('touchstart', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('touchstart', onPointer);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [contextMenu]);

  const contextMessage = useMemo(() => {
    if (!contextMenu) return null;
    return messages.find((m) => m.id === contextMenu.messageId) || null;
  }, [contextMenu, messages]);

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!chatId) return;
    setReactionPickerId(null);
    closeContextMenu();
    try {
      const result = await chatsApi.toggleReaction(chatId, messageId, emoji);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, ...result.message } as Message : m))
      );
    } catch {
      setSendError('Не удалось обновить реакцию');
    }
  };

  const getReactionSummary = (message: DisplayMessage) => {
    if (!('reactions' in message) || !message.reactions?.length) return [];
    const counts = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
    for (const reaction of message.reactions) {
      const current = counts.get(reaction.emoji) || {
        emoji: reaction.emoji,
        count: 0,
        reactedByMe: false,
      };
      current.count += 1;
      if (reaction.userId === user?.id) current.reactedByMe = true;
      counts.set(reaction.emoji, current);
    }
    return Array.from(counts.values());
  };

  const handleTyping = (isTyping: boolean, userId: string) => {
    if (userId !== user?.id) {
      setOtherUserTyping(isTyping);
      if (isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
      }
    }
  };

  const handleSocketError = (error: { message: string }) => {
    setSendError(error.message);
  };

  const handlePresence = (isOnline: boolean) => {
    setPresenceStatus(isOnline ? 'online' : 'offline');
  };

  const handleUserUpdated = (data: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  }) => {
    setChat((prev) => {
      if (!prev) return prev;
      const patchUser = (u: { id: string; username: string; displayName?: string | null; avatar?: string | null }) =>
        u.id === data.id
          ? {
              ...u,
              username: data.username,
              displayName: data.displayName ?? u.displayName,
              avatar: data.avatar ?? u.avatar,
            }
          : u;

      return {
        ...prev,
        otherUser: prev.otherUser ? patchUser(prev.otherUser) : prev.otherUser,
        users: prev.users.map((cu) => ({
          ...cu,
          user: patchUser(cu.user),
        })),
      };
    });
    setMessages((prev) =>
      prev.map((m) => {
        if (!('sender' in m) || !m.sender || m.sender.id !== data.id) return m;
        return {
          ...m,
          sender: {
            ...m.sender,
            username: data.username,
            displayName: data.displayName ?? m.sender.displayName,
            avatar: data.avatar ?? m.sender.avatar,
          },
        };
      }),
    );
  };

  const getPresenceLabel = () => {
    if (otherUserTyping) return 'печатает...';
    if (presenceStatus === 'unknown') return 'проверка статуса...';
    if (presenceStatus === 'online') return 'В сети';
    return 'Не в сети';
  };

  // WebSocket connection
  const {
    isConnected,
    sendChatMessage,
    markChatAsRead,
    sendChatTyping,
  } = useChatSocket(chatId, token, otherUser?.id, {
    onMessage: handleNewMessage,
    onMessageDeleted: handleMessageDeleted,
    onMessageEdited: handleMessageEdited,
    onMessageReaction: handleMessageReaction,
    onMessageDelivered: handleMessageDelivered,
    onMessageRead: handleMessageRead,
    onTyping: handleTyping,
    onPresence: handlePresence,
    onOtherUserOnline: handlePresence,
    onUserUpdated: handleUserUpdated,
    onError: handleSocketError,
  });

  useEffect(() => {
    markAsReadRef.current = markChatAsRead;
  }, [markChatAsRead]);

  useEffect(() => {
    if (!otherUser?.id || isGroupChat) return;

    setPresenceStatus('unknown');
    usersApi.getPresence(otherUser.id)
      .then((data) => setPresenceStatus(data.isOnline ? 'online' : 'offline'))
      .catch(() => setPresenceStatus('offline'));

    blocksApi.checkStatus(otherUser.id)
      .then(setBlockStatus)
      .catch(() => setBlockStatus(null));
  }, [otherUser?.id, isGroupChat]);

  const openProfile = () => {
    if (!otherUser) return;
    navigate(`/profile/${otherUser.username}`);
  };

  const handleBlockToggle = () => {
    if (!otherUser || blockLoading) return;
    setBlockConfirm(blockStatus?.blockedByMe ? 'unblock' : 'block');
  };

  const executeBlockToggle = async () => {
    if (!otherUser || blockLoading) return;

    setBlockLoading(true);
    try {
      if (blockStatus?.blockedByMe) {
        await blocksApi.unblockUser(otherUser.id);
        setBlockStatus({ blockedByMe: false, blockedByOther: false, isBlocked: false });
      } else {
        await blocksApi.blockUser(otherUser.id);
        setBlockStatus({ blockedByMe: true, blockedByOther: false, isBlocked: true });
      }
      setBlockConfirm(null);
    } catch {
      setSendError('Не удалось изменить статус блокировки');
    } finally {
      setBlockLoading(false);
    }
  };

  const isMessagingBlocked = !isGroupChat && (blockStatus?.isBlocked ?? false);
  const canSendMessages = isGroupChat || !!otherUser;

  const handleTogglePin = async () => {
    if (!chat || pinning) return;

    const nextPinned = !pinState.isPinned;
    setPinning(true);
    setSendError(null);
    try {
      const result = await chatsApi.pinChat(chat.id, nextPinned);
      const pinnedAt = result.pinnedAt ? String(result.pinnedAt) : null;
      setChat((prev) => {
        if (!prev || !user) return prev;
        return {
          ...prev,
          isPinned: result.isPinned,
          pinnedAt,
          users: prev.users.map((cu) =>
            cu.userId === user.id ? { ...cu, pinnedAt } : cu
          ),
        };
      });
    } catch {
      setSendError('Не удалось изменить закрепление');
    } finally {
      setPinning(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]);

  useEffect(() => {
    if (!chatId) return;

    const fetchChat = async () => {
      try {
        const chats = await chatsApi.getChats();
        const chatData = chats.find((c: Chat) => c.id === chatId);
        const messagesData = await chatsApi.getMessages(chatId);

        const resolvedChat = chatData || messagesData.chat;
        if (resolvedChat) {
          setChat(resolvedChat);
          
          // Process messages and track IDs
          const loadedMessages = messagesData.messages || messagesData || [];
          loadedMessages.forEach((m: Message) => {
            processedMessageIds.current.add(m.id);
            if (m.clientMessageId) {
              processedClientIds.current.add(m.clientMessageId);
            }
          });
          
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Failed to fetch chat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
    
    // Reset on chat change
    return () => {
      processedMessageIds.current.clear();
      processedClientIds.current.clear();
      markedReadIds.current.clear();
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !user?.id || messages.length === 0) return;

    const unreadIds = messages
      .filter((m): m is Message => {
        if (m.status === 'PENDING' || m.status === 'READ') return false;
        if (isGroupChat) return m.senderId !== user.id;
        return m.receiverId === user.id;
      })
      .map(m => m.id)
      .filter(id => !markedReadIds.current.has(id));

    if (unreadIds.length === 0) return;

    unreadIds.forEach(id => markedReadIds.current.add(id));

    if (isConnected) {
      markChatAsRead(unreadIds);
    } else {
      chatsApi.markAsRead(chatId, unreadIds).catch(console.error);
    }

    if (chatId) {
      clearChatUnread(chatId);
    }
  }, [chatId, user?.id, isConnected, messages, markChatAsRead, clearChatUnread, isGroupChat]);

  useEffect(() => {
    if (!sendError) return;
    const timer = setTimeout(() => setSendError(null), 4000);
    return () => clearTimeout(timer);
  }, [sendError]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const confirmSentMessage = (clientMessageId: string, serverMessage: Message) => {
    processedMessageIds.current.add(serverMessage.id);
    setMessages(prev =>
      prev.map(m =>
        m.id === clientMessageId
          ? { ...serverMessage, createdAt: new Date(serverMessage.createdAt).toISOString() }
          : m
      )
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !canSendMessages || sending || isMessagingBlocked) return;

    const content = newMessage.trim();
    const clientMessageId = `${chatId}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const receiverId = isGroupChat ? undefined : otherUser?.id;

    setNewMessage('');
    setSending(true);
    setSendError(null);
    clearMentionSuggestions();

    const optimisticMessage: PendingMessage = {
      id: clientMessageId,
      content,
      senderId: user!.id,
      receiverId,
      chatId,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      clientMessageId,
    };

    processedClientIds.current.add(clientMessageId);
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      let sent = false;

      if (isConnected) {
        const result = await sendChatMessage(content, receiverId, clientMessageId);
        if (result.success && result.message) {
          confirmSentMessage(clientMessageId, {
            ...result.message,
            createdAt: new Date(result.message.createdAt).toISOString(),
          } as Message);
          sent = true;
        } else if (result.error && !result.error.includes('timeout')) {
          throw new Error(result.error);
        }
      }

      if (!sent) {
        const serverMessage = await chatsApi.sendMessage(chatId, content, receiverId, clientMessageId);
        confirmSentMessage(clientMessageId, serverMessage);
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== clientMessageId));
      processedClientIds.current.delete(clientMessageId);
      setNewMessage(content);
      setSendError(
        error instanceof Error ? error.message : 'Не удалось отправить сообщение'
      );
    } finally {
      setSending(false);
      sendChatTyping(false);
    }
  };

  const openMentionProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const openMessageLink = (url: string) => {
    try {
      const parsed = new URL(url, window.location.origin);
      const isSameOrigin = parsed.origin === window.location.origin;
      if (isSameOrigin && parsed.pathname.startsWith('/soundtok')) {
        navigate(`${parsed.pathname}${parsed.search}`);
        return;
      }
      if (isSameOrigin && parsed.pathname.startsWith('/profile/')) {
        navigate(`${parsed.pathname}${parsed.search}`);
        return;
      }
      if (isSameOrigin && parsed.pathname.startsWith('/chats')) {
        navigate(`${parsed.pathname}${parsed.search}`);
        return;
      }
    } catch {
      // fall through to external open
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const clearMentionSuggestions = () => {
    setMentionSuggestions([]);
    setMentionRange(null);
    setMentionIndex(0);
  };

  const updateMentionSuggestions = (value: string, cursor: number) => {
    const mention = extractMentionQuery(value, cursor);
    if (!mention) {
      clearMentionSuggestions();
      return;
    }

    setMentionRange({ start: mention.start, end: mention.end });
    setMentionIndex(0);

    if (mentionSearchRef.current) clearTimeout(mentionSearchRef.current);

    const chatMembers = (chat?.users || [])
      .map((cu) => cu.user)
      .filter((u) => u.id !== user?.id)
      .filter((u) =>
        !mention.query ||
        u.username.toLowerCase().startsWith(mention.query.toLowerCase())
      )
      .slice(0, 6);

    if (chatMembers.length > 0 && mention.query.length === 0) {
      setMentionSuggestions(chatMembers);
    }

    mentionSearchRef.current = setTimeout(async () => {
      if (!mention.query) {
        setMentionSuggestions(chatMembers);
        return;
      }
      try {
        const users = await chatsApi.searchUsers(mention.query);
        const filtered = (users as Array<{
          id: string;
          username: string;
          displayName?: string | null;
          avatar?: string | null;
        }>)
          .filter((u) => u.id !== user?.id)
          .slice(0, 8);
        setMentionSuggestions(filtered.length > 0 ? filtered : chatMembers);
      } catch {
        setMentionSuggestions(chatMembers);
      }
    }, 200);
  };

  const applyMention = (username: string) => {
    if (!mentionRange) return;
    const { value, cursor } = insertMention(
      newMessage,
      mentionRange.start,
      mentionRange.end,
      username
    );
    setNewMessage(value);
    clearMentionSuggestions();
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  };

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setNewMessage(value);
    updateMentionSuggestions(value, cursor);

    sendChatTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendChatTyping(false);
    }, 2000);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionSuggestions.length > 0 && mentionRange) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) =>
          (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(mentionSuggestions[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearMentionSuggestions();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  useEffect(() => {
    return () => {
      if (mentionSearchRef.current) clearTimeout(mentionSearchRef.current);
    };
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStatus = (message: DisplayMessage) => {
    if (message.status === 'PENDING') {
      return <Loader2 size={12} className="loader" />;
    }
    if (message.senderId !== user?.id) return null;
    
    if (message.status === 'READ') {
      return <CheckCheck size={12} className="read" />;
    }
    if (message.status === 'DELIVERED') {
      return <CheckCheck size={12} />;
    }
    return <Check size={12} />;
  };

  return (
    <div className="chat-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="chat-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="chat-noise" />
      <div className="chat-grid-bg" />

      {sendError && (
        <div className="error-toast">{sendError}</div>
      )}

      {loading ? (
        <div className="chat-loading">
          <span className="loading-text">Загрузка...</span>
        </div>
      ) : !chat ? (
        <div className="chat-not-found">
          <span className="not-found-label">Чат не найден</span>
          <button onClick={() => navigate('/chats')} className="back-btn">
            Вернуться к чатам
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="chat-header">
            <button onClick={() => navigate('/chats')} className="header-back">
              <ArrowLeft size={18} />
            </button>

            {isGroupChat ? (
              <div className="header-group-btn">
                <div className="header-avatar">
                  <Users size={18} />
                </div>
                <div className="header-info">
                  <div className="header-username">{chat.name || 'Группа'}</div>
                  <div className="header-status">
                    {chat.memberCount || chat.users.length} участников
                  </div>
                </div>
              </div>
            ) : otherUser ? (
              <>
                <button type="button" className="header-profile-btn" onClick={openProfile}>
                  <div className="header-avatar">
                    {resolveMediaUrl(otherUser.avatar) ? (
                      <img src={resolveMediaUrl(otherUser.avatar)!} alt={otherUser.username} />
                    ) : (
                      otherUser.username[0].toUpperCase()
                    )}
                    {presenceStatus === 'online' && <span className="online-indicator" />}
                    {presenceStatus === 'offline' && <span className="offline-indicator" />}
                  </div>
                  <div className="header-info">
                    <div className="header-username">
                      {otherUser.displayName || `@${otherUser.username}`}
                    </div>
                    <div className={`header-status ${presenceStatus}`}>
                      {getPresenceLabel()}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`header-block-btn ${blockStatus?.blockedByMe ? 'unblock' : ''}`}
                  onClick={handleBlockToggle}
                  disabled={blockLoading}
                  title={blockStatus?.blockedByMe ? 'Разблокировать' : 'Заблокировать'}
                >
                  {blockStatus?.blockedByMe ? <ShieldOff size={17} /> : <Ban size={17} />}
                  <span className="header-block-label">
                    {blockStatus?.blockedByMe ? 'Разблокировать' : 'Заблокировать'}
                  </span>
                </button>
              </>
            ) : null}

            <button
              type="button"
              className={`header-pin-btn ${pinState.isPinned ? 'active' : ''}`}
              onClick={handleTogglePin}
              disabled={pinning}
              title={pinState.isPinned ? 'Открепить' : 'Закрепить'}
            >
              {pinning ? (
                <Loader2 size={17} className="loader" />
              ) : pinState.isPinned ? (
                <PinOff size={17} />
              ) : (
                <Pin size={17} />
              )}
            </button>
          </header>

          {isMessagingBlocked && (
            <div className="block-banner">
              {blockStatus?.blockedByMe
                ? 'Вы заблокировали этого пользователя. Сообщения недоступны.'
                : 'Этот пользователь ограничил общение с вами.'}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-icon">—</div>
                <div className="empty-label">Нет сообщений</div>
                <div className="empty-hint">Начните диалог</div>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.senderId === user?.id;
                const isPending = message.status === 'PENDING';
                const isDeleted = 'deletedAt' in message && !!message.deletedAt;
                const senderName = 'sender' in message
                  ? message.sender?.username
                  : undefined;
                const sharedTok = !isDeleted && 'soundTok' in message ? message.soundTok : null;
                const sharedAuthor = sharedTok?.author;
                const sharedAuthorName =
                  sharedAuthor?.displayName ||
                  (sharedAuthor?.username ? `@${sharedAuthor.username}` : 'Автор');
                const sharedUsername = sharedAuthor?.username
                  ? `@${sharedAuthor.username}`
                  : null;
                const sharedAvatarUrl = resolveMediaUrl(sharedAuthor?.avatar);
                const reactionSummary = getReactionSummary(message);
                const pickerOpen = reactionPickerId === message.id;

                return (
                  <div
                    key={message.id}
                    className={`message-row ${isOwn ? 'own' : 'other'} ${isPending ? 'pending' : ''} ${pickerOpen ? 'picker-open' : ''}`}
                  >
                    <div
                      className={`message-bubble ${isOwn ? 'own' : 'other'} ${isDeleted ? 'deleted' : ''}`}
                      onContextMenu={(event) => openMessageContextMenu(event, message, isOwn)}
                    >
                      {pickerOpen && (
                        <div className="reaction-picker" role="listbox">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="reaction-picker-emoji"
                              onClick={() => handleToggleReaction(message.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      {isGroupChat && !isOwn && senderName && (
                        <button
                          type="button"
                          className="message-sender"
                          onClick={() => openMentionProfile(senderName)}
                        >
                          @{senderName}
                        </button>
                      )}
                      {isDeleted ? (
                        <p className="message-deleted-text">Сообщение удалено</p>
                      ) : editingId === message.id ? (
                        <div className="message-edit-box">
                          <textarea
                            className="message-edit-input"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            maxLength={4000}
                            autoFocus
                          />
                          <div className="message-edit-actions">
                            <button
                              type="button"
                              className="message-edit-btn"
                              onClick={cancelEditMessage}
                              disabled={editSaving}
                            >
                              Отмена
                            </button>
                            <button
                              type="button"
                              className="message-edit-btn primary"
                              onClick={() => void saveEditMessage()}
                              disabled={editSaving || (!editDraft.trim() && !sharedTok)}
                            >
                              {editSaving ? 'Сохранение…' : 'Сохранить'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {sharedTok && (
                            <div className="message-soundtok">
                              <div className="message-soundtok-media">
                                <video
                                  className="message-soundtok-video"
                                  src={resolveMediaUrl(sharedTok.videoUrl) || undefined}
                                  controls
                                  playsInline
                                  preload="metadata"
                                />
                              </div>
                              <button
                                type="button"
                                className="message-soundtok-footer"
                                onClick={() => {
                                  if (sharedAuthor?.username) {
                                    openMentionProfile(sharedAuthor.username);
                                  }
                                }}
                              >
                                <div className="message-soundtok-avatar">
                                  {sharedAvatarUrl ? (
                                    <img
                                      src={sharedAvatarUrl}
                                      alt={sharedAuthor?.username || 'author'}
                                    />
                                  ) : (
                                    (sharedAuthor?.username?.[0] || '?').toUpperCase()
                                  )}
                                </div>
                                <div className="message-soundtok-author-info">
                                  <div className="message-soundtok-author-name">
                                    {sharedAuthorName}
                                  </div>
                                  {sharedUsername && (
                                    <div className="message-soundtok-author-username">
                                      {sharedUsername}
                                    </div>
                                  )}
                                </div>
                              </button>
                              {sharedTok.description?.trim() && (
                                <div className="message-soundtok-desc">
                                  {sharedTok.description}
                                </div>
                              )}
                            </div>
                          )}
                          {!!message.content &&
                            !(
                              sharedTok &&
                              message.content.trim() === (sharedTok.description || '').trim()
                            ) && (
                            <p className="message-text">
                              {renderTextWithMentions({
                                text: message.content,
                                onMentionClick: (username) => openMentionProfile(username),
                                onLinkClick: (url) => openMessageLink(url),
                              })}
                            </p>
                          )}
                          {!message.content && !sharedTok && (
                            <p className="message-text"> </p>
                          )}
                        </>
                      )}
                      {reactionSummary.length > 0 && !isDeleted && editingId !== message.id && (
                        <div className="message-reactions">
                          {reactionSummary.map((reaction) => (
                            <button
                              key={reaction.emoji}
                              type="button"
                              className={`message-reaction-chip ${reaction.reactedByMe ? 'active' : ''}`}
                              onClick={() => handleToggleReaction(message.id, reaction.emoji)}
                              title={reaction.reactedByMe ? 'Убрать реакцию' : 'Поставить реакцию'}
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="message-meta">
                        {'editedAt' in message && message.editedAt && !isDeleted && (
                          <span className="message-edited-label">изм.</span>
                        )}
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                        {!isDeleted && <span className="message-status">{renderStatus(message)}</span>}
                      </div>
                    </div>
                    {!isPending && !isDeleted && editingId !== message.id && (
                      <div className="message-actions">
                        <button
                          type="button"
                          className="message-action-btn"
                          title={copiedId === message.id ? 'Скопировано' : 'Копировать'}
                          onClick={() => void handleCopyMessage(message)}
                          disabled={!message.content?.trim()}
                        >
                          {copiedId === message.id ? <Check /> : <Copy />}
                        </button>
                        <button
                          type="button"
                          className="message-action-btn"
                          title="Реакция"
                          onClick={() =>
                            setReactionPickerId(pickerOpen ? null : message.id)
                          }
                        >
                          <SmilePlus />
                        </button>
                        {isOwn && (
                          <>
                            <button
                              type="button"
                              className="message-action-btn"
                              title="Редактировать"
                              onClick={() => startEditMessage(message)}
                            >
                              <Pencil />
                            </button>
                            <button
                              type="button"
                              className="message-action-btn danger"
                              title="Удалить"
                              disabled={deletingId === message.id}
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              {deletingId === message.id ? (
                                <Loader2 className="loader" />
                              ) : (
                                <Trash2 />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            
            {otherUserTyping && !isGroupChat && (
              <div className="typing-indicator">
                <span className="typing-text">печатает</span>
                <div className="typing-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            {mentionSuggestions.length > 0 && (
              <div className="mention-suggest" role="listbox">
                {mentionSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className={`mention-suggest-item ${index === mentionIndex ? 'active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMention(suggestion.username);
                    }}
                  >
                    <div className="mention-suggest-avatar">
                      {suggestion.avatar ? (
                        <img src={suggestion.avatar} alt={suggestion.username} />
                      ) : (
                        suggestion.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="mention-suggest-meta">
                      <div className="mention-suggest-name">@{suggestion.username}</div>
                      {suggestion.displayName && (
                        <div className="mention-suggest-display">{suggestion.displayName}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="input-form">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleTypingInput}
                onKeyDown={handleInputKeyDown}
                onSelect={(e) => {
                  const target = e.currentTarget;
                  updateMentionSuggestions(
                    target.value,
                    target.selectionStart ?? target.value.length
                  );
                }}
                onBlur={() => {
                  setTimeout(() => clearMentionSuggestions(), 150);
                }}
                placeholder={isMessagingBlocked ? 'Сообщения недоступны' : 'Введите сообщение... @user'}
                className="message-input"
                disabled={sending || isMessagingBlocked || !canSendMessages}
                maxLength={4000}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || isMessagingBlocked || !canSendMessages}
                className="send-btn"
              >
                {sending ? (
                  <Loader2 size={18} className="loader" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          </div>
        </>
      )}

      {contextMenu && contextMessage && typeof document !== 'undefined' && createPortal(
        <div
          ref={contextMenuRef}
          className="msg-ctx-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="msg-ctx-emoji-row" role="group" aria-label="Реакции">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="msg-ctx-emoji"
                onClick={() => void handleToggleReaction(contextMenu.messageId, emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="msg-ctx-item"
            disabled={!contextMessage.content?.trim()}
            onClick={() => {
              void handleCopyMessage(contextMessage);
              closeContextMenu();
            }}
          >
            <Copy />
            Копировать
          </button>
          {contextMenu.isOwn && (
            <button
              type="button"
              className="msg-ctx-item"
              onClick={() => {
                startEditMessage(contextMessage);
                closeContextMenu();
              }}
            >
              <Pencil />
              Редактировать
            </button>
          )}
          {contextMenu.isOwn && (
            <button
              type="button"
              className="msg-ctx-item danger"
              disabled={deletingId === contextMenu.messageId}
              onClick={() => {
                void handleDeleteMessage(contextMenu.messageId);
                closeContextMenu();
              }}
            >
              <Trash2 />
              Удалить
            </button>
          )}
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={blockConfirm !== null}
        title={
          blockConfirm === 'block'
            ? 'Заблокировать пользователя?'
            : 'Разблокировать пользователя?'
        }
        message={
          blockConfirm === 'block'
            ? `Вы уверены, что хотите заблокировать @${otherUser?.username ?? 'пользователя'}? Вы больше не сможете отправлять друг другу сообщения.`
            : `Разблокировать @${otherUser?.username ?? 'пользователя'}? Вы снова сможете общаться в чате.`
        }
        confirmLabel={blockConfirm === 'block' ? 'Заблокировать' : 'Разблокировать'}
        cancelLabel="Отмена"
        variant={blockConfirm === 'block' ? 'danger' : 'default'}
        icon={blockConfirm === 'block' ? 'ban' : 'unblock'}
        loading={blockLoading}
        onConfirm={executeBlockToggle}
        onCancel={() => !blockLoading && setBlockConfirm(null)}
      />
    </div>
  );
}