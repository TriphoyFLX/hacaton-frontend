import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Loader2, Send, Users, X } from 'lucide-react';
import { chatsApi, Chat } from '../api/chats';
import { SoundTok } from '../api/soundtok';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../lib/mediaUrl';

interface ShareSoundTokModalProps {
  open: boolean;
  soundTok: SoundTok | null;
  onClose: () => void;
}

export function getSoundTokShareUrl(soundTokId: string): string {
  const base = window.location.origin;
  return `${base}/soundtok?v=${encodeURIComponent(soundTokId)}`;
}

function getChatTitle(chat: Chat, currentUserId?: string): string {
  if (chat.type === 'GROUP') {
    return chat.name || 'Группа';
  }
  if (chat.otherUser) {
    return chat.otherUser.displayName || `@${chat.otherUser.username}`;
  }
  const other = chat.users.find((cu) => cu.user.id !== currentUserId)?.user;
  return other ? other.displayName || `@${other.username}` : 'Чат';
}

function getChatAvatar(chat: Chat, currentUserId?: string): {
  letter: string;
  url: string | null;
  isGroup: boolean;
} {
  if (chat.type === 'GROUP') {
    return {
      letter: (chat.name || 'G')[0].toUpperCase(),
      url: null,
      isGroup: true,
    };
  }
  const other = chat.otherUser
    ?? chat.users.find((cu) => cu.user.id !== currentUserId)?.user
    ?? null;
  return {
    letter: (other?.username?.[0] || '?').toUpperCase(),
    url: resolveMediaUrl(other?.avatar),
    isGroup: false,
  };
}

function getShareCaption(soundTok: SoundTok): string {
  return soundTok.description?.trim() || '';
}

const css = `
.st-share-overlay {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  animation: st-share-fade 0.18s ease;
}
@keyframes st-share-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.st-share-sheet {
  width: 100%;
  max-width: 440px;
  max-height: min(80vh, 620px);
  display: flex;
  flex-direction: column;
  background: #111111;
  border: 1px solid #2e2e2e;
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  animation: st-share-slide 0.22s ease;
  overflow: hidden;
}
@keyframes st-share-slide {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.st-share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 12px;
  border-bottom: 1px solid #232323;
}
.st-share-title {
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #f0ede8;
  letter-spacing: -0.02em;
}
.st-share-close {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid #2e2e2e;
  background: transparent;
  color: #8a8a8a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.st-share-close:hover {
  color: #f0ede8;
  border-color: #3d3d3d;
}
.st-share-preview {
  padding: 14px 18px;
  border-bottom: 1px solid #232323;
}
.st-share-preview-text {
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: #8a8a8a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.st-share-preview-author {
  margin-top: 6px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: #5a5a5a;
}
.st-share-copy {
  margin: 14px 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: calc(100% - 36px);
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #2e2e2e;
  background: #181818;
  color: #f0ede8;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.st-share-copy:hover {
  border-color: #3d3d3d;
  background: #1c1c1c;
}
.st-share-copy.done {
  border-color: rgba(74, 140, 74, 0.45);
  color: #8fd48f;
}
.st-share-copy-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.st-share-section {
  padding: 14px 18px 8px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a5a5a;
}
.st-share-search {
  margin: 0 18px 10px;
  width: calc(100% - 36px);
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #2e2e2e;
  background: #181818;
  color: #f0ede8;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  outline: none;
}
.st-share-search:focus {
  border-color: #3d3d3d;
}
.st-share-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 16px;
  min-height: 180px;
}
.st-share-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #f0ede8;
  text-align: left;
  cursor: pointer;
  font-family: 'Syne', sans-serif;
}
.st-share-item:hover:not(:disabled) {
  background: #181818;
}
.st-share-item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.st-share-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid #2e2e2e;
  background: #181818;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  color: #c5c0b8;
  overflow: hidden;
  flex-shrink: 0;
}
.st-share-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.st-share-meta {
  flex: 1;
  min-width: 0;
}
.st-share-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-share-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #6b6b6b;
}
.st-share-send-icon {
  color: #6b6b6b;
  flex-shrink: 0;
}
.st-share-item.sent .st-share-send-icon {
  color: #8fd48f;
}
.st-share-empty,
.st-share-loading,
.st-share-error {
  padding: 28px 16px;
  text-align: center;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  color: #6b6b6b;
}
.st-share-error {
  color: #e88a82;
}
.st-share-toast {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(24, 24, 24, 0.96);
  border: 1px solid #2e2e2e;
  color: #f0ede8;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  white-space: nowrap;
  z-index: 5;
}
`;

