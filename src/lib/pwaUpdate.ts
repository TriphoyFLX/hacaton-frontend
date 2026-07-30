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

  // Do not interrupt cold start: activate a waiting worker after first paint/interaction window.
  window.setTimeout(() => activateWaiting(reg), 8_000);

  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') {
        window.setTimeout(() => activateWaiting(reg), 2_000);
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
  }, 5 * 60 * 1000);

  // First checks after launch, but not during the critical startup window.
  window.setTimeout(() => ping(reg), 20_000);
  window.setTimeout(() => ping(reg), 2 * 60_000);
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
