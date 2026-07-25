import { pushApi } from '../api/push';

const SUBSCRIBED_KEY = 'sl_web_push_endpoint_v1';
const DISMISS_KEY = 'sl_web_push_banner_dismissed_v1';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function supportsWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!supportsWebPush()) return 'unsupported';
  return Notification.permission;
}

export function wasPushBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPushBanner(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** True when we already synced an endpoint from this browser. */
export function hasLocalPushEndpoint(): boolean {
  try {
    return Boolean(localStorage.getItem(SUBSCRIBED_KEY));
  } catch {
    return false;
  }
}

async function waitForServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const ready = await navigator.serviceWorker.ready;
    return ready;
  } catch {
    return null;
  }
}

function toPayload(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} | null {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

/** Ask permission (if needed) and sync PushSubscription with the API. */
export async function ensureWebPushSubscription(): Promise<boolean> {
  if (!supportsWebPush()) return false;

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return false;

    const registration = await waitForServiceWorker();
    if (!registration?.pushManager) return false;

    const publicKey = await pushApi.getVapidPublicKey();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const payload = toPayload(subscription);
    if (!payload) return false;

    await pushApi.subscribe(payload);
    try {
      localStorage.setItem(SUBSCRIBED_KEY, payload.endpoint);
    } catch {
      /* ignore */
    }
    return true;
  } catch (error) {
    console.warn('Web Push subscribe failed:', error);
    return false;
  }
}

/** Remove server-side subscription for this browser (on logout). */
export async function disableWebPushSubscription(): Promise<void> {
  if (!supportsWebPush()) return;
  try {
    const registration = await waitForServiceWorker();
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint || localStorage.getItem(SUBSCRIBED_KEY) || undefined;
    if (endpoint) {
      await pushApi.unsubscribe(endpoint).catch(() => undefined);
    }
    await subscription?.unsubscribe().catch(() => undefined);
    localStorage.removeItem(SUBSCRIBED_KEY);
  } catch {
    /* ignore */
  }
}
