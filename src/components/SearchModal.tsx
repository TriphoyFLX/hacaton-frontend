import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi, SearchResult } from '../api/search';
import { chatsApi } from '../api/chats';
import { Search, X, Users, FileText, Video, MessageCircle } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  z-index: 50;
}

.search-modal {
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  background: #111111;
  border: 1px solid #232323;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* ── SEARCH INPUT ── */
.search-input-area {
  padding: 16px 20px;
  border-bottom: 1px solid #232323;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.search-icon-wrap {
  color: #3a3a3a;
  flex-shrink: 0;
}
.search-icon-wrap svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}
.search-field {
  flex: 1;
  background: transparent;
  border: none;
  color: #f0ede8;
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  outline: none;
}
.search-field::placeholder {
  color: #3a3a3a;
}
.search-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #232323;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  color: #6b6b6b;
  transition: all 0.15s;
  flex-shrink: 0;
}
.search-close:hover {
  border-color: #3d3d3d;
  background: #181818;
  color: #f0ede8;
}
.search-close svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.5;
}

/* ── TABS ── */
.search-tabs {
  display: flex;
  border-bottom: 1px solid #232323;
  flex-shrink: 0;
}
.search-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b6b6b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}
.search-tab:hover {
  color: #f0ede8;
  background: rgba(255, 255, 255, 0.02);
}
.search-tab.active {
  color: #f0ede8;
}
.search-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: #f0ede8;
}
.search-tab svg {
  width: 13px;
  height: 13px;
  stroke-width: 1.5;
}
.tab-count {
  font-size: 9px;
  color: #3a3a3a;
}

/* ── RESULTS AREA ── */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.search-results::-webkit-scrollbar {
  width: 3px;
}
.search-results::-webkit-scrollbar-track {
  background: transparent;
}
.search-results::-webkit-scrollbar-thumb {
  background: #2e2e2e;
  border-radius: 2px;
}

/* ── RESULT GROUP ── */
.result-group {
  margin-bottom: 24px;
}
.result-group:last-child {
  margin-bottom: 0;
}
.result-group-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3a3a3a;
  margin-bottom: 10px;
}

/* ── USER ROW ── */
.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.user-row:hover {
  background: #181818;
  border-color: #232323;
}
.user-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #2e2e2e;
  border-radius: 10px;
  background: #181818;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #e8e4dc;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-username {
  font-size: 14px;
  font-weight: 600;
  color: #f0ede8;
  letter-spacing: -0.01em;
}
.user-email {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #6b6b6b;
  letter-spacing: 0.02em;
  margin-top: 1px;
}
.user-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #232323;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  color: #6b6b6b;
  transition: all 0.15s;
  flex-shrink: 0;
}
.user-chat-btn:hover {
  border-color: #3d3d3d;
  background: #111111;
  color: #f0ede8;
}
.user-chat-btn svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.5;
}

