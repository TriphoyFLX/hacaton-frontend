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
  isPwaUninstallFeedbackPending,
  clearPwaUninstallFeedbackPending,
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
  const [uninstallFeedbackPending, setUninstallFeedbackPending] = useState(() =>
    isPwaUninstallFeedbackPending(),
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
      setUninstallFeedbackPending(isPwaUninstallFeedbackPending());
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeInstallPrompt(() => {
      setInstalledOnDevice(isPwaStandalone() || isPwaMarkedInstalledOnDevice());
      setUninstallFeedbackPending(isPwaUninstallFeedbackPending());
    });
  }, []);

  useEffect(() => {
    if (!deferred && isPwaMarkedInstalledOnDevice()) {
      setInstalledOnDevice(true);
    }
    if (deferred && !isPwaMarkedInstalledOnDevice()) {
      setInstalledOnDevice(false);
    }
  }, [deferred]);

  const hideInstallUi = standalone || installedOnDevice;
  const canNativeInstall = Boolean(deferred) && !hideInstallUi;
  const canShowIosTip = iosSafari && !hideInstallUi;

  return {
    ready,
    standalone,
    installedOnDevice,
    uninstallFeedbackPending,
    iosSafari,
    canNativeInstall,
    canShowIosTip,
    canOfferInstall: !hideInstallUi,
    hasDeferred: Boolean(deferred),
    dismissed: wasPwaDismissed(),
    install: promptPwaInstall,
    dismiss: markPwaDismissed,
    clearDismiss: clearPwaDismissed,
    clearUninstallFeedback: () => {
      clearPwaUninstallFeedbackPending();
      setUninstallFeedbackPending(false);
    },
  };
}
