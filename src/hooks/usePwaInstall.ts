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
  detectPwaInstalledOnDevice,
  isPwaMarkedInstalledOnDevice,
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
  const [installedOnDevice, setInstalledOnDevice] = useState(() =>
    isPwaStandalone() || isPwaMarkedInstalledOnDevice(),
  );
  const [iosSafari, setIosSafari] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureCapture();
    setStandalone(isPwaStandalone());
    setIosSafari(isIosSafari());

    let cancelled = false;
    void detectPwaInstalledOnDevice().then((installed) => {
      if (cancelled) return;
      setInstalledOnDevice(installed);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // If browser later reports install event / clears deferred after install
  useEffect(() => {
    if (!deferred && isPwaMarkedInstalledOnDevice()) {
      setInstalledOnDevice(true);
    }
  }, [deferred]);

  const hideInstallUi = standalone || installedOnDevice;
  const canNativeInstall = Boolean(deferred) && !hideInstallUi;
  const canShowIosTip = iosSafari && !hideInstallUi;

  return {
    ready,
    standalone,
    installedOnDevice,
    iosSafari,
    canNativeInstall,
    canShowIosTip,
    /** Offer install only if this device does not already have the app */
    canOfferInstall: !hideInstallUi,
    hasDeferred: Boolean(deferred),
    dismissed: wasPwaDismissed(),
    install: promptPwaInstall,
    dismiss: markPwaDismissed,
    clearDismiss: clearPwaDismissed,
  };
}
