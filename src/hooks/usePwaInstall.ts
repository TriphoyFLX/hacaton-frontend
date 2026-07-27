import { useEffect, useState } from 'react';
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

/**
 * PWA install state. Uses a simple subscribe + tick (not useSyncExternalStore)
 * to avoid React #185 infinite loops from unstable snapshot object identities.
 */
export function usePwaInstall() {
  const [tick, setTick] = useState(0);
  const [iosSafari, setIosSafari] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureCapture();
    setIosSafari(isIosSafari());

    const unsub = subscribeInstallPrompt(() => {
      setTick((n) => n + 1);
    });

    let cancelled = false;
    void detectPwaInstalledOnDevice().then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  // Re-read after tick / ready changes
  void tick;
  const snap = getPwaInstallSnapshot();
  const deferred = getDeferredInstallPrompt();

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
    /**
     * Offer install only when we can actually install (native prompt) or iOS Safari tip.
     * Never show a CTA that only opens an instruction alert on desktop/Android.
     */
    canOfferInstall: !hideInstallUi && (canNativeInstall || canShowIosTip),
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
