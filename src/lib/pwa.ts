export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Device-scoped (localStorage), not tied to account. */
const DISMISS_KEY = 'sl_pwa_install_dismissed_device_v1';
const INSTALLED_KEY = 'sl_pwa_installed_device_v1';
const UNINSTALL_FEEDBACK_KEY = 'sl_pwa_uninstall_feedback_pending_v1';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

type RelatedApp = { id?: string; platform?: string; url?: string };

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True when SoundLab runs as an installed app window (not a browser tab). */
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const modes = [
    '(display-mode: standalone)',
    '(display-mode: window-controls-overlay)',
    '(display-mode: minimal-ui)',
    '(display-mode: fullscreen)',
  ];
  if (modes.some((q) => window.matchMedia(q).matches)) return true;
  return (
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
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
  notify();
}

export function clearPwaDismissed() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function markPwaInstalledOnDevice() {
  try {
    localStorage.setItem(INSTALLED_KEY, '1');
    localStorage.removeItem(UNINSTALL_FEEDBACK_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function clearPwaInstalledOnDevice() {
  try {
    localStorage.removeItem(INSTALLED_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function isPwaMarkedInstalledOnDevice(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPwaUninstallFeedbackPending() {
  try {
    localStorage.setItem(UNINSTALL_FEEDBACK_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isPwaUninstallFeedbackPending(): boolean {
  try {
    return localStorage.getItem(UNINSTALL_FEEDBACK_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPwaUninstallFeedbackPending() {
  try {
    localStorage.removeItem(UNINSTALL_FEEDBACK_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

function isSoundLabRelatedApp(app: RelatedApp): boolean {
  if (app.platform && app.platform !== 'webapp') return false;
  const url = (app.url || app.id || '').toLowerCase();
  if (!url) {
    // Some Chromium builds only return platform for the current origin's PWA
    return app.platform === 'webapp';
  }
  const origin =
    typeof window !== 'undefined' ? window.location.origin.toLowerCase() : '';
  return (
    url.includes('soundlab-studio.ru') ||
    url.includes('manifest.webmanifest') ||
    url.includes('/manifest') ||
    (origin.length > 0 && url.startsWith(origin))
  );
}

/**
 * Detect if SoundLab PWA is already installed on THIS device.
 * Uninstall is only confirmed via beforeinstallprompt (reliable Chromium signal).
 */
export async function detectPwaInstalledOnDevice(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (isPwaStandalone()) {
    markPwaInstalledOnDevice();
    return true;
  }

  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };

  if (typeof nav.getInstalledRelatedApps === 'function') {
    try {
      const apps = await nav.getInstalledRelatedApps();
      if (apps.some(isSoundLabRelatedApp)) {
        markPwaInstalledOnDevice();
        return true;
      }
      // Empty / no match is NOT proof of uninstall — API is flaky across browsers.
      // Uninstall is handled only when beforeinstallprompt fires.
    } catch {
      /* API unsupported / permission */
    }
  }

  return isPwaMarkedInstalledOnDevice();
}

/** Called when we detect uninstall on this device (not account-scoped). */
export function handlePwaUninstalledOnDevice() {
  const wasInstalled = isPwaMarkedInstalledOnDevice();
  try {
    localStorage.removeItem(INSTALLED_KEY);
    localStorage.removeItem(DISMISS_KEY);
    if (wasInstalled) {
      localStorage.setItem(UNINSTALL_FEEDBACK_KEY, '1');
    }
  } catch {
    /* ignore */
  }
  notify();
}

/** Shared deferred install event captured once for the whole app. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function bindPwaInstallCapture() {
  if (typeof window === 'undefined') return () => undefined;

  const onBip = (event: Event) => {
    event.preventDefault();
    // Browser only fires this when NOT already installed → treat as uninstall if we had a flag
    if (isPwaMarkedInstalledOnDevice()) {
      handlePwaUninstalledOnDevice();
    }
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  };

  const onInstalled = () => {
    deferredPrompt = null;
    markPwaInstalledOnDevice();
  };

  window.addEventListener('beforeinstallprompt', onBip);
  window.addEventListener('appinstalled', onInstalled);

  if (isPwaStandalone()) {
    markPwaInstalledOnDevice();
  }

  // Re-check when user returns to the tab (e.g. after installing from OS UI)
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    void detectPwaInstalledOnDevice();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);

  const mediaQueries = [
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: window-controls-overlay)'),
  ];
  const onDisplayMode = () => {
    if (isPwaStandalone()) markPwaInstalledOnDevice();
    notify();
  };
  mediaQueries.forEach((mq) => {
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onDisplayMode);
    else mq.addListener(onDisplayMode);
  });

  void detectPwaInstalledOnDevice();

  return () => {
    window.removeEventListener('beforeinstallprompt', onBip);
    window.removeEventListener('appinstalled', onInstalled);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    mediaQueries.forEach((mq) => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onDisplayMode);
      else mq.removeListener(onDisplayMode);
    });
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

/** Single source of truth for install UI across Header / Sidebar / Dashboard / Landing. */
export function getPwaInstallSnapshot() {
  const standalone = isPwaStandalone();
  const installedOnDevice = standalone || isPwaMarkedInstalledOnDevice();
  return {
    standalone,
    installedOnDevice,
    hideInstallUi: installedOnDevice,
    hasDeferred: Boolean(deferredPrompt),
    uninstallFeedbackPending: isPwaUninstallFeedbackPending(),
    dismissed: wasPwaDismissed(),
  };
}
