
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
 * Initializes/Opens IndexedDB for offline storage with error handling.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Saves a failed order request to the local database.
 */
async function saveOrderLocally(orderData) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add({ data: orderData, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("[SW] Database save failure:", e);
    throw e;
  }
}

/**
 * Retrieves all orders currently in the offline queue.
 */
async function getQueuedOrders() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Purges the offline queue after successful sync.
 */
async function clearQueuedOrders() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
    });
  } catch (e) {
    console.error("[SW] Database clear failure:", e);
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map(url => 
          cache.add(new Request(url, { mode: 'no-cors' })).catch(err => console.debug(`[SW] Cache skip: ${url}`))
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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Specialized offline handling for order synchronization
  if (url.pathname.includes('/api/sync-order') && request.method === 'POST') {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        try {
          const orderData = await request.clone().json();
          await saveOrderLocally(orderData);
          return new Response(JSON.stringify({ offline: true, buffered: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Buffer failure' }), { status: 500 });
        }
      })
    );
    return;
  }

  // Generic asset caching (Stale-While-Revalidate)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

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

self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    const queued = await getQueuedOrders();
    if (queued.length > 0) {
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_ORDERS',
          orders: queued.map(q => q.data)
        });
      });
      await clearQueuedOrders();
    }
  }
});
