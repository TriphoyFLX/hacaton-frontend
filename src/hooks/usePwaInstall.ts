import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  bindPwaInstallCapture,
  getDeferredInstallPrompt,
  getPwaInstallSnapshot,
  isIosSafari,
  promptPwaInstall,
  subscribeInstallPrompt,
  markPwaDismissed,
  clearPwaDismissed,
  detectPwaInstalledOnDevice,
  clearPwaUninstallFeedbackPending,
} from '../lib/pwa';

let captureBound = false;

function ensureCapture() {
  if (captureBound || typeof window === 'undefined') return;
  captureBound = true;
  bindPwaInstallCapture();
}

function useInstallSnapshot() {
  return useSyncExternalStore(
    subscribeInstallPrompt,
    getPwaInstallSnapshot,
    () => ({
      standalone: false,
      installedOnDevice: false,
      hideInstallUi: false,
      hasDeferred: false,
      uninstallFeedbackPending: false,
      dismissed: false,
    }),
  );
}

function useDeferredPrompt() {
  return useSyncExternalStore(
    subscribeInstallPrompt,
    () => getDeferredInstallPrompt(),
    () => null,
  );
}

export function usePwaInstall() {
  const snap = useInstallSnapshot();
  const deferred = useDeferredPrompt();
  const [iosSafari, setIosSafari] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureCapture();
    setIosSafari(isIosSafari());

    let cancelled = false;
    void detectPwaInstalledOnDevice().then(() => {
      if (cancelled) return;
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hideInstallUi = snap.hideInstallUi;
  const canNativeInstall = Boolean(deferred) && !hideInstallUi;
  const canShowIosTip = iosSafari && !hideInstallUi;

  return {
    ready,
    standalone: snap.standalone,
    installedOnDevice: snap.installedOnDevice,
    uninstallFeedbackPending: snap.uninstallFeedbackPending,
    iosSafari,
    canNativeInstall,
    canShowIosTip,
    /** Show install blocks only when SoundLab is NOT installed on this device. */
    canOfferInstall: !hideInstallUi,
    hasDeferred: Boolean(deferred),
    dismissed: snap.dismissed,
    install: promptPwaInstall,
    dismiss: markPwaDismissed,
    clearDismiss: clearPwaDismissed,
    clearUninstallFeedback: () => {
      clearPwaUninstallFeedbackPending();
    },
  };
}
