
const CACHE_NAME = 'irsw-v4-ultra';
const DB_NAME = 'IRSW_OFFLINE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_orders';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js'
];

/**
 * Initializes/Opens IndexedDB for offline storage
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a failed order request to the local database
 */
async function saveOrderLocally(orderData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ data: orderData, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all orders currently in the offline queue
 */
async function getQueuedOrders() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Purges the offline queue after successful sync
 */
async function clearQueuedOrders() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map(url => 
          cache.add(new Request(url, { mode: 'no-cors' })).catch(err => console.warn(`[SW] Pre-cache skip: ${url}`, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Interceptor for Offline Resilience
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Specialized handling for order synchronization endpoint
  if (url.pathname.includes('/api/sync-order') && request.method === 'POST') {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        // Intercept failed network requests for orders
        try {
          const orderData = await request.clone().json();
          await saveOrderLocally(orderData);
          return new Response(JSON.stringify({ offline: true, message: 'Signal buffered locally' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Failed to buffer order' }), { status: 500 });
        }
      })
    );
    return;
  }

  // Generic asset caching (Stale-While-Revalidate pattern)
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      
      return cachedResponse || fetchPromise;
    })
  );
});

// Background Synchronization messaging
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    const queued = await getQueuedOrders();
    if (queued.length > 0) {
      // Broadcast synchronization signals to all active client instances
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_ORDERS',
          orders: queued.map(q => q.data)
        });
      });
      // Flush database after dispatching sync signals
      await clearQueuedOrders();
    }
  }
});
