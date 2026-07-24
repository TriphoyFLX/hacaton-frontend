import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'sl_pwa_install_dismissed_v1';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const ios = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

function wasDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

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
 * Native install prompt (Android/Chrome) + iOS Safari “Add to Home Screen” tip.
 */
export default function PwaInstallBanner() {
  const location = useLocation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  const immersive =
    location.pathname === '/soundtok' ||
    location.pathname === '/midi' ||
    location.pathname === '/studio' ||
    (location.pathname.startsWith('/chats/') && location.pathname !== '/chats');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone() || wasDismissed()) return;

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setIosTip(false);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);

    // iOS has no beforeinstallprompt — show Share tip after a short delay
    const timer = window.setTimeout(() => {
      if (!isStandalone() && !wasDismissed() && isIosSafari()) {
        setIosTip(true);
        setVisible(true);
      }
    }, 4500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    markDismissed();
    setVisible(false);
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
    markDismissed();
  };

  if (!visible || immersive) return null;

  return (
    <>
      <style>{css}</style>
      <div className="pwa-banner" role="dialog" aria-label="Установить SoundLab">
        <div className="pwa-banner-icon">
          <img src="/icons/icon-192.png" alt="" width={42} height={42} />
        </div>
        <div className="pwa-banner-body">
          <p className="pwa-banner-title">Установить SoundLab</p>
          {iosTip ? (
            <p className="pwa-banner-text">
              Нажмите <strong>Поделиться</strong> <Share size={12} style={{ display: 'inline', verticalAlign: '-2px' }} />
              {' '}и выберите <strong>«На экран Домой»</strong> — приложение откроется как нативное.
            </p>
          ) : (
            <p className="pwa-banner-text">
              Добавьте на домашний экран: быстрее запуск, полноэкранный режим и удобнее на телефоне.
            </p>
          )}
          <div className="pwa-banner-actions">
            {!iosTip && deferred && (
              <button type="button" className="pwa-banner-btn primary" onClick={() => void install()}>
                <Download size={14} />
                Установить
              </button>
            )}
            <button type="button" className="pwa-banner-btn ghost" onClick={dismiss}>
              Позже
            </button>
          </div>
        </div>
        <button type="button" className="pwa-banner-close" aria-label="Закрыть" onClick={dismiss}>
          <X size={16} />
        </button>
      </div>
    </>
  );
}
