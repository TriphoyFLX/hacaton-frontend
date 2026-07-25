/**
 * Keep installed PWA / service worker on the latest deploy.
 * Android background timers are unreliable — also ping on focus/visibility.
 */

type RegistrationLike = ServiceWorkerRegistration & {
  update: () => Promise<ServiceWorkerRegistration>;
};

let started = false;
let refreshing = false;

function ping(registration: RegistrationLike) {
  void registration.update().catch(() => {
    /* offline / blocked — ignore */
  });
}

function activateWaiting(registration: RegistrationLike) {
  const waiting = registration.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function startPwaAutoUpdate(
  registration: ServiceWorkerRegistration | undefined,
): void {
  if (!registration || started) return;
  started = true;

  const reg = registration as RegistrationLike;

  // If an update was already installed but stuck waiting, activate it now.
  activateWaiting(reg);

  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') {
        activateWaiting(reg);
      }
    });
  });

  const onVisible = () => {
    if (document.visibilityState === 'visible') ping(reg);
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', () => ping(reg));
  window.addEventListener('online', () => ping(reg));
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) ping(reg);
  });

  // Foreground poll — background timers often freeze on mobile PWAs
  window.setInterval(() => {
    if (document.visibilityState === 'visible') ping(reg);
  }, 60 * 1000);

  // First checks soon after launch (covers cold start from home screen)
  window.setTimeout(() => ping(reg), 3_000);
  window.setTimeout(() => ping(reg), 15_000);
}

/** Reload once when the new SW takes control. */
export function bindPwaControllerReload(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
