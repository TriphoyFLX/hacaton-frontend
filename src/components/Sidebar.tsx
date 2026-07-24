import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatUnreadStore } from '../store/chatUnreadStore';
import { resolveMediaUrl } from '../lib/mediaUrl';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const css = `
${FONT_IMPORT}

.sb-root {
  --bg: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --bg-hover: #141414;
  --border: #1a1a1a;
  --border-mid: #232323;
  --border-hover: #2e2e2e;
  --text-primary: #f0ede8;
  --text-secondary: #c5c0b8;
  --text-muted: #85817a;
  --text-faint: #6f6b65;
  --accent: #f0ede8;
  font-family: 'Syne', sans-serif;
}

.sb-root {
  width: 220px;
  min-width: 220px;
  background: var(--bg);
  border-right: 1px solid var(--border);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
}

/* ── LOGO ── */
.sb-logo {
  padding: 28px 20px 0;
  margin-bottom: 32px;
}
.sb-logo-mark {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
}
.sb-logo-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sb-logo-icon svg {
  width: 14px;
  height: 14px;
  color: var(--bg);
  stroke-width: 2.2;
}
.sb-logo-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.sb-logo-tag {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding-left: 1px;
}

/* ── NAV ── */
.sb-nav {
  flex: 1;
  padding: 0 10px;
  overflow-y: auto;
}
.sb-nav::-webkit-scrollbar { display: none; }

.sb-section-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding: 0 10px;
  display: block;
  margin-bottom: 6px;
}
.sb-section-label + .sb-section-label {
  margin-top: 4px;
}

.sb-divider {
  border: none;
  border-top: 1px solid #161616;
  margin: 10px 10px;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  margin-bottom: 1px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  color: var(--text-muted);
  position: relative;
}
.sb-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-mid);
  color: var(--text-secondary);
}
.sb-item.active {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.sb-item.active::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 14px;
  background: var(--text-primary);
  border-radius: 2px;
}

.sb-item-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #141414;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s;
}
.sb-item:hover .sb-item-icon,
.sb-item.active .sb-item-icon {
  background: var(--bg-elevated);
}
.sb-item-icon svg {
  width: 13px;
  height: 13px;
  stroke-width: 1.6;
}

.sb-item-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  flex: 1;
}

.sb-badge {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1.5;
}
.sb-badge-new {
  background: var(--accent);
  color: var(--bg);
  font-size: 9px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: auto;
}
.sb-badge-hot {
  background: linear-gradient(135deg, #ff6b6b, #ff4444);
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: auto;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.sb-badge-count {
  background: #1a1510;
  color: #8a6c3a;
  border: 1px solid #2a2010;
  margin-left: auto;
}
.sb-badge-count-active {
  background: #e8e4dc;
  color: #0b0b0b;
  border: 1px solid #e8e4dc;
  margin-left: auto;
  font-weight: 600;
}
.sb-badge-beta {
  background: #1e1530;
  color: #9b7fd4;
  border: 1px solid #2e2050;
}

/* ── AI special state ── */
.sb-item.sb-ai:hover,
.sb-item.sb-ai.active {
  background: #130e1c;
  border-color: #2a1f3a;
  color: #c8b8f0;
}
.sb-item.sb-ai:hover .sb-item-icon,
.sb-item.sb-ai.active .sb-item-icon {
  background: #1e1530;
  color: #b99fe8;
}
.sb-item.sb-ai.active::before {
  background: #9b7fd4;
}

/* ── Admin special state ── */
.sb-item.sb-admin:hover,
.sb-item.sb-admin.active {
  background: #1a0f0f;
  border-color: #2e1515;
  color: #d47070;
}
.sb-item.sb-admin:hover .sb-item-icon,
.sb-item.sb-admin.active .sb-item-icon {
  background: #2a1212;
  color: #c05050;
}
.sb-item.sb-admin.active::before {
  background: #c05050;
}

/* ── FOOTER ── */
.sb-footer {
  padding: 12px 10px 20px;
  border-top: 1px solid var(--border);
}
.sb-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  text-decoration: none;
}
.sb-user:hover {
  background: var(--bg-hover);
  border-color: var(--border-mid);
}
.sb-avatar {
  width: 28px;
  height: 28px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-hover);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  flex-shrink: 0;
  overflow: hidden;
}
.sb-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sb-user-info { flex: 1; min-width: 0; }
.sb-username {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-plan {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.45;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.sb-chevron {
  color: var(--text-faint);
  flex-shrink: 0;
}
.sb-chevron svg {
  width: 12px;
  height: 12px;
  stroke-width: 1.5;
}

/* ── MOBILE APPBAR (≤768px) ── */
.sb-mobile-nav {
  display: none;
}

@media (max-width: 768px) {
  .sb-root {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto !important;
    width: 100% !important;
    height: auto !important;
    background: var(--bg);
    border-top: 1px solid var(--border);
    border-left: none;
    border-right: none;
    z-index: 1000;
    padding: 8px 0 12px;
  }

  .sb-logo,
  .sb-footer,
  .sb-nav,
  .sb-section-label,
  .sb-divider,
  .sb-badge {
    display: none !important;
  }

  .sb-mobile-nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    padding: 0;
    gap: 0;
  }

  .sb-mobile-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 52px;
    padding: 5px 2px;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .sb-mobile-item.active,
  .sb-mobile-item:hover {
    color: var(--text-primary);
  }

  .sb-mobile-item.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    background: var(--text-primary);
    border-radius: 50%;
  }

  .sb-mobile-icon {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
  }

  .sb-mobile-icon svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.7;
  }

  .sb-mobile-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.02em;
  }

  .sb-mobile-more-menu {
    position: fixed;
    right: 12px;
    bottom: calc(var(--app-bottom-nav) + 8px);
    width: min(240px, calc(100vw - 24px));
    padding: 8px;
    border: 1px solid var(--border-hover);
    border-radius: 12px;
    background: var(--bg-elevated);
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    z-index: 2;
  }

  .sb-mobile-more-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: rgba(0, 0, 0, 0.32);
    z-index: 1;
  }

  .sb-mobile-more-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 8px;
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 11px;
    text-decoration: none;
  }

  .sb-mobile-more-link.active,
  .sb-mobile-more-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .sb-mobile-more-link svg {
    width: 15px;
    height: 15px;
    stroke-width: 1.7;
  }
}

/* ── TABLET (769px - 1024px) ── */
@media (min-width: 769px) and (max-width: 1024px) {
  .sb-root {
    width: 200px !important;
  }
}
`;

