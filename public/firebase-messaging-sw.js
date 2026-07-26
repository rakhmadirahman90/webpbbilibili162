// Service Worker for PB Bilibili 162 Real-time Push Notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push event received.');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'PB Bilibili 162', body: event.data.text() };
    }
  }

  const title = data.title || (data.notification && data.notification.title) || 'PB Bilibili 162';
  const body = data.body || (data.notification && data.notification.body) || 'Pemberitahuan terbaru!';
  const icon = data.icon || (data.notification && data.notification.icon) || '/favicon.ico';

  const options = {
    body: body,
    icon: icon,
    badge: icon,
    vibrate: [100, 50, 100],
    data: data.data || data,
    actions: [
      { action: 'open', title: 'Buka Aplikasi' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(windowClients) {
        // Check if there is already a window open, if so focus it
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
