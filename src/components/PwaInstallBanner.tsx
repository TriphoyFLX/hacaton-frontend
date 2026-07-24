import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { wasPwaDismissed } from '../lib/pwa';

const css = `
.pwa-banner {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 120;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 14px 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(18, 18, 18, 0.94);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 48px rgba(0,0,0,0.55);
  color: #f0ede8;
  font-family: 'Syne', system-ui, sans-serif;
  max-width: 420px;
  margin: 0 auto;
  animation: pwa-slide-up 0.28s ease-out;
}
@keyframes pwa-slide-up {
  from { transform: translateY(18px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.pwa-banner-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #212121;
  border: 1px solid rgba(255,255,255,0.08);
}
.pwa-banner-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pwa-banner-body { flex: 1; min-width: 0; }
.pwa-banner-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.pwa-banner-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(240, 237, 232, 0.62);
}
.pwa-banner-text strong {
  color: rgba(240, 237, 232, 0.9);
  font-weight: 600;
}
.pwa-banner-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.pwa-banner-btn {
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
.pwa-banner-btn.primary {
  background: #f0ede8;
  color: #0a0a0a;
}
.pwa-banner-btn.ghost {
  background: transparent;
  color: rgba(240, 237, 232, 0.55);
  padding-left: 4px;
  padding-right: 4px;
}
.pwa-banner-close {
  border: 0;
  background: transparent;
  color: rgba(240, 237, 232, 0.4);
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
}
.pwa-banner-close:hover { color: rgba(240, 237, 232, 0.8); }
@media (min-width: 900px) {
  .pwa-banner { left: auto; right: 20px; bottom: 20px; width: 360px; margin: 0; }
}
`;

/**
 * Native install prompt (Android/Chrome) + iOS Safari tip.
 * Also auto-shows once so users learn SoundLab is a PWA.
 */
export default function PwaInstallBanner() {
  const location = useLocation();
  const { standalone, canNativeInstall, iosSafari, install, dismiss } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  const immersive =
    location.pathname === '/soundtok' ||
    location.pathname === '/midi' ||
    location.pathname === '/studio' ||
    (location.pathname.startsWith('/chats/') && location.pathname !== '/chats');

  useEffect(() => {
    if (standalone || wasPwaDismissed()) return;

    // Show as soon as Chrome exposes install, or after a short delay for discovery
    if (canNativeInstall) {
      setVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!standalone && !wasPwaDismissed()) setVisible(true);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [standalone, canNativeInstall]);

  const onDismiss = () => {
    dismiss();
    setVisible(false);
  };

  const onInstall = async () => {
    if (canNativeInstall) {
      await install();
      setVisible(false);
      return;
    }
    if (iosSafari) {
      window.alert(
        'Чтобы установить SoundLab на iPhone:\n\n1. Нажмите «Поделиться» в Safari\n2. Выберите «На экран Домой»\n3. Подтвердите «Добавить»',
      );
      return;
    }
    window.alert(
      'SoundLab можно установить как приложение на компьютер и телефон.\n\n' +
        'Windows / macOS (Chrome или Edge):\n' +
        '• Иконка ⊕ / «Установить» в адресной строке, или\n' +
        '• Меню ⋮ → «Установить приложение»\n\n' +
        'После установки ярлык появится на рабочем столе и в меню «Пуск».',
    );
  };

  if (!visible || immersive || standalone) return null;

  return (
    <>
      <style>{css}</style>
      <div className="pwa-banner" role="dialog" aria-label="Установить SoundLab">
        <div className="pwa-banner-icon">
          <img src="/icons/icon-192.png" alt="" width={42} height={42} />
        </div>
        <div className="pwa-banner-body">
          <p className="pwa-banner-title">Установить SoundLab на ПК</p>
          {iosSafari ? (
            <p className="pwa-banner-text">
              Установите на домашний экран: <strong>Поделиться</strong>{' '}
              <Share size={12} style={{ display: 'inline', verticalAlign: '-2px' }} />
              {' '}→ <strong>«На экран Домой»</strong>. Работает как обычное приложение.
            </p>
          ) : (
            <p className="pwa-banner-text">
              Поставьте как приложение: ярлык на рабочем столе и в «Пуск», отдельное окно без панели браузера.
            </p>
          )}
          <div className="pwa-banner-actions">
            <button type="button" className="pwa-banner-btn primary" onClick={() => void onInstall()}>
              <Download size={14} />
              {canNativeInstall ? 'Установить' : 'Как установить'}
            </button>
            <button type="button" className="pwa-banner-btn ghost" onClick={onDismiss}>
              Позже
            </button>
          </div>
        </div>
        <button type="button" className="pwa-banner-close" aria-label="Закрыть" onClick={onDismiss}>
          <X size={16} />
        </button>
      </div>
    </>
  );
}
