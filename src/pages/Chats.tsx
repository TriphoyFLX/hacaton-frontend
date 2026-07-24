import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi, Chat, resolveChatPinState } from '../api/chats';
import { followsApi } from '../api/follows';
import { useAuthStore } from '../store/authStore';
import { useChatUnreadStore } from '../store/chatUnreadStore';
import { useSocket } from '../hooks/useSocket';
import { Search, MessageCircle, Pin, PinOff, Users, Plus, X } from 'lucide-react';
import { resolveMediaUrl } from '../lib/mediaUrl';

type GroupCandidate = {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  fromChat?: boolean;
  fromFollow?: boolean;
};

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.chats-root {
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
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text-primary);
}

.chats-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 28px 80px;
}

/* ── AMBIENT ── */
.chats-ambient {
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
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(232, 228, 220, 0.12) 0%, transparent 70%);
  top: -150px;
  right: -80px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.1) 0%, transparent 70%);
  bottom: -100px;
  left: -60px;
  animation-delay: -10s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-25px, -35px) scale(1.06); }
  66% { transform: translate(15px, 25px) scale(0.94); }
}
.chats-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.chats-grid-bg {
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
.chats-topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-left {
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
.chat-count {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.create-group-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-mid);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.create-group-btn:hover {
  border-color: var(--border-hover);
  background: var(--bg-elevated);
}
.create-group-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── SEARCH ── */
.search-wrap {
  position: relative;
  z-index: 10;
  margin-bottom: 28px;
}
.search-input-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.search-icon svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
}
.search-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.02em;
  padding: 12px 16px 12px 42px;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus {
  border-color: var(--border-hover);
}
.search-input::placeholder {
  color: var(--text-muted);
}

/* ── CHAT LIST ── */
.chat-list {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── CHAT ROW ── */
.chat-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.chat-row:hover {
  background: var(--bg-surface);
  border-color: var(--border);
}
.chat-row.pinned {
  background: rgba(232, 228, 220, 0.03);
  border-color: rgba(232, 228, 220, 0.08);
}
.chat-row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0.45;
  transition: opacity 0.15s;
}
.chat-row:hover .chat-row-actions,
.chat-row.pinned .chat-row-actions {
  opacity: 1;
}
.pin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.pin-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--border-mid);
  color: var(--accent);
}
.pin-btn.active {
  color: var(--accent);
  border-color: rgba(232, 228, 220, 0.2);
  opacity: 1;
}
.pin-error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2500;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(192, 57, 43, 0.92);
  color: #fff;
  font-size: 13px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}
.chat-avatar.group {
  font-size: 16px;
}
.chat-member-count {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.pin-indicator {
  color: var(--accent-dim);
  flex-shrink: 0;
}
.chat-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 1px solid var(--border-mid);
  border-radius: 12px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.01em;
  overflow: hidden;
}
.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.chat-info {
  flex: 1;
  min-width: 0;
}
.chat-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}
.chat-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.chat-unread-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-preview.unread {
  color: var(--text-primary);
  font-weight: 600;
}
.chat-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-time {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  flex-shrink: 0;
  margin-left: 12px;
}
.chat-preview {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
.chat-empty-preview {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
}

/* ── EMPTY STATE ── */
.empty-state {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 80px 24px;
  border: 1px dashed var(--border-mid);
  border-radius: 14px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.35;
  color: var(--text-muted);
}
.empty-title {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── LOADING ── */
.loading-state {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  gap: 16px;
}
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-mid);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.chats-load-more {
  display: flex;
  justify-content: center;
  padding: 10px 0 18px;
}
.chats-load-more button {
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font: 600 12px 'Syne', sans-serif;
  padding: 10px 16px;
  cursor: pointer;
}
.chats-load-more button:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--border-hover);
}
.chats-load-more button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── GROUP MODAL ── */
.group-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
}
.group-modal {
  width: 100%;
  max-width: 440px;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}
