// Custom worker code merged into the main Workbox SW by next-pwa.
// Handles Web Push events and local rest timer scheduling.

let cancelPending = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    if (cancelPending) {
      cancelPending();
      cancelPending = null;
    }

    const fireAt = event.data.fireAt;
    if (typeof fireAt !== 'number') return;

    const delayMs = Math.max(0, fireAt - Date.now());

    event.waitUntil(
      new Promise((resolve) => {
        const id = setTimeout(async () => {
          cancelPending = null;
          try {
            await self.registration.showNotification('Hvile ferdig!', {
              body: 'Tid for neste sett',
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-96x96.png',
              vibrate: [200, 100, 200],
              tag: 'rest-timer',
              renotify: true,
              requireInteraction: false,
              silent: false,
            });
          } catch (_) {}
          resolve();
        }, delayMs);

        cancelPending = () => {
          clearTimeout(id);
          resolve();
        };
      })
    );
  }

  if (event.data.type === 'CANCEL_NOTIFICATION') {
    if (cancelPending) {
      cancelPending();
      cancelPending = null;
    }
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'Hvile ferdig!', body: 'Tid for neste sett' };
  try {
    if (event.data) data = { ...data, ...JSON.parse(event.data.text()) };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'rest-timer',
      renotify: true,
      requireInteraction: false,
      silent: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
