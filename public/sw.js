self.addEventListener('push', function(event) {
  let data = { title: 'Rekbrio', body: 'Ada aktivitas baru di akun Anda.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Rekbrio', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png', // Fallback, would need actual icon path
    badge: '/logo.png',
    data: data.link || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Lihat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
