import { useAuthStore } from '../store/authStore';

// ─────────────────────────────────────────────────────────
// DESIGN SYSTEM — matches Sidebar & Profile exactly
// ─────────────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const DASHBOARD_CSS = `
${FONT_IMPORT}

/* ── ROOT ── */
.db {
  --bg:        #0b0b0b;
  --surf:      #111111;
  --elev:      #181818;
  --hov:       #141414;
  --b1:        #1a1a1a;
  --b2:        #232323;
  --b3:        #2e2e2e;
  --b4:        #3d3d3d;
  --t1:        #f0ede8;
  --t2:        #c5c0b8;
  --t3:        #5a5a5a;
  --t4:        #2e2e2e;
  --purple:    #9b7fd4;
  --purple-bg: #1e1530;
  --purple-bd: #2e2050;
  --green:     #4a8c4a;
  --green-bg:  #0f1a0f;
  --green-bd:  #1e2e1e;
  --red:       #c0392b;
  --red-bg:    #1a0f0f;
  --red-bd:    #2e1515;
  --amber:     #8a6c3a;
  --amber-bg:  #1a1510;
  --amber-bd:  #2a2010;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--t1);
}

/* ── LAYOUT ── */
.db-wrap      { max-width: 860px; margin: 0 auto; padding: 48px 28px 100px; }

/* ── TOPBAR ── */
.db-topbar    { display:flex; align-items:center; justify-content:space-between;
                padding-bottom: 20px; border-bottom: 1px solid var(--b1); margin-bottom: 48px; }
.db-page-label{ font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.14em;
                text-transform:uppercase; color:var(--t3); }
.db-page-name { font-size:22px; font-weight:700; letter-spacing:-.03em; color:var(--t1); margin-top:3px; }
.db-topbar-r  { display:flex; align-items:center; gap:8px; }

/* ── ICON BUTTONS ── */
.db-btn-icon {
  display:flex; align-items:center; justify-content:center;
  width:32px; height:32px;
  border:1px solid var(--b1); border-radius:8px;
  background:transparent; cursor:pointer;
  transition:border-color .15s, background .15s, color .15s;
  color:var(--t3);
}
.db-btn-icon:hover { border-color:var(--b3); background:var(--surf); color:var(--t1); }
.db-btn-icon.danger:hover { border-color:var(--red); background:var(--red-bg); color:var(--red); }
.db-btn-icon svg { width:14px; height:14px; stroke-width:1.5; }

/* ── CARDS ── */
.db-card {
  background:var(--surf); border:1px solid var(--b1);
  border-radius:12px; padding:24px; margin-bottom:20px;
  transition:border-color .15s;
}
.db-card:hover { border-color:var(--b2); }
.db-card-hd    { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
.db-card-title { font-size:15px; font-weight:600; letter-spacing:-.01em; color:var(--t1); }
.db-card-sub   { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.08em;
                 text-transform:uppercase; color:var(--t3); margin-top:3px; }

/* ── INFO GRID ── */
.db-info-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; }
.db-info-item {
  background:var(--elev); border:1px solid var(--b2);
  border-radius:10px; padding:16px;
  transition:border-color .15s;
}
.db-info-item:hover { border-color:var(--b3); }
.db-info-label {
  font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--t3); margin-bottom:8px; display:block;
}
.db-info-value { font-size:14px; font-weight:500; color:var(--t2); }
.db-info-value strong { color:var(--t1); font-weight:600; }

/* ── HERO WELCOME ── */
.db-hero {
  text-align:center; padding:64px 0 48px;
}
.db-hero-icon {
  width:64px; height:64px; border:1px solid var(--b2); border-radius:16px;
  background:var(--elev); display:inline-flex; align-items:center; justify-content:center;
  margin-bottom:24px;
}
.db-hero-icon svg { width:28px; height:28px; color:var(--t3); stroke-width:1.4; }
.db-hero-title { font-size:28px; font-weight:700; letter-spacing:-.03em; margin-bottom:8px; color:var(--t1); }
.db-hero-desc  { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:.06em;
                 color:var(--t3); margin-bottom:36px; }

