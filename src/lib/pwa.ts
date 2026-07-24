export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Device-scoped (localStorage), not tied to account. */
const DISMISS_KEY = 'sl_pwa_install_dismissed_device_v1';
const INSTALLED_KEY = 'sl_pwa_installed_device_v1';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

type RelatedApp = { id?: string; platform?: string; url?: string };

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const ios =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

export function wasPwaDismissed(): boolean {
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

export function markPwaDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearPwaDismissed() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

export function markPwaInstalledOnDevice() {
  try {
    localStorage.setItem(INSTALLED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isPwaMarkedInstalledOnDevice(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Detect if SoundLab PWA is already installed on THIS device
 * (independent of which account is logged in).
 */
export async function detectPwaInstalledOnDevice(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (isPwaStandalone()) {
    markPwaInstalledOnDevice();
    return true;
  }

  if (isPwaMarkedInstalledOnDevice()) return true;

  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };

  if (typeof nav.getInstalledRelatedApps === 'function') {
    try {
      const apps = await nav.getInstalledRelatedApps();
      const hit = apps.some((app) => {
        if (app.platform && app.platform !== 'webapp') return false;
        const url = (app.url || app.id || '').toLowerCase();
        return (
          url.includes('soundlab-studio.ru') ||
          url.includes('manifest.webmanifest') ||
          url.includes('/manifest')
        );
      });
      if (hit) {
        markPwaInstalledOnDevice();
        return true;
      }
    } catch {
      /* API unsupported / permission */
    }
  }

  return false;
}

/** Shared deferred install event captured once for the whole app. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bindPwaInstallCapture() {
  if (typeof window === 'undefined') return () => undefined;

  const onBip = (event: Event) => {
    event.preventDefault();
    // Browser only fires this when NOT already installed
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  };

  const onInstalled = () => {
    deferredPrompt = null;
    markPwaInstalledOnDevice();
    notify();
  };

  window.addEventListener('beforeinstallprompt', onBip);
  window.addEventListener('appinstalled', onInstalled);

  if (isPwaStandalone()) {
    markPwaInstalledOnDevice();
  }

  return () => {
    window.removeEventListener('beforeinstallprompt', onBip);
    window.removeEventListener('appinstalled', onInstalled);
  };
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  await event.prompt();
  try {
    const choice = await event.userChoice;
    deferredPrompt = null;
    if (choice.outcome === 'accepted') {
      markPwaInstalledOnDevice();
    } else {
      markPwaDismissed();
    }
    notify();
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    notify();
    return 'unavailable';
  }
}
