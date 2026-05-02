import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi, Chat } from '../api/chats';
import { Search, MessageCircle } from 'lucide-react';

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
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 80px;
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
`;

// ── SVG Icon ──
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function Chats() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await chatsApi.getChats();
        setChats(data);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const getOtherUser = (chat: Chat) => {
    const currentUserId = localStorage.getItem('userId');
    return chat.users.find(cu => cu.user.id !== currentUserId)?.user;
  };

  const getLastMessage = (chat: Chat) => {
    if (!chat.messages || chat.messages.length === 0) return null;
    return chat.messages[chat.messages.length - 1];
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
    const otherUser = getOtherUser(chat);
    if (!otherUser) return false;
    return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
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

      <div className="chats-wrapper">
        {/* Top Bar */}
        <div className="chats-topbar">
          <div className="topbar-left">
            <div className="brand-mark">
              <IconChat />
            </div>
            <span className="brand-text">Чаты</span>
          </div>
          {!loading && chats.length > 0 && (
            <span className="chat-count">{chats.length} {chats.length === 1 ? 'чат' : chats.length < 5 ? 'чата' : 'чатов'}</span>
          )}
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
              const otherUser = getOtherUser(chat);
              const lastMessage = getLastMessage(chat);
              
              if (!otherUser) return null;

              return (
                <div
                  key={chat.id}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                  className="chat-row"
                >
                  <div className="chat-avatar">
                    {otherUser.username[0].toUpperCase()}
                  </div>
                  
                  <div className="chat-info">
                    <div className="chat-header">
                      <span className="chat-name">@{otherUser.username}</span>
                      {lastMessage && (
                        <span className="chat-time">
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    {lastMessage ? (
                      <p className="chat-preview">{lastMessage.content}</p>
                    ) : (
                      <p className="chat-empty-preview">Нет сообщений</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}