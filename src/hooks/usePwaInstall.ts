import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  bindPwaInstallCapture,
  getDeferredInstallPrompt,
  isIosSafari,
  isPwaStandalone,
  promptPwaInstall,
  subscribeInstallPrompt,
  markPwaDismissed,
  clearPwaDismissed,
  wasPwaDismissed,
} from '../lib/pwa';

let captureBound = false;

function ensureCapture() {
  if (captureBound || typeof window === 'undefined') return;
  captureBound = true;
  bindPwaInstallCapture();
}

function useDeferredPrompt() {
  return useSyncExternalStore(
    subscribeInstallPrompt,
    () => getDeferredInstallPrompt(),
    () => null,
  );
}

export function usePwaInstall() {
  const deferred = useDeferredPrompt();
  const [standalone, setStandalone] = useState(() => isPwaStandalone());
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    ensureCapture();
    setStandalone(isPwaStandalone());
    setIosSafari(isIosSafari());
  }, []);

  const canNativeInstall = Boolean(deferred) && !standalone;
  const canShowIosTip = iosSafari && !standalone;

  return {
    standalone,
    iosSafari,
    canNativeInstall,
    canShowIosTip,
    /** Show install UI to educate users even when browser has no native prompt yet */
    canOfferInstall: !standalone,
    hasDeferred: Boolean(deferred),
    dismissed: wasPwaDismissed(),
    install: promptPwaInstall,
    dismiss: markPwaDismissed,
    clearDismiss: clearPwaDismissed,
  };
}
