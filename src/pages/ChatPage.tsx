import { useState, useEffect, useRef, useMemo, type MouseEvent as ReactMouseEvent, type ClipboardEvent as ReactClipboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, CheckCheck, Loader2, Ban, ShieldOff, Pin, PinOff, Users, Trash2, SmilePlus, Pencil, Copy, ImagePlus, X, Reply } from 'lucide-react';
import { chatsApi, Chat, Message, MessageReplyPreview, REACTION_EMOJIS, resolveChatPinState } from '../api/chats';
import { blocksApi, BlockStatus } from '../api/blocks';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useChatUnreadStore } from '../store/chatUnreadStore';
import { useChatSocket, Message as SocketMessage } from '../hooks/useSocket';
import ConfirmDialog from '../components/ConfirmDialog';
import GroupInfoPanel from '../components/GroupInfoPanel';
import { resolveMediaUrl } from '../lib/mediaUrl';
import {
  extractMentionQuery,
  insertMention,
  renderTextWithMentions,
} from '../utils/messageMentions';

// ── Styles ──
const FONT_IMPORT = '';

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
  cursor: pointer;
}
.header-group-btn:hover .header-username {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.message-bubble.editing {
  box-shadow: 0 0 0 1.5px rgba(240, 237, 232, 0.45);
}
.message-deleted-text {
  font-size: 13px;
  color: inherit;
  opacity: 0.75;
}
.message-edited-label {
  font-size: 11px;
  opacity: 0.62;
  margin-right: 6px;
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
  white-space: pre-wrap;
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
.message-soundtok-poster {
  width: 100%;
  aspect-ratio: 9 / 16;
  max-height: 360px;
  border: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(240,237,232,0.12), transparent 45%),
    linear-gradient(160deg, #1a1a1a, #0d0d0d);
  color: #f0ede8;
  cursor: pointer;
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 24px 12px;
}
.message-soundtok-poster:hover {
  filter: brightness(1.08);
}
.message-soundtok-play {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(240,237,232,0.92);
  color: #0b0b0b;
  font-size: 18px;
  padding-left: 3px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}
.message-soundtok-poster-label {
  font: 600 12px 'Syne', sans-serif;
  letter-spacing: 0.04em;
  opacity: 0.7;
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
.edit-compose-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-mid);
  background: var(--bg-elevated);
  border-left: 3px solid var(--accent);
  cursor: text;
}
.reply-compose-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-mid);
  background: var(--bg-elevated);
  border-left: 3px solid #6ea8fe;
  cursor: text;
}
.reply-compose-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(110, 168, 254, 0.12);
  color: #6ea8fe;
  flex-shrink: 0;
}
.reply-compose-icon svg {
  width: 14px;
  height: 14px;
}
.reply-compose-body {
  min-width: 0;
  flex: 1;
}
.reply-compose-title {
  font-size: 12px;
  font-weight: 600;
  color: #6ea8fe;
  margin-bottom: 2px;
}
.reply-compose-preview {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reply-compose-close {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.reply-compose-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}
.reply-compose-close svg {
  width: 16px;
  height: 16px;
}
.message-reply-quote {
  display: block;
  width: 100%;
  text-align: left;
  margin: 0 0 8px;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  border-left: 3px solid rgba(110, 168, 254, 0.85);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.message-bubble.own .message-reply-quote {
  background: rgba(11, 11, 11, 0.12);
  border-left-color: rgba(11, 11, 11, 0.45);
}
.message-reply-author {
  font-size: 12px;
  font-weight: 600;
  color: #6ea8fe;
  margin-bottom: 2px;
}
.message-bubble.own .message-reply-author {
  color: rgba(11, 11, 11, 0.75);
}
.message-reply-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.message-bubble.own .message-reply-text {
  color: rgba(11, 11, 11, 0.65);
}
.message-row.reply-flash .message-bubble {
  animation: reply-flash 1.1s ease;
}
@keyframes reply-flash {
  0%, 100% { box-shadow: none; }
  25% { box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.7); }
}
.edit-compose-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(240, 237, 232, 0.08);
  color: var(--accent);
  flex-shrink: 0;
}
.edit-compose-icon svg {
  width: 14px;
  height: 14px;
}
.edit-compose-body {
  min-width: 0;
  flex: 1;
}
.edit-compose-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 2px;
}
.edit-compose-preview {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.edit-compose-close {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.edit-compose-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}
.edit-compose-close svg {
  width: 16px;
  height: 16px;
}
.input-form {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  align-items: flex-end;
}
.attach-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.attach-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.attach-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.image-preview-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
}
.image-preview-bar img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
}
.image-preview-meta {
  flex: 1;
  min-width: 0;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.image-preview-clear {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
}
.message-image {
  display: block;
  max-width: min(260px, 70vw);
  max-height: 320px;
  border-radius: 10px;
  margin-bottom: 8px;
  object-fit: cover;
  cursor: zoom-in;
}
.message-bubble.own .message-image {
  margin-left: auto;
}

/* Group panel */
.group-panel-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.group-panel-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(0,0,0,0.55);
  cursor: pointer;
}
.group-panel-sheet {
  position: relative;
  width: min(480px, 100%);
  max-height: min(82vh, 720px);
  overflow: auto;
  background: #111;
  border: 1px solid #232323;
  border-radius: 18px 18px 0 0;
  padding: 18px 16px 28px;
  z-index: 1;
}
.group-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.group-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b6b6b;
}
.group-panel-close {
  appearance: none;
  border: 1px solid #2e2e2e;
  background: transparent;
  color: #c5c0b8;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.group-panel-avatar-block {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 16px;
}
.group-panel-avatar {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  border: 1px solid #2e2e2e;
  background: #181818;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #6b6b6b;
  flex-shrink: 0;
}
.group-panel-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.group-panel-name {
  font-size: 18px;
  font-weight: 700;
  color: #f0ede8;
}
.group-panel-count {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 2px;
}
.group-panel-avatar-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.group-panel-avatar-actions button {
  appearance: none;
  border: 1px solid #2e2e2e;
  background: transparent;
  color: #c5c0b8;
  border-radius: 8px;
  padding: 6px 10px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.group-panel-error {
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 12px;
}
.group-panel-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.group-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px;
  border-bottom: 1px solid #1c1c1c;
}
.group-member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: #1a1a1a;
  display: grid;
  place-items: center;
  color: #c5c0b8;
  font-weight: 700;
  flex-shrink: 0;
}
.group-member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.group-member-info { flex: 1; min-width: 0; }
.group-member-name {
  font-size: 14px;
  color: #f0ede8;
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-member-you {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #6b6b6b;
  text-transform: uppercase;
}
.group-member-sub {
  font-size: 12px;
  color: #6b6b6b;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.group-member-role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #c5c0b8;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.group-member-actions {
  display: flex;
  gap: 4px;
}
.group-member-actions button {
  appearance: none;
  border: 1px solid #2e2e2e;
  background: transparent;
  color: #6b6b6b;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.group-member-actions button:hover {
  color: #f0ede8;
  border-color: #3d3d3d;
}
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.message-input {
  flex: 1;
  min-height: 42px;
  max-height: min(40vh, 220px);
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  outline: none;
  resize: none;
  overflow-y: auto;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.message-input.editing {
  border-color: rgba(240, 237, 232, 0.35);
  min-height: 72px;
}
.message-input:focus {
  border-color: var(--border-hover);
}
.message-input.editing:focus {
  border-color: rgba(240, 237, 232, 0.55);
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
  imageUrl?: string | null;
  createdAt: string;
  status: 'PENDING';
  clientMessageId: string;
  replyToId?: string | null;
  replyTo?: MessageReplyPreview | null;
}

type DisplayMessage = Message | PendingMessage;

type SharedTok = NonNullable<Message['soundTok']>;

function SharedSoundTokCard({
  sharedTok,
  onOpenAuthor,
}: {
  sharedTok: SharedTok;
  onOpenAuthor: (username: string) => void;
}) {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = resolveMediaUrl(sharedTok.videoUrl);
  const sharedAuthor = sharedTok.author;
  const sharedAuthorName =
    sharedAuthor?.displayName ||
    (sharedAuthor?.username ? `@${sharedAuthor.username}` : 'Автор');
  const sharedUsername = sharedAuthor?.username ? `@${sharedAuthor.username}` : null;
  const sharedAvatarUrl = resolveMediaUrl(sharedAuthor?.avatar);

  useEffect(() => {
    if (!active) return;
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => undefined);
  }, [active]);

  return (
    <div className="message-soundtok">
      <div className="message-soundtok-media">
        {active && videoUrl ? (
          <video
            ref={videoRef}
            className="message-soundtok-video"
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <button
            type="button"
            className="message-soundtok-poster"
            onClick={() => setActive(true)}
            aria-label="Смотреть SoundTok"
          >
            <span className="message-soundtok-play" aria-hidden>
              ▶
            </span>
            <span className="message-soundtok-poster-label">Нажмите, чтобы смотреть</span>
          </button>
        )}
      </div>
      <button
        type="button"
        className="message-soundtok-footer"
        onClick={() => {
          if (sharedAuthor?.username) onOpenAuthor(sharedAuthor.username);
        }}
      >
        <div className="message-soundtok-avatar">
          {sharedAvatarUrl ? (
            <img src={sharedAvatarUrl} alt={sharedAuthor?.username || 'author'} />
          ) : (
            (sharedAuthor?.username?.[0] || '?').toUpperCase()
          )}
        </div>
        <div className="message-soundtok-author-info">
          <div className="message-soundtok-author-name">{sharedAuthorName}</div>
          {sharedUsername && (
            <div className="message-soundtok-author-username">{sharedUsername}</div>
          )}
        </div>
      </button>
      {sharedTok.description?.trim() && (
        <div className="message-soundtok-desc">{sharedTok.description}</div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
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
  const [editSaving, setEditSaving] = useState(false);
  const [composerStash, setComposerStash] = useState('');
  const [replyingTo, setReplyingTo] = useState<DisplayMessage | null>(null);
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesMetaRef = useRef<{ length: number; lastId: string | null }>({
    length: 0,
    lastId: null,
  });
  const stickToBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  const resizeComposer = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = Math.min(window.innerHeight * 0.4, 220);
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  };

  const startEditMessage = (message: DisplayMessage) => {
    if (!('content' in message) || message.status === 'PENDING') return;
    if ('deletedAt' in message && message.deletedAt) return;
    setReactionPickerId(null);
    setContextMenu(null);
    setReplyingTo(null);
    if (!editingId) {
      setComposerStash(newMessage);
    }
    setEditingId(message.id);
    setNewMessage(message.content || '');
    clearMentionSuggestions();
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      resizeComposer();
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
      document
        .querySelector(`[data-message-id="${message.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const buildReplyPreview = (message: DisplayMessage): MessageReplyPreview => {
    const sender =
      'sender' in message && message.sender
        ? {
            id: message.sender.id,
            username: message.sender.username,
            displayName: message.sender.displayName,
          }
        : {
            id: message.senderId,
            username: user?.id === message.senderId ? user.username : 'пользователь',
            displayName: null,
          };

    return {
      id: message.id,
      content: message.content || '',
      senderId: message.senderId,
      deletedAt: 'deletedAt' in message ? message.deletedAt : null,
      soundTokId: 'soundTokId' in message ? message.soundTokId : null,
      imageUrl: 'imageUrl' in message ? message.imageUrl : null,
      sender,
    };
  };

  const startReplyMessage = (message: DisplayMessage) => {
    if (message.status === 'PENDING') return;
    if ('deletedAt' in message && message.deletedAt) return;
    setReactionPickerId(null);
    setContextMenu(null);
    if (editingId) {
      setEditingId(null);
      setEditSaving(false);
      setNewMessage(composerStash);
      setComposerStash('');
    }
    setReplyingTo(message);
    clearMentionSuggestions();
    requestAnimationFrame(() => {
      resizeComposer();
      inputRef.current?.focus();
    });
  };

  const cancelReplyMessage = () => {
    setReplyingTo(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const scrollToRepliedMessage = (messageId: string) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashMessageId(messageId);
    window.setTimeout(() => {
      setFlashMessageId((prev) => (prev === messageId ? null : prev));
    }, 1200);
  };

  const getReplyPreviewText = (reply: MessageReplyPreview | null | undefined) => {
    if (!reply) return '';
    if (reply.deletedAt) return 'Сообщение удалено';
    const text = (reply.content || '').trim();
    if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;
    if (reply.soundTokId) return 'Вложение SoundTok';
    if (reply.imageUrl) return '📷 Фото';
    return 'Сообщение';
  };

  const cancelEditMessage = () => {
    setEditingId(null);
    setEditSaving(false);
    setNewMessage(composerStash);
    setComposerStash('');
    clearMentionSuggestions();
    requestAnimationFrame(() => {
      resizeComposer();
      inputRef.current?.focus();
    });
  };

  const saveEditMessage = async () => {
    if (!chatId || !editingId || editSaving) return;
    const target = messages.find((m) => m.id === editingId);
    const hasSharedTok = Boolean(target && 'soundTok' in target && target.soundTok);
    const content = newMessage.trim();
    if (!content && !hasSharedTok) return;

    setEditSaving(true);
    try {
      const updated = await chatsApi.editMessage(chatId, editingId, content);
      setMessages((prev) =>
        prev.map((m) => (m.id === editingId ? ({ ...m, ...updated } as Message) : m))
      );
      setEditingId(null);
      setEditSaving(false);
      setNewMessage(composerStash);
      setComposerStash('');
      clearMentionSuggestions();
      requestAnimationFrame(() => {
        resizeComposer();
        inputRef.current?.focus();
      });
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

  const editingMessage = useMemo(() => {
    if (!editingId) return null;
    return messages.find((m) => m.id === editingId) || null;
  }, [editingId, messages]);

  const editingPreview = useMemo(() => {
    if (!editingMessage) return '';
    const text = (editingMessage.content || '').trim();
    if (text) return text;
    if ('soundTok' in editingMessage && editingMessage.soundTok) return 'Вложение SoundTok';
    return 'Сообщение';
  }, [editingMessage]);

  const editingAllowsEmpty = Boolean(
    editingMessage &&
      (('soundTok' in editingMessage && editingMessage.soundTok) ||
        ('imageUrl' in editingMessage && editingMessage.imageUrl)),
  );

  const replyComposePreview = useMemo(() => {
    if (!replyingTo) return { author: '', text: '' };
    const preview = buildReplyPreview(replyingTo);
    const author =
      preview.sender.displayName?.trim() ||
      preview.sender.username ||
      'пользователь';
    return { author, text: getReplyPreviewText(preview) };
  }, [replyingTo, user]);

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

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll only on new messages / initial load — not on edit, reaction, or status updates
  useEffect(() => {
    const lastId = messages.length ? messages[messages.length - 1]?.id ?? null : null;
    const prev = prevMessagesMetaRef.current;
    const isInitial = prev.length === 0 && messages.length > 0;
    const lengthGrew = messages.length > prev.length;
    const lastChanged = lastId !== null && lastId !== prev.lastId;
    const isNewTail = lengthGrew || (lastChanged && messages.length >= prev.length);

    prevMessagesMetaRef.current = { length: messages.length, lastId };

    if (isInitial) {
      stickToBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom('auto'));
      return;
    }

    if (isNewTail && (stickToBottomRef.current || isNearBottom())) {
      stickToBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [messages]);

  useEffect(() => {
    if (!otherUserTyping) return;
    if (stickToBottomRef.current || isNearBottom()) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [otherUserTyping]);

  useEffect(() => {
    if (!chatId) return;

    prevMessagesMetaRef.current = { length: 0, lastId: null };
    stickToBottomRef.current = true;
    setReplyingTo(null);
    setFlashMessageId(null);

    const fetchChat = async () => {
      try {
        const messagesData = await chatsApi.getMessages(chatId, { limit: 50 });
        const resolvedChat = messagesData.chat;
        if (resolvedChat) {
          setChat(resolvedChat);
          
          // Process messages and track IDs
          const loadedMessages = messagesData.messages || [];
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

  const clearPendingImage = () => {
    setPendingImage(null);
    setPendingImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const acceptImageFile = (file: File | null | undefined) => {
    if (!file) return;
    const looksLikeImage =
      file.type.startsWith('image/') ||
      (!file.type && /\.(jpe?g|png|gif|webp)$/i.test(file.name || ''));
    if (!looksLikeImage) return;
    if (file.size > 8 * 1024 * 1024) {
      setSendError('Изображение слишком большое (макс. 8MB)');
      return;
    }
    const mime =
      file.type ||
      (/\.jpe?g$/i.test(file.name)
        ? 'image/jpeg'
        : /\.gif$/i.test(file.name)
          ? 'image/gif'
          : /\.webp$/i.test(file.name)
            ? 'image/webp'
            : 'image/png');
    const normalized =
      file.type === mime
        ? file
        : new File([file], file.name || `paste-${Date.now()}.png`, { type: mime });
    setPendingImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(normalized);
    });
    setPendingImage(normalized);
    setSendError(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await saveEditMessage();
      return;
    }
    if ((!newMessage.trim() && !pendingImage) || !chatId || !canSendMessages || sending || isMessagingBlocked) return;

    const content = newMessage.trim();
    const imageFile = pendingImage;
    const localPreview = pendingImagePreview;
    const clientMessageId = `${chatId}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const receiverId = isGroupChat ? undefined : otherUser?.id;
    const replyTarget = replyingTo;
    const replyToId = replyTarget?.id;
    const replyTo = replyTarget ? buildReplyPreview(replyTarget) : null;

    setNewMessage('');
    setReplyingTo(null);
    setPendingImage(null);
    setPendingImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setSending(true);
    setSendError(null);
    clearMentionSuggestions();

    const optimisticMessage: PendingMessage = {
      id: clientMessageId,
      content,
      senderId: user!.id,
      receiverId,
      chatId,
      imageUrl: localPreview,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      clientMessageId,
      replyToId: replyToId ?? null,
      replyTo,
    };

    processedClientIds.current.add(clientMessageId);
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const uploaded = await chatsApi.uploadImage(chatId, imageFile);
        imageUrl = uploaded.imageUrl;
      }

      let sent = false;

      if (isConnected) {
        const result = await sendChatMessage(content, receiverId, clientMessageId, {
          replyToId: replyToId || undefined,
          imageUrl,
        });
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
        const serverMessage = await chatsApi.sendMessage(
          chatId,
          content,
          receiverId,
          clientMessageId,
          undefined,
          replyToId || undefined,
          imageUrl
        );
        confirmSentMessage(clientMessageId, serverMessage);
      }
      if (localPreview) URL.revokeObjectURL(localPreview);
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== clientMessageId));
      processedClientIds.current.delete(clientMessageId);
      setNewMessage(content);
      if (replyTarget) setReplyingTo(replyTarget);
      if (imageFile) {
        setPendingImage(imageFile);
        setPendingImagePreview(localPreview);
      } else if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
      setSendError(
        error instanceof Error ? error.message : 'Не удалось отправить сообщение'
      );
    } finally {
      setSending(false);
      sendChatTyping(false);
    }
  };

  const handlePasteImage = (e: ReactClipboardEvent) => {
    const dt = e.clipboardData;
    if (!dt) return;

    const fileFromList = Array.from(dt.files || []).find(
      (f) => f.type.startsWith('image/') || (!f.type && /\.(jpe?g|png|gif|webp)$/i.test(f.name || ''))
    );
    if (fileFromList) {
      e.preventDefault();
      acceptImageFile(fileFromList);
      return;
    }

    for (const item of Array.from(dt.items || [])) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          acceptImageFile(file);
        }
        return;
      }
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

  const handleTypingInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setNewMessage(value);
    updateMentionSuggestions(value, cursor);
    requestAnimationFrame(resizeComposer);

    if (editingId) return;

    sendChatTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendChatTyping(false);
    }, 2000);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    if (e.key === 'Escape' && editingId) {
      e.preventDefault();
      cancelEditMessage();
      return;
    }

    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      cancelReplyMessage();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage(e);
    }
  };

  useEffect(() => {
    requestAnimationFrame(resizeComposer);
  }, [newMessage, editingId]);

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
              <button type="button" className="header-group-btn" onClick={() => setGroupPanelOpen(true)}>
                <div className="header-avatar">
                  {resolveMediaUrl(chat.avatar) ? (
                    <img src={resolveMediaUrl(chat.avatar)!} alt={chat.name || 'Группа'} />
                  ) : (
                    <Users size={18} />
                  )}
                </div>
                <div className="header-info">
                  <div className="header-username">{chat.name || 'Группа'}</div>
                  <div className="header-status">
                    {chat.memberCount || chat.users.length} участников
                  </div>
                </div>
              </button>
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
          <div
            className="chat-messages"
            ref={messagesContainerRef}
            onScroll={() => {
              stickToBottomRef.current = isNearBottom();
            }}
          >
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
                const messageImage =
                  !isDeleted && 'imageUrl' in message && message.imageUrl
                    ? (message.imageUrl.startsWith('blob:')
                        ? message.imageUrl
                        : resolveMediaUrl(message.imageUrl))
                    : null;
                const reactionSummary = getReactionSummary(message);
                const pickerOpen = reactionPickerId === message.id;

                const isEditing = editingId === message.id;

                return (
                  <div
                    key={message.id}
                    data-message-id={message.id}
                    className={`message-row ${isOwn ? 'own' : 'other'} ${isPending ? 'pending' : ''} ${pickerOpen ? 'picker-open' : ''} ${flashMessageId === message.id ? 'reply-flash' : ''}`}
                  >
                    <div
                      className={`message-bubble ${isOwn ? 'own' : 'other'} ${isDeleted ? 'deleted' : ''} ${isEditing ? 'editing' : ''}`}
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
                      {'replyTo' in message && message.replyTo && (
                        <button
                          type="button"
                          className="message-reply-quote"
                          onClick={() => scrollToRepliedMessage(message.replyTo!.id)}
                        >
                          <div className="message-reply-author">
                            {message.replyTo.sender.displayName?.trim() ||
                              message.replyTo.sender.username}
                          </div>
                          <div className="message-reply-text">
                            {getReplyPreviewText(message.replyTo)}
                          </div>
                        </button>
                      )}
                      {isDeleted ? (
                        <p className="message-deleted-text">Сообщение удалено</p>
                      ) : (
                        <>
                          {messageImage && (
                            <a href={messageImage} target="_blank" rel="noreferrer">
                              <img
                                className="message-image"
                                src={messageImage}
                                alt="Вложение"
                                loading="lazy"
                              />
                            </a>
                          )}
                          {sharedTok && (
                            <SharedSoundTokCard
                              sharedTok={sharedTok}
                              onOpenAuthor={(username) => openMentionProfile(username)}
                            />
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
                          {!message.content && !sharedTok && !messageImage && (
                            <p className="message-text"> </p>
                          )}
                        </>
                      )}
                      {reactionSummary.length > 0 && !isDeleted && (
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
                          <span className="message-edited-label">изменено</span>
                        )}
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                        {!isDeleted && <span className="message-status">{renderStatus(message)}</span>}
                      </div>
                    </div>
                    {!isPending && !isDeleted && (
                      <div className="message-actions">
                        <button
                          type="button"
                          className="message-action-btn"
                          title="Ответить"
                          onClick={() => startReplyMessage(message)}
                        >
                          <Reply />
                        </button>
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
          <div className="chat-input-area" onPaste={handlePasteImage}>
            {editingId && editingMessage && (
              <div
                className="edit-compose-bar"
                role="status"
                onClick={() => inputRef.current?.focus()}
              >
                <div className="edit-compose-icon" aria-hidden>
                  <Pencil />
                </div>
                <div className="edit-compose-body">
                  <div className="edit-compose-title">Редактирование</div>
                  <div className="edit-compose-preview">{editingPreview}</div>
                </div>
                <button
                  type="button"
                  className="edit-compose-close"
                  aria-label="Отменить редактирование"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditMessage();
                  }}
                  disabled={editSaving}
                >
                  <X />
                </button>
              </div>
            )}
            {!editingId && replyingTo && (
              <div
                className="reply-compose-bar"
                role="status"
                onClick={() => inputRef.current?.focus()}
              >
                <div className="reply-compose-icon" aria-hidden>
                  <Reply />
                </div>
                <div className="reply-compose-body">
                  <div className="reply-compose-title">
                    Ответ {replyComposePreview.author}
                  </div>
                  <div className="reply-compose-preview">{replyComposePreview.text}</div>
                </div>
                <button
                  type="button"
                  className="reply-compose-close"
                  aria-label="Отменить ответ"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelReplyMessage();
                  }}
                >
                  <X />
                </button>
              </div>
            )}
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
            {pendingImagePreview && (
              <div className="image-preview-bar">
                <img src={pendingImagePreview} alt="Превью" />
                <div className="image-preview-meta">Фото готово к отправке · Ctrl+V тоже работает</div>
                <button type="button" className="image-preview-clear" onClick={clearPendingImage} aria-label="Убрать фото">
                  <X size={16} />
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="input-form">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                onChange={(e) => acceptImageFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="attach-btn"
                disabled={sending || isMessagingBlocked || !canSendMessages || !!editingId}
                onClick={() => imageInputRef.current?.click()}
                aria-label="Прикрепить фото"
                title="Прикрепить фото"
              >
                <ImagePlus size={18} />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={newMessage}
                onChange={handleTypingInput}
                onKeyDown={handleInputKeyDown}
                onPaste={handlePasteImage}
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
                placeholder={
                  isMessagingBlocked && !editingId
                    ? 'Сообщения недоступны'
                    : editingId
                      ? 'Измените сообщение…'
                      : replyingTo
                        ? `Ответ ${replyComposePreview.author}…`
                        : 'Сообщение, @user или Ctrl+V фото…'
                }
                className={`message-input${editingId ? ' editing' : ''}`}
                disabled={
                  editingId
                    ? editSaving
                    : sending || isMessagingBlocked || !canSendMessages
                }
                maxLength={4000}
                aria-label={editingId ? 'Редактирование сообщения' : 'Сообщение'}
              />
              <button
                type="submit"
                disabled={
                  editingId
                    ? editSaving || (!newMessage.trim() && !editingAllowsEmpty)
                    : (!newMessage.trim() && !pendingImage) ||
                      sending ||
                      isMessagingBlocked ||
                      !canSendMessages
                }
                className="send-btn"
                title={
                  editingId
                    ? 'Сохранить (Enter)'
                    : 'Отправить (Enter, Shift+Enter — новая строка)'
                }
                aria-label={editingId ? 'Сохранить изменения' : 'Отправить сообщение'}
              >
                {editSaving || sending ? (
                  <Loader2 size={18} className="loader" />
                ) : editingId ? (
                  <Check size={18} />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          </div>
        </>
      )}

      {groupPanelOpen && chat && user && (
        <GroupInfoPanel
          chat={chat}
          currentUserId={user.id}
          onClose={() => setGroupPanelOpen(false)}
          onChatUpdate={(updated) => setChat((prev) => (prev ? { ...prev, ...updated } : updated))}
          onLeft={() => navigate('/chats')}
        />
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
            onClick={() => {
              startReplyMessage(contextMessage);
              closeContextMenu();
            }}
          >
            <Reply />
            Ответить
          </button>
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