/* SoundLab Web Push handlers — imported by Workbox-generated SW */

// Allow the page to activate a waiting worker immediately after a deploy.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * API must never be cached. Handle /api/* ourselves so a failed fetch returns
 * a real 503 Response instead of Workbox throwing uncaught `no-response`.
 * (Registered before Workbox routes via importScripts.)
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() =>
        new Response(JSON.stringify({ error: 'network_unavailable' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }),
      ),
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'SoundLab',
    body: 'У вас новое уведомление',
    url: '/',
    tag: 'soundlab',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  const options = {
    body: data.body || 'У вас новое уведомление',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.tag || 'soundlab',
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'SoundLab', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && client.url !== absoluteUrl) {
            try {
              await client.navigate(absoluteUrl);
            } catch {
              /* ignore navigate errors */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl);
      }
    })(),
  );
});
