import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AppNotification, notificationsApi } from '../api/notifications';
import { useAuthStore } from '../store/authStore';
import { API_ORIGIN } from '../api/client';
import { usePwaInstall } from '../hooks/usePwaInstall';
import PwaInstallButton from './PwaInstallButton';
import { appSocket } from '../lib/appSocket';

const SearchModal = lazy(() => import('./SearchModal'));

const FONT_IMPORT = '';

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
.header-install {
  display: none;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Syne', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.header-install:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
}
@media (min-width: 768px) {
  .header-install { display: inline-flex; }
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

.notifications-wrap {
  position: relative;
}
.notifications-backdrop {
  position: fixed;
  z-index: 4999;
  inset: 0;
  border: 0;
  background: transparent;
}
.notifications-panel {
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --border-mid: #232323;
  --text-primary: #f0ede8;
  --text-secondary: #c5c0b8;
  --text-muted: #737373;
  position: fixed;
  z-index: 5000;
  top: 67px;
  right: 20px;
  width: min(380px, calc(100vw - 24px));
  max-height: min(520px, calc(100dvh - 83px - var(--app-bottom-nav, 0px)));
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: 8px;
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  background: var(--bg-surface);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}
.notifications-title {
  position: sticky;
  z-index: 1;
  top: -8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-mid);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}
.notifications-clear {
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font: 10px 'DM Mono', monospace;
  letter-spacing: .03em;
}
.notifications-clear:hover {
  color: var(--text-primary);
}
.notifications-clear:disabled {
  cursor: default;
  opacity: .45;
}
.notification-item {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: 12px 'Syne', sans-serif;
  text-align: left;
}
.notification-item:hover,
.notification-item.unread {
  background: var(--bg-elevated);
}
.notification-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: var(--border-mid);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}
.notification-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.notification-copy {
  min-width: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.notification-time {
  display: block;
  margin-top: 3px;
  color: var(--text-muted);
  font: 10px 'DM Mono', monospace;
}
.notifications-empty {
  padding: 24px 10px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .header-inner {
    padding: 8px 12px;
    justify-content: flex-end;
  }

  .header-btn {
    width: 40px;
    height: 40px;
  }

  .header-hint {
    display: none;
  }

  .notifications-panel {
    top: 65px;
    right: 12px;
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 77px - var(--app-bottom-nav, 0px));
  }
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsLoadedRef = useRef(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const { standalone, installedOnDevice } = usePwaInstall();

  const loadUnreadBadge = useCallback(async () => {
    if (!token) return;
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Keep header usable when temporarily unavailable.
    }
  }, [token]);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const result = await notificationsApi.getAll();
      setNotifications(result.items);
      setUnreadCount(result.unreadCount);
      notificationsLoadedRef.current = true;
    } catch {
      // Keep the header usable when a request is temporarily unavailable.
    }
  }, [token]);

  // Lightweight badge only — defer off critical path
  useEffect(() => {
    if (!token) return;
    const schedule =
      'requestIdleCallback' in window
        ? (cb: () => void) => window.requestIdleCallback(() => cb(), { timeout: 2500 })
        : (cb: () => void) => window.setTimeout(cb, 1200);
    const id = schedule(() => {
      void loadUnreadBadge();
    });
    return () => {
      if (typeof id === 'number' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
      } else {
        window.clearTimeout(id as number);
      }
    };
  }, [token, loadUnreadBadge]);

  useEffect(() => {
    if (!token) return;
    const socket = appSocket.acquire(token);
    const onNotification = (notification: AppNotification) => {
      setNotifications((current) => {
        if (!notificationsLoadedRef.current) return current;
        return [notification, ...current.filter((item) => item.id !== notification.id)];
      });
      setUnreadCount((current) => current + 1);
    };
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
      appSocket.release();
    };
  }, [token]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isNotificationsOpen]);

  const openNotifications = async () => {
    const opening = !isNotificationsOpen;
    setIsNotificationsOpen(opening);
    if (opening) await loadNotifications();
  };

  const notificationText = (notification: AppNotification) => {
    const name = notification.actor.displayName || `@${notification.actor.username}`;
    if (notification.entityType === 'soundtok') {
      if (notification.type === 'LIKE') return `${name} оценил(а) ваше видео`;
      if (notification.type === 'COMMENT') return `${name} прокомментировал(а) ваше видео`;
    }
    const actions: Record<AppNotification['type'], string> = {
      LIKE: 'оценил(а) вашу публикацию',
      COMMENT: 'оставил(а) комментарий к публикации',
      FOLLOW: 'подписался(ась) на вас',
      MESSAGE: 'отправил(а) вам сообщение',
    };
    return `${name} ${actions[notification.type]}`;
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      const result = await notificationsApi.markRead([notification.id]);
      setUnreadCount(result.unreadCount);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    }
    setIsNotificationsOpen(false);
    if (notification.entityType === 'soundtok' && notification.entityId) {
      const base = `/soundtok?v=${encodeURIComponent(notification.entityId)}`;
      navigate(notification.type === 'COMMENT' ? `${base}&c=1` : base);
      return;
    }
    if (notification.entityType === 'post' && notification.entityId) navigate(`/feed?p=${notification.entityId}`);
    else if (notification.entityType === 'chat' && notification.entityId) navigate(`/chats/${notification.entityId}`);
    else navigate(`/profile/${notification.actor.username}`);
  };

  const clearNotifications = async () => {
    if (notifications.length === 0 || clearingNotifications) return;
    if (!window.confirm('Очистить все уведомления?')) return;

    setClearingNotifications(true);
    try {
      await notificationsApi.clear();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      window.alert('Не удалось очистить уведомления. Попробуйте ещё раз.');
    } finally {
      setClearingNotifications(false);
    }
  };

  return (
    <>
      <header className="header-root">
        <style>{css}</style>
        
        <div className="header-inner">
          {!standalone && !installedOnDevice && (
            <PwaInstallButton className="header-install" />
          )}

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
          <div className="notifications-wrap">
            <button
              className="header-btn"
              onClick={() => void openNotifications()}
              aria-label="Уведомления"
              aria-expanded={isNotificationsOpen}
            >
              <IconBell />
              {unreadCount > 0 && <span className="header-dot" />}
            </button>
          </div>
        </div>
      </header>

      {isNotificationsOpen && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="notifications-backdrop"
            aria-label="Закрыть уведомления"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div className="notifications-panel" role="dialog" aria-label="Уведомления">
            <div className="notifications-title">
              <span>Уведомления</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="notifications-clear"
                  disabled={clearingNotifications}
                  onClick={() => void clearNotifications()}
                >
                  {clearingNotifications ? 'ОЧИЩАЕМ…' : 'ОЧИСТИТЬ ВСЕ'}
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="notifications-empty">Пока нет новых уведомлений</div>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                className={`notification-item ${notification.readAt ? '' : 'unread'}`}
                onClick={() => void openNotification(notification)}
              >
                <span className="notification-avatar">
                  {notification.actor.avatar ? <img src={notification.actor.avatar.startsWith('http') ? notification.actor.avatar : `${API_ORIGIN}${notification.actor.avatar}`} alt="" /> : notification.actor.username[0]?.toUpperCase()}
                </span>
                <span className="notification-copy">
                  {notificationText(notification)}
                  <span className="notification-time">{new Date(notification.createdAt).toLocaleString('ru-RU')}</span>
                </span>
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
      
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </Suspense>
      )}
    </>
  );
}