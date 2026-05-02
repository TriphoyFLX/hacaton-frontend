import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Calendar, Mail, MapPin, Link as LinkIcon } from 'lucide-react';
import { chatsApi } from '../api/chats';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.profile-root {
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

.profile-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── AMBIENT ── */
.profile-ambient {
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
.profile-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.profile-grid-bg {
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
.profile-topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.back-btn:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.back-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
}
.topbar-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── PROFILE HEADER ── */
.profile-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
}
.profile-avatar {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border: 1px solid var(--border-mid);
  border-radius: 14px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.01em;
}
.profile-info {
  flex: 1;
  padding-top: 4px;
}
.profile-handle {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}
.profile-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}
.profile-email {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}
.profile-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ── BUTTONS ── */
.btn-primary {
  height: 36px;
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
  display: flex;
  align-items: center;
  gap: 7px;
}
.btn-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.btn-primary.following {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);
}
.btn-primary.following:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-surface);
}
.btn-primary svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.5;
}

/* ── BIO ── */
.profile-bio {
  position: relative;
  z-index: 10;
  margin-bottom: 32px;
}
.bio-text {
  font-size: 14.5px;
  color: var(--accent-dim);
  line-height: 1.7;
}

/* ── STATS ── */
.profile-stats {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 32px;
}
.stat-cell {
  padding: 18px 20px;
}
.stat-cell + .stat-cell {
  border-left: 1px solid var(--border);
}
.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  margin-bottom: 4px;
}
.stat-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── DETAILS ── */
.profile-details {
  position: relative;
  z-index: 10;
  margin-bottom: 40px;
}
.details-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.detail-row:first-of-type {
  border-top: 1px solid var(--border);
}
.detail-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.detail-icon svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.5;
}
.detail-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  min-width: 80px;
}
.detail-value {
  font-size: 13px;
  color: var(--accent-dim);
}
.detail-link {
  font-size: 13px;
  color: var(--text-primary);
  text-decoration: none;
  border-bottom: 1px solid var(--border-mid);
  transition: border-color 0.15s;
  padding-bottom: 1px;
}
.detail-link:hover {
  border-color: var(--text-primary);
}

/* ── POSTS SECTION ── */
.profile-posts {
  position: relative;
  z-index: 10;
}
.posts-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}
.posts-empty {
  border: 1px dashed var(--border-mid);
  border-radius: 14px;
  padding: 48px 24px;
  text-align: center;
}
.posts-empty-icon {
  font-size: 36px;
  opacity: 0.3;
  margin-bottom: 12px;
  color: var(--text-muted);
}
.posts-empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── LOADING ── */
.loading-state {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
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
.loading-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ── NOT FOUND ── */
.not-found-state {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  text-align: center;
}
.not-found-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.not-found-btn {
  height: 36px;
  padding: 0 18px;
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
.not-found-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-surface);
}
`;

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) return;
      
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5002/api/search?q=${username}&type=users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        
        if (data.users && data.users.length > 0) {
          const foundUser = data.users.find((u: any) => u.username === username);
          if (foundUser) {
            setUser({
              ...foundUser,
              bio: 'Музыкант и творец',
              followers: 0,
              following: 0,
              posts: 0
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const startChat = async () => {
    if (!user) return;
    try {
      const chat = await chatsApi.createChat(user.id);
      navigate(`/chats/${chat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-ambient">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>
        <div className="profile-noise" />
        <div className="profile-grid-bg" />
        <div className="loading-state">
          <div className="loading-spinner" />
          <span className="loading-label">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-ambient">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>
        <div className="profile-noise" />
        <div className="profile-grid-bg" />
        <div className="not-found-state">
          <span className="not-found-label">Пользователь не найден</span>
          <button onClick={() => navigate('/feed')} className="not-found-btn">
            Вернуться к ленте
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="profile-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="profile-noise" />
      <div className="profile-grid-bg" />

      <div className="profile-wrapper">
        {/* Top Bar */}
        <div className="profile-topbar">
          <div className="topbar-left">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={16} />
            </button>
            <span className="topbar-label">Профиль</span>
          </div>
        </div>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {user.username[0].toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-handle">@{user.username}</div>
            <h1 className="profile-name">{user.username}</h1>
            <div className="profile-email">{user.email}</div>
          </div>
          <div className="profile-actions">
            <button
              onClick={handleFollow}
              className={`btn-primary ${isFollowing ? 'following' : ''}`}
            >
              {isFollowing ? 'Отписаться' : 'Подписаться'}
            </button>
            <button onClick={startChat} className="btn-primary">
              <MessageCircle size={14} />
              Чат
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="profile-bio">
          <p className="bio-text">{user.bio}</p>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-cell">
            <div className="stat-num">{user.posts}</div>
            <div className="stat-label">Постов</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{user.followers}</div>
            <div className="stat-label">Подписчиков</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{user.following}</div>
            <div className="stat-label">Подписок</div>
          </div>
        </div>

        {/* Details */}
        <div className="profile-details">
          <div className="details-heading">Информация</div>

          <div className="detail-row">
            <span className="detail-icon"><Calendar size={15} /></span>
            <span className="detail-label">С нами с</span>
            <span className="detail-value">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : '—'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><Mail size={15} /></span>
            <span className="detail-label">Email</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><MapPin size={15} /></span>
            <span className="detail-label">Локация</span>
            <span className="detail-value">Россия</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><LinkIcon size={15} /></span>
            <span className="detail-label">Сайт</span>
            <a href="#" className="detail-link">mysite.com</a>
          </div>
        </div>

        {/* Posts */}
        <div className="profile-posts">
          <div className="posts-heading">Посты @{user.username}</div>
          <div className="posts-empty">
            <div className="posts-empty-icon">—</div>
            <div className="posts-empty-label">Нет публикаций</div>
          </div>
        </div>
      </div>
    </div>
  );
}