// ── Icons ──
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconMusic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
const IconBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M6 8h12l1 12H5L6 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);
const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const IconWaveform = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 12h2l2-6 4 12 3-9 2 3h5" />
  </svg>
);
const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconAI = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M18.66 5.34l1.41-1.41" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
/** Тарифы — отдельная иконка, чтобы не путать с админкой (щит). */
const IconTariff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MAIN_NAV = [
  { path: '/feed',     label: 'Лента',     icon: <IconHome /> },
  { path: '/projects', label: 'Проекты',   icon: <IconFolder /> },
];

const CONTENT_NAV = [
  { path: '/soundtok', label: 'SoundTok',     icon: <IconVideo />,  badge: <span className="sb-badge sb-badge-new">NEW</span> },
  { path: '/rap-battle', label: 'Rap Battle',  icon: <IconMusic />,  badge: <span className="sb-badge sb-badge-hot">HOT</span> },
  { path: '/midi',      label: 'MIDI',         icon: <IconWaveform />,  badge: <span className="sb-badge sb-badge-beta">β</span> },
  { path: '/presets',   label: 'Пресеты',      icon: <IconBag /> },
  { path: '/chats',    label: 'Чаты',          icon: <IconChat /> },
];

export default function Sidebar() {
  const { user, token } = useAuthStore();
  const totalUnread = useChatUnreadStore((s) => s.totalUnread);
  const refreshUnread = useChatUnreadStore((s) => s.refresh);
  const isAdmin = user?.role === 'ADMIN';
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const avatarUrl = resolveMediaUrl(user?.avatar);

  useEffect(() => {
    if (!token) return;

    refreshUnread();
    const interval = setInterval(refreshUnread, 15000);
    return () => clearInterval(interval);
  }, [token, refreshUnread]);

  const linkClass = ({ isActive }: { isActive: boolean }, extra = '') => {
    return `sb-item${isActive ? ' active' : ''}${extra ? ` ${extra}` : ''}`;
  };

  return (
    <aside className="sb-root">
      <style>{css}</style>

      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-mark">
          <div className="sb-logo-icon">
            <img src="/soundlab.svg" alt="SoundLab" style={{ width: '24px', height: '24px' }} />
          </div>
          <span className="sb-logo-name">SoundLab</span>
        </div>
        <div className="sb-logo-tag">Studio Platform</div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        <span className="sb-section-label">Главное</span>

        {MAIN_NAV.map(({ path, label, icon }) => (
          <NavLink key={path} to={path} className={linkClass}>
            <span className="sb-item-icon">{icon}</span>
            <span className="sb-item-label">{label}</span>
          </NavLink>
        ))}

        <hr className="sb-divider" />
        <span className="sb-section-label">Контент</span>

        {CONTENT_NAV.map(({ path, label, icon, badge }) => (
          <NavLink key={path} to={path} className={linkClass}>
            <span className="sb-item-icon">{icon}</span>
            <span className="sb-item-label">{label}</span>
            {path === '/chats' && totalUnread > 0 ? (
              <span className="sb-badge sb-badge-count-active">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            ) : (
              badge
            )}
          </NavLink>
        ))}

        <hr className="sb-divider" />

        <NavLink to="/ai" className={(s) => linkClass(s, 'sb-ai')}>
          <span className="sb-item-icon"><IconAI /></span>
          <span className="sb-item-label">AI генерация</span>
          <span className="sb-badge sb-badge-beta">β</span>
        </NavLink>

        <hr className="sb-divider" />

        <NavLink to="/pricing" className={linkClass}>
          <span className="sb-item-icon"><IconTariff /></span>
          <span className="sb-item-label">Тарифы</span>
        </NavLink>

        <NavLink to="/profile" className={linkClass}>
          <span className="sb-item-icon"><IconUser /></span>
          <span className="sb-item-label">Профиль</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" className={(s) => linkClass(s, 'sb-admin')}>
            <span className="sb-item-icon"><IconShield /></span>
            <span className="sb-item-label">Админ</span>
          </NavLink>
        )}
      </nav>

      <nav className="sb-mobile-nav" aria-label="Основная навигация">
        <NavLink to="/feed" className={({ isActive }) => `sb-mobile-item${isActive ? ' active' : ''}`}>
          <span className="sb-mobile-icon"><IconHome /></span>
          <span className="sb-mobile-label">Лента</span>
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `sb-mobile-item${isActive ? ' active' : ''}`}>
          <span className="sb-mobile-icon"><IconFolder /></span>
          <span className="sb-mobile-label">Проекты</span>
        </NavLink>
        <NavLink to="/soundtok" className={({ isActive }) => `sb-mobile-item${isActive ? ' active' : ''}`}>
          <span className="sb-mobile-icon"><IconVideo /></span>
          <span className="sb-mobile-label">SoundTok</span>
        </NavLink>
        <NavLink to="/chats" className={({ isActive }) => `sb-mobile-item${isActive ? ' active' : ''}`}>
          <span className="sb-mobile-icon"><IconChat /></span>
          <span className="sb-mobile-label">Чаты</span>
        </NavLink>
        <button
          type="button"
          className={`sb-mobile-item${isMoreOpen ? ' active' : ''}`}
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          aria-controls="mobile-more-menu"
        >
          <span className="sb-mobile-icon"><IconGrid /></span>
          <span className="sb-mobile-label">Ещё</span>
        </button>
        {isMoreOpen && (
          <>
            <button type="button" className="sb-mobile-more-backdrop" onClick={() => setIsMoreOpen(false)} aria-label="Закрыть меню" />
            <div id="mobile-more-menu" className="sb-mobile-more-menu">
              <NavLink to="/rap-battle" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                <IconMusic />Rap Battle
              </NavLink>
              <NavLink to="/midi" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                <IconWaveform />MIDI
              </NavLink>
              <NavLink to="/presets" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                <IconBag />Пресеты
              </NavLink>
              <NavLink to="/ai" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                <IconAI />AI генерация
              </NavLink>
              <NavLink to="/pricing" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                <IconTariff />Тарифы
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                <IconUser />Профиль
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `sb-mobile-more-link${isActive ? ' active' : ''}`} onClick={() => setIsMoreOpen(false)}>
                  <IconShield />Админ
                </NavLink>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Footer: user card */}
      {user && (
        <div className="sb-footer">
          <NavLink to="/profile" className="sb-user">
            <div className="sb-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.username} />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>
            <div className="sb-user-info">
              <div className="sb-username">@{user.username}</div>
              <div className="sb-plan">{user.plan === 'PRO' ? 'Pro' : user.plan === 'PLATINUM' ? 'Platinum' : 'Free'} · {user.tokenBalance ?? 0} ток.</div>
            </div>
            <div className="sb-chevron"><IconChevron /></div>
          </NavLink>
        </div>
      )}
    </aside>
  );
}