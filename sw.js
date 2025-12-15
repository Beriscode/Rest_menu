
const CACHE_NAME = 'irsw-v6-robust';
const DB_NAME = 'IRSW_OFFLINE_DB';
const STORE_NAME = 'offline_orders';

let isSyncing = false;

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js'
];

/**
 * Initializes/Opens the atomic storage node
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
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
 * Persists order payload to local cache
 */
async function saveOrderLocally(orderData) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Attach a local receipt timestamp for sync ordering
      store.add({ data: orderData, timestamp: Date.now(), synced: false });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error("[SW] Queue buffering failure:", err);
    throw err;
  }
}

/**
 * Retrieves un-synchronized orders from storage
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
  } catch (err) {
    return [];
  }
}

/**
 * Purges sync queue after successful transmission
 */
async function clearQueuedOrders() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    return new Promise(r => tx.oncomplete = r);
  } catch (err) {
    console.error("[SW] Queue purge failure:", err);
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(c => {
    return Promise.all(STATIC_ASSETS.map(u => c.add(new Request(u, { mode: 'no-cors' })).catch(() => {})));
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Order Syncing Node
  if (url.pathname.includes('/api/sync-order') && request.method === 'POST') {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        try {
          const body = await request.clone().json();
          await saveOrderLocally(body);
          return new Response(JSON.stringify({ offline: true, buffered: true }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Storage failure' }), { status: 500 });
        }
      })
    );
    return;
  }

  // Static Assets Fallback
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const networked = fetch(request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || networked;
    })
  );
});

/**
 * Background Sync Simulation Node
 */
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC' && !isSyncing) {
    isSyncing = true;
    try {
      const queued = await getQueuedOrders();
      if (queued.length > 0) {
        const clients = await self.clients.matchAll();
        // Disseminate payload to active clients for UI reconciliation
        clients.forEach(c => c.postMessage({ 
          type: 'SYNC_ORDERS', 
          orders: queued.map(q => q.data),
          count: queued.length
        }));
        await clearQueuedOrders();
        console.log(`[SW] Atomic flush complete: ${queued.length} items.`);
      }
    } catch (err) {
      console.error("[SW] Sync protocol error:", err);
    } finally {
      isSyncing = false;
    }
  }
});
