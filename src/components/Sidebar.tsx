import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

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
  --text-muted: #5a5a5a;
  --text-faint: #2e2e2e;
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
  background: var(--text-primary);
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
  font-size: 8.5px;
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
  font-size: 9px;
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
  font-size: 9px;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1.5;
}
.sb-badge-new {
  background: #0f1a0f;
  color: #4a8c4a;
  border: 1px solid #1e2e1e;
}
.sb-badge-count {
  background: #1a1510;
  color: #8a6c3a;
  border: 1px solid #2a2010;
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
  font-size: 9px;
  color: var(--text-faint);
  letter-spacing: 0.06em;
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
const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
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
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconBrandLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const MAIN_NAV = [
  { path: '/feed',     label: 'Лента',     icon: <IconHome /> },
  { path: '/studio',   label: 'Студия',    icon: <IconMusic /> },
  { path: '/projects', label: 'Проекты',   icon: <IconVideo /> },
];

const CONTENT_NAV = [
  { path: '/soundtok', label: 'SoundTok',     icon: <IconVideo />,  badge: <span className="sb-badge sb-badge-new">NEW</span> },
  { path: '/chats',    label: 'Чаты',          icon: <IconChat />,   badge: <span className="sb-badge sb-badge-count">3</span> },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const linkClass = ({ isActive }, extra = '') =>
    `sb-item${isActive ? ' active' : ''}${extra ? ` ${extra}` : ''}`;

  return (
    <aside className="sb-root">
      <style>{css}</style>

      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-mark">
          <div className="sb-logo-icon"><IconBrandLogo /></div>
          <span className="sb-logo-name">BandLab</span>
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
            {badge}
          </NavLink>
        ))}

        <hr className="sb-divider" />

        <NavLink to="/ai" className={(s) => linkClass(s, 'sb-ai')}>
          <span className="sb-item-icon"><IconAI /></span>
          <span className="sb-item-label">AI генерация</span>
          <span className="sb-badge sb-badge-beta">β</span>
        </NavLink>

        <hr className="sb-divider" />

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

      {/* Footer: user card */}
      {user && (
        <div className="sb-footer">
          <NavLink to="/profile" className="sb-user">
            <div className="sb-avatar">{user.username[0].toUpperCase()}</div>
            <div className="sb-user-info">
              <div className="sb-username">@{user.username}</div>
              <div className="sb-plan">Free plan</div>
            </div>
            <div className="sb-chevron"><IconChevron /></div>
          </NavLink>
        </div>
      )}
    </aside>
  );
}