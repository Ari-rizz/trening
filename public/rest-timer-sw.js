// Custom service worker for rest timer notifications
// Uses event.waitUntil to keep the SW alive until the notification fires.

let cancelPending = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    // Cancel any previously pending notification
    if (cancelPending) {
      cancelPending();
      cancelPending = null;
    }

    const fireAt = event.data.fireAt; // absolute ms timestamp
    if (typeof fireAt !== 'number') return;

    const delayMs = Math.max(0, fireAt - Date.now());

    // event.waitUntil keeps the SW alive until the promise settles
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
          } catch (_) {
            // Permission may have been revoked
          }
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