.group-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.group-modal-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.group-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-mid);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.group-modal-close:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.group-field {
  margin-bottom: 16px;
}
.group-field-label {
  display: block;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.group-field-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  padding: 12px 14px;
  outline: none;
}
.group-field-input:focus {
  border-color: var(--border-hover);
}
.group-search-results {
  margin-top: 8px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
}
.group-search-item {
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
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}
.group-search-item:last-child {
  border-bottom: none;
}
.group-search-item:hover {
  background: var(--bg-surface);
}
.group-search-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.group-suggest-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 8px;
}
.group-search-meta {
  margin-left: auto;
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.group-search-tag {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  border: 1px solid var(--border-mid);
  border-radius: 4px;
  padding: 2px 5px;
  white-space: nowrap;
}
.group-search-empty {
  padding: 14px 4px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}
.group-search-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-mid);
  background: var(--bg-surface);
  display: grid;
  place-items: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}
.group-search-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.group-members {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 36px;
}
.group-member-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  font-size: 13px;
}
.group-member-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.group-member-remove:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}
.group-modal-error {
  font-size: 13px;
  color: #e88a82;
  margin-bottom: 12px;
}
.group-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}
.group-btn-secondary,
.group-btn-primary {
  padding: 10px 16px;
  border-radius: 8px;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.group-btn-secondary {
  border: 1px solid var(--border-mid);
  background: transparent;
  color: var(--text-secondary);
}
.group-btn-secondary:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.group-btn-primary {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--bg);
}
.group-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.group-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
`;

// ── SVG Icon ──
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function Chats() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refreshUnread = useChatUnreadStore((s) => s.refresh);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const CHAT_PAGE_SIZE = 40;
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<Array<{
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  }>>([]);
  const [groupCreating, setGroupCreating] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<GroupCandidate[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchChats = async () => {
    try {
      const data = await chatsApi.getChats({ limit: CHAT_PAGE_SIZE, offset: 0 });
      setChats(data.items);
      setHasMore(data.hasMore);
      refreshUnread();
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreChats = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await chatsApi.getChats({
        limit: CHAT_PAGE_SIZE,
        offset: chats.length,
      });
      setChats((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const next = data.items.filter((c) => !seen.has(c.id));
        return [...prev, ...next];
      });
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more chats:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useSocket(token, {
    onUserUpdated: (data) => {
      setChats((prev) =>
        prev.map((chat) => {
          const patchUser = (u?: {
            id: string;
            username: string;
            displayName?: string | null;
            avatar?: string | null;
          } | null) => {
            if (!u || u.id !== data.id) return u;
            return {
              ...u,
              username: data.username,
              displayName: data.displayName ?? u.displayName,
              avatar: data.avatar ?? u.avatar,
            };
          };

          return {
            ...chat,
            otherUser: patchUser(chat.otherUser) ?? null,
            users: chat.users.map((cu) => ({
              ...cu,
              user: patchUser(cu.user)!,
            })),
            messages: chat.messages?.map((m) =>
              m.sender?.id === data.id
                ? {
                    ...m,
                    sender: {
                      ...m.sender,
                      username: data.username,
                      displayName: data.displayName ?? m.sender.displayName,
                      avatar: data.avatar ?? m.sender.avatar,
                    },
                  }
                : m,
            ),
          };
        }),
      );
    },
  });

  useEffect(() => {
    if (!showGroupModal) return;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!memberSearch.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const users = await chatsApi.searchUsers(memberSearch.trim());
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [memberSearch, showGroupModal]);

  useEffect(() => {
    if (!showGroupModal || !user?.id) return;

    let cancelled = false;
    setSuggestionsLoading(true);
    void followsApi
      .getFollowing(user.id)
      .then((list) => {
        if (cancelled) return;
        setFollowingUsers(
          list.map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatar,
            fromFollow: true,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setFollowingUsers([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showGroupModal, user?.id]);

  const suggestedMembers = useMemo(() => {
    const map = new Map<string, GroupCandidate>();

    for (const chat of chats) {
      if (chat.type === 'GROUP') continue;
      const other = chat.otherUser ?? chat.users.find((cu) => cu.user.id !== user?.id)?.user;
      if (!other || other.id === user?.id) continue;
      map.set(other.id, {
        id: other.id,
        username: other.username,
        displayName: other.displayName,
        avatar: other.avatar,
        fromChat: true,
        fromFollow: false,
      });
    }

    for (const person of followingUsers) {
      const existing = map.get(person.id);
      if (existing) {
        existing.fromFollow = true;
        if (!existing.avatar && person.avatar) existing.avatar = person.avatar;
        if (!existing.displayName && person.displayName) existing.displayName = person.displayName;
      } else {
        map.set(person.id, { ...person, fromFollow: true });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const score = (u: GroupCandidate) => (u.fromChat ? 2 : 0) + (u.fromFollow ? 1 : 0);
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return a.username.localeCompare(b.username, 'ru');
    });
  }, [chats, followingUsers, user?.id]);

  const visibleCandidates = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (query) {
      return searchResults
        .filter((u) => u.id !== user?.id)
        .map((u) => {
          const known = suggestedMembers.find((s) => s.id === u.id);
          return {
            ...u,
            fromChat: known?.fromChat,
            fromFollow: known?.fromFollow,
          } as GroupCandidate;
        });
    }
    return suggestedMembers;
  }, [memberSearch, searchResults, suggestedMembers, user?.id]);

  useEffect(() => {
    if (!pinError) return;
    const timer = setTimeout(() => setPinError(null), 4000);
    return () => clearTimeout(timer);
  }, [pinError]);

  const isGroupChat = (chat: Chat) => chat.type === 'GROUP';

  const getOtherUser = (chat: Chat) => {
    if (chat.otherUser) return chat.otherUser;
    const currentUserId = user?.id;
    return chat.users.find(cu => cu.user.id !== currentUserId)?.user;
  };

  const getChatTitle = (chat: Chat) => {
    if (isGroupChat(chat)) return chat.name || 'Группа';
    const otherUser = getOtherUser(chat);
    return otherUser ? `@${otherUser.username}` : 'Чат';
  };

  const getChatAvatarContent = (chat: Chat) => {
    if (isGroupChat(chat)) {
      const groupAvatar = resolveMediaUrl(chat.avatar);
      if (groupAvatar) {
        return <img src={groupAvatar} alt={chat.name || 'Группа'} />;
      }
      return <Users size={20} />;
    }
    const otherUser = getOtherUser(chat);
    const avatarUrl = resolveMediaUrl(otherUser?.avatar);
    if (avatarUrl) {
      return <img src={avatarUrl} alt={otherUser?.username || 'avatar'} />;
    }
    return otherUser?.username?.[0]?.toUpperCase() || '?';
  };

  const getLastMessage = (chat: Chat) => {
    if (!chat.messages || chat.messages.length === 0) return null;
    // List API returns latest message as the only/first item
    return chat.messages[0];
  };

  const getPreviewText = (chat: Chat, lastMessage: Chat['messages'][0] | null) => {
    if (!lastMessage) return null;
    if (lastMessage.soundTok) {
      const label = lastMessage.soundTok.description?.trim() || 'Видео';
      if (isGroupChat(chat) && lastMessage.senderId !== user?.id) {
        const sender = lastMessage.sender?.username || 'участник';
        return `${sender}: 🎬 ${label}`;
      }
      return `🎬 ${label}`;
    }
    if (lastMessage.imageUrl) {
      const label = lastMessage.content?.trim() ? lastMessage.content : 'Фото';
      if (isGroupChat(chat) && lastMessage.senderId !== user?.id) {
        const sender = lastMessage.sender?.username || 'участник';
        return `${sender}: 📷 ${label}`;
      }
      return `📷 ${label}`;
    }
    if (isGroupChat(chat) && lastMessage.senderId !== user?.id) {
      const sender = lastMessage.sender?.username || 'участник';
      return `${sender}: ${lastMessage.content}`;
    }
    return lastMessage.content;
  };

  const handleTogglePin = async (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    if (pinningId === chat.id) return;

    const { isPinned } = resolveChatPinState(chat, user?.id);
    const nextPinned = !isPinned;

    setPinningId(chat.id);
    setPinError(null);
    try {
      await chatsApi.pinChat(chat.id, nextPinned);
      await fetchChats();
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setPinError(message || 'Не удалось закрепить чат');
    } finally {
      setPinningId(null);
    }
  };

  const resetGroupModal = () => {
    setShowGroupModal(false);
    setGroupName('');
    setMemberSearch('');
    setSearchResults([]);
    setSelectedMembers([]);
    setGroupError(null);
    setFollowingUsers([]);
  };

  const addMember = (member: GroupCandidate) => {
    if (member.id === user?.id) return;
    if (selectedMembers.some((m) => m.id === member.id)) return;
    setSelectedMembers((prev) => [
      ...prev,
      {
        id: member.id,
        username: member.username,
        displayName: member.displayName,
        avatar: member.avatar,
      },
    ]);
    setMemberSearch('');
    setSearchResults([]);
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleCreateGroup = async () => {
    if (groupCreating) return;

    const trimmedName = groupName.trim();
    if (trimmedName.length < 2) {
      setGroupError('Название группы должно быть минимум 2 символа');
      return;
    }
    if (selectedMembers.length < 1) {
      setGroupError('Добавьте хотя бы одного участника');
      return;
    }

    setGroupCreating(true);
    setGroupError(null);
    try {
      const newChat = await chatsApi.createGroup(trimmedName, selectedMembers.map(m => m.id));
      resetGroupModal();
      await fetchChats();
      navigate(`/chats/${newChat.id}`);
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setGroupError(message || 'Не удалось создать группу');
    } finally {
      setGroupCreating(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 168) {
      const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (isGroupChat(chat)) {
      return (chat.name || '').toLowerCase().includes(query);
    }
    const otherUser = getOtherUser(chat);
    if (!otherUser) return false;
    return (
      otherUser.username.toLowerCase().includes(query)
      || (otherUser.displayName || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="chats-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="chats-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="chats-noise" />
      <div className="chats-grid-bg" />

      {pinError && <div className="pin-error-toast">{pinError}</div>}

      <div className="chats-wrapper">
        {/* Top Bar */}
        <div className="chats-topbar">
          <div className="topbar-left">
            <div className="brand-mark">
              <IconChat />
            </div>
            <span className="brand-text">Чаты</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="create-group-btn"
              onClick={() => setShowGroupModal(true)}
            >
              <Plus size={15} />
              Создать группу
            </button>
            {!loading && chats.length > 0 && (
              <span className="chat-count">{chats.length} {chats.length === 1 ? 'чат' : chats.length < 5 ? 'чата' : 'чатов'}</span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <div className="search-input-wrap">
            <span className="search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              placeholder="Поиск чатов..."
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span className="loading-text">Загрузка...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <div className="empty-icon">
              <MessageCircle size={40} />
            </div>
            <div className="empty-title">
              {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
            </div>
            <div className="empty-hint">
              {searchQuery 
                ? 'Попробуйте изменить поисковый запрос'
                : 'Найдите пользователей и начните общение'
              }
            </div>
          </div>
        ) : (
          /* Chat List */
          <div className="chat-list">
            {filteredChats.map((chat) => {
              const lastMessage = getLastMessage(chat);
              const previewText = getPreviewText(chat, lastMessage);
              const isGroup = isGroupChat(chat);
              const pinState = resolveChatPinState(chat, user?.id);

              if (!isGroup && !getOtherUser(chat)) return null;

              return (
                <div
                  key={chat.id}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                  className={`chat-row ${pinState.isPinned ? 'pinned' : ''}`}
                >
                  <div className={`chat-avatar ${isGroup ? 'group' : ''}`}>
                    {getChatAvatarContent(chat)}
                  </div>
                  
                  <div className="chat-info">
                    <div className="chat-header">
                      <div className="chat-name-row">
                        {pinState.isPinned && <Pin size={12} className="pin-indicator" />}
                        <span className="chat-name">{getChatTitle(chat)}</span>
                        {isGroup && (
                          <span className="chat-member-count">
                            {chat.memberCount || chat.users.length} уч.
                          </span>
                        )}
                        {(chat.unreadCount || 0) > 0 && (
                          <span className="chat-unread-badge">
                            {chat.unreadCount! > 99 ? '99+' : chat.unreadCount}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <span className="chat-time">
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    {previewText ? (
                      <p className={`chat-preview ${(chat.unreadCount || 0) > 0 ? 'unread' : ''}`}>
                        {previewText}
                      </p>
                    ) : (
                      <p className="chat-empty-preview">Нет сообщений</p>
                    )}
                  </div>

                  <div className="chat-row-actions">
                    <button
                      type="button"
                      className={`pin-btn ${pinState.isPinned ? 'active' : ''}`}
                      onClick={(e) => handleTogglePin(e, chat)}
                      disabled={pinningId === chat.id}
                      title={pinState.isPinned ? 'Открепить' : 'Закрепить'}
                    >
                      {pinningId === chat.id ? (
                        <span style={{ width: 14, height: 14, border: '2px solid var(--border-mid)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      ) : pinState.isPinned ? (
                        <PinOff size={15} />
                      ) : (
                        <Pin size={15} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {hasMore && !searchQuery.trim() && (
              <div className="chats-load-more">
                <button
                  type="button"
                  onClick={() => void loadMoreChats()}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Загрузка…' : 'Показать ещё чаты'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showGroupModal && (
        <div className="group-modal-overlay" onClick={resetGroupModal}>
          <div className="group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h2 className="group-modal-title">Новая группа</h2>
              <button type="button" className="group-modal-close" onClick={resetGroupModal}>
                <X size={16} />
              </button>
            </div>

            <div className="group-field">
              <label className="group-field-label">Название</label>
              <input
                type="text"
                className="group-field-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Например: Команда проекта"
                maxLength={80}
              />
            </div>

            <div className="group-field">
              <label className="group-field-label">Участники</label>
              <div className="group-members">
                {selectedMembers.map((member) => (
                  <span key={member.id} className="group-member-chip">
                    @{member.username}
                    <button
                      type="button"
                      className="group-member-remove"
                      onClick={() => removeMember(member.id)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="group-field">
              <label className="group-field-label">Добавить участника</label>
              <input
                type="text"
                className="group-field-input"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Поиск или выберите из списка..."
              />
              {!memberSearch.trim() && (
                <div className="group-suggest-label" style={{ marginTop: 10 }}>
                  Ваши чаты и подписки
                </div>
              )}
              {suggestionsLoading && !memberSearch.trim() ? (
                <div className="group-search-empty">Загрузка контактов...</div>
              ) : visibleCandidates.length > 0 ? (
                <div className="group-search-results" style={memberSearch.trim() ? { marginTop: 10 } : undefined}>
                  {visibleCandidates.map((result) => {
                    const alreadyAdded = selectedMembers.some((m) => m.id === result.id);
                    const isSelf = result.id === user?.id;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        className="group-search-item"
                        disabled={alreadyAdded || isSelf}
                        onClick={() => addMember(result)}
                      >
                        <span className="group-search-avatar">
                          {result.avatar ? (
                            <img src={resolveMediaUrl(result.avatar) ?? ''} alt={result.username} />
                          ) : (
                            result.username[0]?.toUpperCase() || '?'
                          )}
                        </span>
                        <span>@{result.username}</span>
                        {result.displayName && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            {result.displayName}
                          </span>
                        )}
                        <span className="group-search-meta">
                          {result.fromChat && <span className="group-search-tag">чат</span>}
                          {result.fromFollow && <span className="group-search-tag">подписка</span>}
                          {alreadyAdded && <span className="group-search-tag">добавлен</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : memberSearch.trim() ? (
                <div className="group-search-empty">
                  Никого не нашли. Попробуйте другой username.
                </div>
              ) : (
                <div className="group-search-empty">
                  Пока нет чатов и подписок. Найдите человека по username.
                </div>
              )}
            </div>

            {groupError && <div className="group-modal-error">{groupError}</div>}

            <div className="group-modal-actions">
              <button type="button" className="group-btn-secondary" onClick={resetGroupModal}>
                Отмена
              </button>
              <button
                type="button"
                className="group-btn-primary"
                onClick={handleCreateGroup}
                disabled={groupCreating || groupName.trim().length < 2 || selectedMembers.length < 1}
              >
                {groupCreating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}