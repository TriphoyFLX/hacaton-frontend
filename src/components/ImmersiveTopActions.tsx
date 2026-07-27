import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AppNotification, notificationsApi } from '../api/notifications';
import { API_ORIGIN } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { appSocket } from '../lib/appSocket';
import { isChatNotificationEntity, notificationText as formatNotificationText } from '../lib/notificationCopy';
import { playNotificationSound, unlockNotificationSound } from '../lib/notificationSound';

const SearchModal = lazy(() => import('./SearchModal'));

const css = `
.ita-root {
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}
.ita-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, transform 0.12s;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}
@media (min-width: 769px) {
  .ita-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
}
.ita-btn:hover {
  background: rgba(0, 0, 0, 0.45);
}
.ita-btn:active {
  transform: scale(0.96);
}
.ita-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
}
@media (min-width: 769px) {
  .ita-icon {
    width: 18px;
    height: 18px;
  }
}
.ita-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff5c5c;
  border: 1.5px solid rgba(0, 0, 0, 0.55);
}
.ita-backdrop {
  position: fixed;
  z-index: 4999;
  inset: 0;
  border: 0;
  background: transparent;
}
.ita-panel {
  position: fixed;
  z-index: 5000;
  top: calc(4px + env(safe-area-inset-top, 0px) + 36px);
  right: 12px;
  left: 12px;
  width: auto;
  max-width: 380px;
  margin-left: auto;
  max-height: min(520px, calc(100dvh - env(safe-area-inset-top, 0px) - var(--app-bottom-nav, 0px) - 72px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(17, 17, 17, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
}
.ita-panel-title {
  position: sticky;
  top: -8px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(17, 17, 17, 0.98);
  color: #f0ede8;
  font-size: 13px;
  font-weight: 700;
}
.ita-clear {
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  font: 10px 'DM Mono', monospace;
  letter-spacing: 0.03em;
}
.ita-item {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #c5c0b8;
  cursor: pointer;
  font: 12px 'Syne', sans-serif;
  text-align: left;
}
.ita-item:hover,
.ita-item.unread {
  background: rgba(255, 255, 255, 0.06);
}
.ita-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #232323;
  color: #f0ede8;
  font-size: 12px;
  font-weight: 700;
}
.ita-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ita-copy {
  min-width: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.ita-time {
  display: block;
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.45);
  font: 10px 'DM Mono', monospace;
}
.ita-empty {
  padding: 24px 10px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  text-align: center;
}
`;

const IconSearch = () => (
  <svg className="ita-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconBell = () => (
  <svg className="ita-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function ImmersiveTopActions() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const notificationsLoadedRef = useRef(false);
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  const loadUnreadBadge = useCallback(async () => {
    if (!token) return;
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore
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
      // ignore
    }
  }, [token]);

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
      playNotificationSound();
    };
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
      appSocket.release();
    };
  }, [token]);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

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

  const openNotification = async (notification: AppNotification) => {
    setIsNotificationsOpen(false);
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    if (!notification.readAt) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    try {
      const result = await notificationsApi.remove(notification.id);
      setUnreadCount(result.unreadCount);
    } catch {
      // keep local dismiss
    }

    if (isChatNotificationEntity(notification.entityType) && notification.entityId) {
      navigate(`/chats/${notification.entityId}`);
      return;
    }

    if (
      (notification.entityType === 'soundtok' || notification.entityType === 'soundtok_same_repost') &&
      notification.entityId
    ) {
      const base = `/soundtok?v=${encodeURIComponent(notification.entityId)}`;
      navigate(notification.type === 'COMMENT' ? `${base}&c=1` : base);
      return;
    }
    if (notification.entityType === 'post' && notification.entityId) navigate(`/feed?p=${notification.entityId}`);
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

  if (!token) return null;

  return (
    <>
      <style>{css}</style>
      <div className="ita-root">
        <button type="button" className="ita-btn" onClick={() => setIsSearchOpen(true)} aria-label="Поиск">
          <IconSearch />
        </button>
        <button
          type="button"
          className="ita-btn"
          onClick={() => void openNotifications()}
          aria-label="Уведомления"
          aria-expanded={isNotificationsOpen}
        >
          <IconBell />
          {unreadCount > 0 && <span className="ita-dot" />}
        </button>
      </div>

      {isNotificationsOpen && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="ita-backdrop"
            aria-label="Закрыть уведомления"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div className="ita-panel" role="dialog" aria-label="Уведомления">
            <div className="ita-panel-title">
              <span>Уведомления</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="ita-clear"
                  disabled={clearingNotifications}
                  onClick={() => void clearNotifications()}
                >
                  {clearingNotifications ? 'ОЧИЩАЕМ…' : 'ОЧИСТИТЬ ВСЕ'}
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="ita-empty">Пока нет новых уведомлений</div>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`ita-item ${notification.readAt ? '' : 'unread'}`}
                onClick={() => void openNotification(notification)}
              >
                <span className="ita-avatar">
                  {notification.actor.avatar ? (
                    <img
                      src={
                        notification.actor.avatar.startsWith('http')
                          ? notification.actor.avatar
                          : `${API_ORIGIN}${notification.actor.avatar}`
                      }
                      alt=""
                    />
                  ) : (
                    notification.actor.username[0]?.toUpperCase()
                  )}
                </span>
                <span className="ita-copy">
                  {formatNotificationText(notification)}
                  <span className="ita-time">
                    {new Date(notification.createdAt).toLocaleString('ru-RU')}
                  </span>
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