export default function ShareSoundTokModal({
  open,
  soundTok,
  onClose,
}: ShareSoundTokModalProps) {
  const user = useAuthStore((s) => s.user);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = soundTok ? getSoundTokShareUrl(soundTok.id) : '';

  useEffect(() => {
    if (!open) return;

    setQuery('');
    setCopied(false);
    setError(null);
    setSentIds(new Set());
    setToast(null);
    setLoading(true);

    chatsApi
      .getChats({ limit: 60, offset: 0 })
      .then((data) => setChats(data.items || []))
      .catch(() => setError('Не удалось загрузить чаты'))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => {
      const title = getChatTitle(chat, user?.id).toLowerCase();
      return title.includes(q);
    });
  }, [chats, query, user?.id]);

  if (!open || !soundTok) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToast('Ссылка скопирована');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Не удалось скопировать ссылку');
    }
  };

  const handleSend = async (chat: Chat) => {
    if (sendingId || sentIds.has(chat.id)) return;

    setSendingId(chat.id);
    try {
      const receiverId =
        chat.type === 'GROUP'
          ? undefined
          : chat.otherUser?.id
            ?? chat.users.find((cu) => cu.user.id !== user?.id)?.user.id;

      const clientMessageId = `share_${chat.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await chatsApi.sendMessage(
        chat.id,
        getShareCaption(soundTok),
        receiverId,
        clientMessageId,
        soundTok.id
      );

      setSentIds((prev) => new Set(prev).add(chat.id));
      setToast(`Отправлено: ${getChatTitle(chat, user?.id)}`);
    } catch {
      setToast('Не удалось отправить');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="st-share-overlay" onClick={onClose}>
      <style>{css}</style>
      <div className="st-share-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="st-share-header">
          <div className="st-share-title">Поделиться</div>
          <button type="button" className="st-share-close" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div className="st-share-preview">
          <div className="st-share-preview-text">
            {soundTok.description || 'Видео без описания'}
          </div>
          <div className="st-share-preview-author">
            @{soundTok.author?.username || 'user'}
          </div>
        </div>

        <button
          type="button"
          className={`st-share-copy ${copied ? 'done' : ''}`}
          onClick={handleCopy}
        >
          <span className="st-share-copy-left">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано' : 'Копировать ссылку'}
          </span>
          <Link2 size={15} />
        </button>

        <div className="st-share-section">Отправить видео в чат</div>
        <input
          className="st-share-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по чатам..."
        />

        <div className="st-share-list">
          {loading ? (
            <div className="st-share-loading">
              <Loader2 size={18} style={{ animation: 'st-share-fade 0.8s linear infinite' }} />
              {' '}Загрузка чатов...
            </div>
          ) : error ? (
            <div className="st-share-error">{error}</div>
          ) : filteredChats.length === 0 ? (
            <div className="st-share-empty">
              {chats.length === 0
                ? 'Пока нет чатов — начните диалог с кем-нибудь'
                : 'Ничего не найдено'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const avatar = getChatAvatar(chat, user?.id);
              const title = getChatTitle(chat, user?.id);
              const sent = sentIds.has(chat.id);
              const busy = sendingId === chat.id;

              return (
                <button
                  key={chat.id}
                  type="button"
                  className={`st-share-item ${sent ? 'sent' : ''}`}
                  onClick={() => handleSend(chat)}
                  disabled={busy || sent}
                >
                  <div className="st-share-avatar">
                    {avatar.isGroup ? (
                      <Users size={16} />
                    ) : avatar.url ? (
                      <img src={avatar.url} alt={title} />
                    ) : (
                      avatar.letter
                    )}
                  </div>
                  <div className="st-share-meta">
                    <div className="st-share-name">{title}</div>
                    <div className="st-share-sub">
                      {sent
                        ? 'Отправлено'
                        : chat.type === 'GROUP'
                          ? `${chat.memberCount || chat.users.length} участников`
                          : 'Личный чат'}
                    </div>
                  </div>
                  <span className="st-share-send-icon">
                    {busy ? (
                      <Loader2 size={16} className="loader" />
                    ) : sent ? (
                      <Check size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {toast && <div className="st-share-toast">{toast}</div>}
      </div>
    </div>
  );
}