/* ── BUTTONS ── */
.db-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:0 18px; height:38px; border-radius:8px;
  font-family:'Syne',sans-serif; font-size:13px; font-weight:500;
  letter-spacing:-.01em; cursor:pointer;
  transition:background .15s, border-color .15s, color .15s;
  border:1px solid var(--b2); white-space:nowrap;
}
.db-btn-primary {
  background:var(--t1); color:var(--bg); border-color:var(--t1);
}
.db-btn-primary:hover { background:var(--t2); border-color:var(--t2); }
.db-btn-ghost {
  background:transparent; color:var(--t2);
}
.db-btn-ghost:hover { background:var(--hov); border-color:var(--b3); color:var(--t1); }
.db-btn-danger { background:var(--red-bg); color:var(--red); border-color:var(--red-bd); }
.db-btn-danger:hover { background:var(--red); color:var(--t1); border-color:var(--red); }
.db-btn:disabled { opacity:.4; cursor:not-allowed; }
.db-btn svg     { width:14px; height:14px; stroke-width:1.6; flex-shrink:0; }

/* ── MOBILE ── */
@media (max-width: 768px) {
  .db {
    padding-left: 0 !important;
  }
  .db-wrap {
    padding: 24px 16px 100px !important;
  }
  .db-hero {
    padding: 32px 0 24px !important;
  }
  .db-hero-title {
    font-size: 24px !important;
  }
  .db-info-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}
`;

export default function Dashboard() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="db">
      <style>{DASHBOARD_CSS}</style>

      <div className="db-wrap">
        {/* Top bar */}
        <div className="db-topbar">
          <div>
            <div className="db-page-label">Профиль</div>
            <div className="db-page-name">Панель управления</div>
          </div>
          <div className="db-topbar-r">
            <button onClick={handleLogout} className="db-btn-icon danger" title="Выйти">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Hero welcome */}
        <div className="db-hero">
          <div className="db-hero-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            </svg>
          </div>
          <div className="db-hero-title">Добро пожаловать, @{user?.username}!</div>
          <div className="db-hero-desc">Ваш личный кабинет и управление профилем</div>
        </div>

        {/* User info card */}
        <div className="db-card">
          <div className="db-card-hd">
            <div>
              <div className="db-card-title">Информация о профиле</div>
              <div className="db-card-sub">Личные данные и статистика</div>
            </div>
          </div>

          <div className="db-info-grid">
            <div className="db-info-item">
              <span className="db-info-label">Имя пользователя</span>
              <div className="db-info-value"><strong>@{user?.username}</strong></div>
            </div>
            <div className="db-info-item">
              <span className="db-info-label">Email</span>
              <div className="db-info-value"><strong>{user?.email}</strong></div>
            </div>
            <div className="db-info-item">
              <span className="db-info-label">Дата рождения</span>
              <div className="db-info-value">
                <strong>{user?.birthDate ? new Date(user.birthDate).toLocaleDateString('ru-RU') : 'Не указана'}</strong>
              </div>
            </div>
            <div className="db-info-item">
              <span className="db-info-label">Дата регистрации</span>
              <div className="db-info-value">
                <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="db-card">
          <div className="db-card-hd">
            <div>
              <div className="db-card-title">Быстрые действия</div>
              <div className="db-card-sub">Перейти к основным функциям</div>
            </div>
          </div>

          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            <button 
              onClick={() => window.location.href = '/rap-battle'}
              className="db-btn db-btn-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
              Рэп Баттл
            </button>
            <button 
              onClick={() => window.location.href = '/profile'}
              className="db-btn db-btn-ghost"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              </svg>
              Профиль
            </button>
            <button onClick={handleLogout} className="db-btn db-btn-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
