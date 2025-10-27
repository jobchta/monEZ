const CACHE_NAME = "monez-v1.2";
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/variables.css',
  '/styles/main.css',
  '/styles/components.css',
  '/js/app.js',
  '/js/firebase.js',
  '/js/utils.js',
  '/js/render.js',
  '/js/views.js',
  '/js/offline-sync.js',
  '/js/push-notifications.js',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache all files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Cache addAll failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response and cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline fallback if available
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background Sync event - sync offline queue
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const db = await openDB();
    const actions = await getAllActions(db);
    
    for (const action of actions) {
      try {
        await executeAction(action);
        await removeAction(db, action.id);
        
        // Notify user of successful sync
        self.registration.showNotification('Sync Complete', {
          body: `${action.type} synced successfully`,
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('monEZ-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readonly');
    const store = transaction.objectStore('sync-queue');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removeAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function executeAction(action) {
  const response = await fetch(action.data.url, {
    method: action.data.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action.data.body)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to execute action: ${action.type}`);
  }
  
  return await response.json();
}

// Push notification event handlers
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'monEZ Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    tag: data.tag || 'monez-notification',
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
