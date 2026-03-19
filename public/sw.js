// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event.data);

  if (!event.data) {
    console.error('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/notification-icon.png',
      badge: data.badge || '/icons/notification-badge.png',
      tag: data.tag || 'notification',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', options)
    );
  } catch (error) {
    console.error('Error processing push event:', error);
    // Try to show a basic notification if JSON parsing fails
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: event.data.text ? event.data.text() : 'You have a new notification',
        icon: '/icons/notification-icon.png'
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  const data = event.notification.data || {};
  const notificationUrl = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab with the target URL open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === notificationUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(notificationUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/sync')
        .then((response) => response.json())
        .then((data) => {
          console.log('Synced notifications:', data);
        })
        .catch((error) => {
          console.error('Error syncing notifications:', error);
        })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic sync for checking new notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(
      fetch('/api/notifications/check')
        .then((response) => response.json())
        .then((data) => {
          if (data.newNotifications && data.newNotifications.length > 0) {
            console.log('New notifications found:', data.newNotifications);
          }
        })
        .catch((error) => {
          console.error('Error checking notifications:', error);
        })
    );
  }
});

// Cleanup on worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Log install
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});
