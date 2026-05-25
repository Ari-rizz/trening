// Custom service worker for rest timer notifications
// This runs independently of the app and can fire notifications even when backgrounded.

let scheduledNotificationTimeout = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    // Cancel any previously scheduled notification
    if (scheduledNotificationTimeout !== null) {
      clearTimeout(scheduledNotificationTimeout);
      scheduledNotificationTimeout = null;
    }

    const delayMs = event.data.delayMs;
    if (typeof delayMs !== 'number' || delayMs <= 0) return;

    scheduledNotificationTimeout = setTimeout(async () => {
      scheduledNotificationTimeout = null;
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
        // Notification permission may have been revoked
      }
    }, delayMs);
  }

  if (event.data.type === 'CANCEL_NOTIFICATION') {
    if (scheduledNotificationTimeout !== null) {
      clearTimeout(scheduledNotificationTimeout);
      scheduledNotificationTimeout = null;
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
