import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  dismissPushBanner,
  ensureWebPushSubscription,
  getNotificationPermission,
  hasLocalPushEndpoint,
  supportsWebPush,
  wasPushBannerDismissed,
} from '../lib/webPush';
import { isPwaStandalone } from '../lib/pwa';
import { useAuthStore } from '../store/authStore';

const css = `
.push-banner {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + var(--app-bottom-nav, 0px));
  z-index: 121;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 14px 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(18, 18, 18, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 48px rgba(0,0,0,0.55);
  color: #f0ede8;
  font-family: 'Syne', system-ui, sans-serif;
  max-width: 420px;
  margin: 0 auto;
  animation: push-slide-up 0.28s ease-out;
}
@keyframes push-slide-up {
  from { transform: translateY(18px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.push-banner-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: #212121;
  border: 1px solid rgba(255,255,255,0.08);
  color: #f0ede8;
}
.push-banner-body { flex: 1; min-width: 0; }
.push-banner-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.push-banner-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(240, 237, 232, 0.62);
}
.push-banner-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.push-banner-btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.push-banner-btn.primary {
  background: #f0ede8;
  color: #0a0a0a;
}
.push-banner-btn.primary:disabled {
  opacity: 0.55;
  cursor: wait;
}
.push-banner-btn.ghost {
  background: transparent;
  color: rgba(240, 237, 232, 0.55);
  padding-left: 4px;
  padding-right: 4px;
}
.push-banner-close {
  border: 0;
  background: transparent;
  color: rgba(240, 237, 232, 0.4);
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
}
.push-banner-err {
  margin: 8px 0 0;
  font-size: 11px;
  color: #ff8a8a;
}
@media (min-width: 768px) {
  .push-banner {
    left: auto;
    right: 20px;
    bottom: 20px;
    width: 360px;
  }
}
`;

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chrome;
}

export default function PushEnableBanner() {
  const token = useAuthStore((s) => s.token);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!token || !supportsWebPush() || wasPushBannerDismissed()) {
      setVisible(false);
      return;
    }

    const permission = getNotificationPermission();
    if (permission === 'granted' && hasLocalPushEndpoint()) {
      setVisible(false);
      // Quietly re-sync subscription (no permission prompt)
      void ensureWebPushSubscription();
      return;
    }

    if (permission === 'denied') {
      setHint('Разрешите уведомления в настройках телефона для SoundLab, затем откройте приложение снова.');
      setVisible(true);
      return;
    }

    if (isIosSafari() && !isPwaStandalone()) {
      setHint('На iPhone: сначала «На экран Домой», потом откройте иконку и включите уведомления.');
      setVisible(true);
      return;
    }

    setHint('Сообщения и лайки будут приходить как на SMS, даже когда приложение закрыто.');
    setVisible(true);
  }, [token]);

  if (!visible) return null;

  const permission = getNotificationPermission();
  const denied = permission === 'denied';
  const needsInstall = isIosSafari() && !isPwaStandalone();

  const enable = async () => {
    setError('');
    setBusy(true);
    try {
      if (needsInstall) {
        setError('Добавьте сайт на экран Домой и откройте оттуда.');
        return;
      }
      const ok = await ensureWebPushSubscription();
      if (!ok) {
        setError(
          getNotificationPermission() === 'denied'
            ? 'Уведомления заблокированы в настройках браузера.'
            : 'Не удалось включить. Откройте приложение с домашнего экрана и попробуйте снова.',
        );
        return;
      }
      setVisible(false);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    dismissPushBanner();
    setVisible(false);
  };

  return (
    <>
      <style>{css}</style>
      <div className="push-banner" role="dialog" aria-label="Уведомления">
        <div className="push-banner-icon" aria-hidden>
          <Bell size={18} />
        </div>
        <div className="push-banner-body">
          <p className="push-banner-title">Включить уведомления</p>
          <p className="push-banner-text">{hint}</p>
          {error && <p className="push-banner-err">{error}</p>}
          <div className="push-banner-actions">
            {!denied && (
              <button type="button" className="push-banner-btn primary" disabled={busy} onClick={() => void enable()}>
                {busy ? 'Включаем…' : needsInstall ? 'Понятно' : 'Включить'}
              </button>
            )}
            <button type="button" className="push-banner-btn ghost" onClick={close}>
              Не сейчас
            </button>
          </div>
        </div>
        <button type="button" className="push-banner-close" aria-label="Закрыть" onClick={close}>
          <X size={16} />
        </button>
      </div>
    </>
  );
}
