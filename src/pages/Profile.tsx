import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

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

/* ── HEADER BAR ── */
.profile-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.topbar-actions {
  display: flex;
  gap: 8px;
}
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  color: var(--text-secondary);
}
.btn-icon:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.btn-icon.danger:hover {
  border-color: var(--red);
  background: var(--red-dim);
  color: var(--red);
}
.btn-icon svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.5;
}

/* ── HERO ── */
.profile-hero {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  margin-bottom: 40px;
}
.avatar {
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
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.01em;
}
.hero-info {
  flex: 1;
  padding-top: 4px;
}
.hero-handle {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}
.hero-name {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 0 0 6px;
}
.hero-email {
  font-family: 'DM Mono', monospace;
  font-size: 11.5px;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

/* ── BIO ── */
.bio-section {
  margin-bottom: 40px;
}
.bio-text {
  font-size: 15px;
  color: var(--accent-dim);
  line-height: 1.65;
  font-weight: 400;
}
.bio-edit-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bio-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.65;
  padding: 14px 16px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}
.bio-textarea:focus {
  border-color: var(--border-hover);
}
.bio-actions {
  display: flex;
  gap: 8px;
}
.btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.btn-ghost:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.btn-primary {
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  color: #0b0b0b;
  font-weight: 500;
}
.btn-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}

/* ── STATS ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 40px;
}
.stat-cell {
  padding: 20px 24px;
  position: relative;
}
.stat-cell + .stat-cell {
  border-left: 1px solid var(--border);
}
.stat-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 5px;
}
.stat-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── DETAILS ── */
.details-section {
  margin-bottom: 48px;
}
.section-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.detail-row:first-of-type {
  border-top: 1px solid var(--border);
}
.detail-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.detail-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  min-width: 88px;
}
.detail-value {
  font-size: 13.5px;
  color: var(--accent-dim);
}
.detail-link {
  font-size: 13.5px;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border-mid);
  transition: border-color 0.15s;
}
.detail-link:hover {
  border-color: var(--accent);
}

/* ── POSTS ── */
.posts-section {}
.posts-empty {
  border: 1px dashed var(--border-mid);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
}
.posts-empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}
`;

// ── SVG ICONS ──
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('Музыкант и творец');

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Загрузка...
          </span>
        </div>
      </div>
    );
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="profile-root">
      <style>{css}</style>
      <div className="profile-wrapper">

        {/* Top bar */}
        <div className="profile-topbar">
          <span className="topbar-label">Профиль</span>
          <div className="topbar-actions">
            <button className="btn-icon" onClick={() => setIsEditing(!isEditing)} title="Редактировать">
              <IconEdit />
            </button>
            <button className="btn-icon danger" onClick={handleLogout} title="Выйти">
              <IconLogout />
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="profile-hero">
          <div className="avatar">{user.username[0].toUpperCase()}</div>
          <div className="hero-info">
            <div className="hero-handle">@{user.username}</div>
            <h1 className="hero-name">{user.username}</h1>
            <div className="hero-email">{user.email}</div>
          </div>
        </div>

        {/* Bio */}
        <div className="bio-section">
          {isEditing ? (
            <div className="bio-edit-wrap">
              <textarea
                className="bio-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Расскажите о себе..."
                autoFocus
              />
              <div className="bio-actions">
                <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={() => setIsEditing(false)}>Сохранить</button>
              </div>
            </div>
          ) : (
            <p className="bio-text">{bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-cell">
            <div className="stat-num">0</div>
            <div className="stat-label">Постов</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">0</div>
            <div className="stat-label">Подписчиков</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">0</div>
            <div className="stat-label">Подписок</div>
          </div>
        </div>

        {/* Details */}
        <div className="details-section">
          <div className="section-heading">Информация</div>

          <div className="detail-row">
            <span className="detail-icon"><IconCalendar /></span>
            <span className="detail-label">С нами с</span>
            <span className="detail-value">{joinDate}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconMail /></span>
            <span className="detail-label">Email</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconPin /></span>
            <span className="detail-label">Локация</span>
            <span className="detail-value">Россия</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconLink /></span>
            <span className="detail-label">Сайт</span>
            <a href="#" className="detail-link">mysite.com</a>
          </div>
        </div>

        {/* Posts */}
        <div className="posts-section">
          <div className="section-heading">Посты</div>
          <div className="posts-empty">
            <div className="posts-empty-label">Нет публикаций</div>
          </div>
        </div>

      </div>
    </div>
  );
}