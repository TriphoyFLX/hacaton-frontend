/* SoundLab Web Push handlers — imported by Workbox-generated SW */

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
