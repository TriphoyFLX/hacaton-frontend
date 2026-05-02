import { useState } from 'react';
import SearchModal from './SearchModal';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const css = `
${FONT_IMPORT}

.header-root {
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

.header-root {
  width: 100%;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 12px 20px;
  max-width: 100%;
}

/* ── ICON BUTTONS ── */
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  color: var(--text-muted);
  position: relative;
}
.header-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-mid);
  color: var(--text-secondary);
}
.header-btn:active {
  background: var(--bg-elevated);
  border-color: var(--border-hover);
  color: var(--text-primary);
}

/* ── SVG ICONS ── */
.header-icon {
  width: 16px;
  height: 16px;
  stroke-width: 1.6;
}

/* ── NOTIFICATION DOT ── */
.header-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 5px;
  height: 5px;
  background: var(--accent);
  border-radius: 50%;
}

/* ── KEYBOARD SHORTCUT HINT ── */
.header-hint {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.12s;
  white-space: nowrap;
}
.header-btn:hover .header-hint {
  opacity: 1;
}
`;

// ── SVG ICONS ──
const IconSearch = () => (
  <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconBell = () => (
  <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="header-root">
        <style>{css}</style>
        
        <div className="header-inner">
          {/* Search button */}
          <button 
            className="header-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Поиск"
          >
            <IconSearch />
            <span className="header-hint">⌘K</span>
          </button>

          {/* Notifications button */}
          <button 
            className="header-btn"
            aria-label="Уведомления"
          >
            <IconBell />
            <span className="header-dot" />
          </button>
        </div>
      </header>
      
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}