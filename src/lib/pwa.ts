export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'sl_pwa_install_dismissed_v1';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

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
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  };
  window.addEventListener('beforeinstallprompt', onBip);
  return () => window.removeEventListener('beforeinstallprompt', onBip);
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  await event.prompt();
  try {
    const choice = await event.userChoice;
    deferredPrompt = null;
    notify();
    markPwaDismissed();
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    notify();
    return 'unavailable';
  }
}
