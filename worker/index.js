// Custom worker code merged into the main Workbox SW by next-pwa.
// Handles local rest timer notification scheduling.

let scheduledFireAt = null;
let cancelPending = null;

// Keeps the SW alive by chaining short-lived promises until fireAt is reached.
function waitUntilFireAt(fireAt, event) {
  const tick = () => {
    const now = Date.now();
    if (scheduledFireAt !== fireAt) {
      // Cancelled or replaced
      return Promise.resolve();
    }
    if (now >= fireAt) {
      return self.registration.showNotification('Hvile ferdig!', {
        body: 'Tid for neste sett',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [200, 100, 200],
        tag: 'rest-timer',
        renotify: true,
        requireInteraction: false,
        silent: false,
      }).catch(() => {});
    }
    // Sleep for up to 10s chunks to stay alive, then check again
    const sleepMs = Math.min(10000, fireAt - now);
    return new Promise(resolve => setTimeout(resolve, sleepMs)).then(tick);
  };

  event.waitUntil(tick());
}

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const fireAt = event.data.fireAt;
    if (typeof fireAt !== 'number') return;
    scheduledFireAt = fireAt;
    waitUntilFireAt(fireAt, event);
  }

  if (event.data.type === 'CANCEL_NOTIFICATION') {
    scheduledFireAt = null;
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