/* ── POST ROW ── */
.post-row {
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.post-row:hover {
  background: #181818;
  border-color: #232323;
}
.post-content {
  font-size: 13px;
  color: #c5c0b8;
  line-height: 1.6;
  margin-bottom: 6px;
}
.post-author {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #6b6b6b;
  letter-spacing: 0.04em;
}

/* ── SOUNDTOK ROW ── */
.soundtok-row {
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.soundtok-row:hover {
  background: #181818;
  border-color: #232323;
}
.soundtok-description {
  font-size: 13px;
  color: #c5c0b8;
  line-height: 1.6;
  margin-bottom: 6px;
}
.soundtok-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.soundtok-author {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #6b6b6b;
  letter-spacing: 0.04em;
}
.soundtok-likes {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #6b6b6b;
  letter-spacing: 0.04em;
}

/* ── EMPTY STATES ── */
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
}
.empty-icon {
  color: #3a3a3a;
  margin-bottom: 12px;
  opacity: 0.5;
}
.empty-icon svg {
  width: 40px;
  height: 40px;
  stroke-width: 1;
}
.empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3a3a3a;
  margin-bottom: 4px;
}
.empty-hint {
  font-size: 13px;
  color: #6b6b6b;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
}
.loading-dots {
  display: flex;
  gap: 4px;
}
.loading-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3a3a3a;
  animation: dotPulse 1.4s ease-in-out infinite;
}
.loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}
`;

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'soundtoks'>('all');

  const startChat = async (userId: string) => {
    try {
      const chat = await chatsApi.createChat(userId);
      navigate(`/chats/${chat.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  useEffect(() => {
    const handleSearch = async () => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await searchApi.search(
          query, 
          activeTab === 'all' ? undefined : activeTab === 'soundtoks' ? 'soundtoks' : activeTab
        );
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTabCount = (type: 'users' | 'posts' | 'soundToks') => {
    return results ? results[type].length : 0;
  };

  const totalCount = results 
    ? results.users.length + results.posts.length + results.soundToks.length 
    : 0;

  return (
    <div className="search-overlay" onClick={onClose}>
      <style>{css}</style>
      
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="search-input-area">
          <span className="search-icon-wrap">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск пользователей, постов, видео..."
            className="search-field"
            autoFocus
          />
          <button onClick={onClose} className="search-close">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        {query && (
          <div className="search-tabs">
            {[
              { key: 'all', label: 'Все', count: totalCount, icon: Search },
              { key: 'users', label: 'Пользователи', count: getTabCount('users'), icon: Users },
              { key: 'posts', label: 'Посты', count: getTabCount('posts'), icon: FileText },
              { key: 'soundtoks', label: 'SoundTok', count: getTabCount('soundToks'), icon: Video }
            ].map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`search-tab ${activeTab === key ? 'active' : ''}`}
              >
                <Icon size={13} />
                <span>{label}</span>
                {count > 0 && <span className="tab-count">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="search-results">
          {loading ? (
            <div className="search-loading">
              <div className="loading-dots">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          ) : !query ? (
            <div className="search-empty">
              <div className="empty-icon">
                <Search size={40} />
              </div>
              <div className="empty-label">Поиск</div>
              <div className="empty-hint">Начните вводить для поиска</div>
            </div>
          ) : results && totalCount > 0 ? (
            <div>
              {/* Users */}
              {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                <div className="result-group">
                  <div className="result-group-heading">
                    Пользователи ({results.users.length})
                  </div>
                  {results.users.map((user) => (
                    <div key={user.id} className="user-row">
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}
                        onClick={() => {
                          navigate(`/profile/${user.username}`);
                          onClose();
                        }}
                      >
                        <div className="user-avatar">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="user-username">@{user.username}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startChat(user.id);
                        }}
                        className="user-chat-btn"
                      >
                        <MessageCircle size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Posts */}
              {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
                <div className="result-group">
                  <div className="result-group-heading">
                    Посты ({results.posts.length})
                  </div>
                  {results.posts.map((post) => (
                    <div key={post.id} className="post-row">
                      <div className="post-content">{post.content}</div>
                      <div className="post-author">от @{post.author.username}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* SoundToks */}
              {(activeTab === 'all' || activeTab === 'soundtoks') && results.soundToks.length > 0 && (
                <div className="result-group">
                  <div className="result-group-heading">
                    SoundTok ({results.soundToks.length})
                  </div>
                  {results.soundToks.map((soundTok) => (
                    <div key={soundTok.id} className="soundtok-row">
                      <div className="soundtok-description">{soundTok.description}</div>
                      <div className="soundtok-footer">
                        <span className="soundtok-author">от @{soundTok.author.username}</span>
                        <span className="soundtok-likes">❤ {soundTok.likes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="search-empty">
              <div className="empty-label">Ничего не найдено</div>
              <div className="empty-hint">Попробуйте изменить запрос</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}