// =====================================================
// CUSTOM SERVICE WORKER ADDITIONS
// Background sync and offline mutation handling
// This is merged into the next-pwa generated service worker
// =====================================================

// Background Sync tag names
const SYNC_TAG = 'trades-captain-sync';
const MUTATION_SYNC_TAG = 'trades-captain-mutations';

// IndexedDB configuration (must match lib/offline/indexeddb.ts)
const DB_NAME = 'trades-captain-offline';
const MUTATION_QUEUE_STORE = 'mutation_queue';

// API endpoints for mutations
const MUTATION_ENDPOINTS = {
  customers: '/api/customers',
  jobs: '/api/jobs',
  leads: '/api/leads',
  invoices: '/api/invoices',
};

// Register background sync when a mutation is queued
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUEUE_MUTATION') {
    // Request background sync
    if ('sync' in self.registration) {
      self.registration.sync.register(MUTATION_SYNC_TAG).catch((err) => {
        console.warn('[SW] Background sync registration failed:', err);
      });
    }
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === MUTATION_SYNC_TAG) {
    event.waitUntil(processMutationQueue());
  }

  if (event.tag === SYNC_TAG) {
    event.waitUntil(performFullSync());
  }
});

// Process pending mutations from IndexedDB
async function processMutationQueue() {
  console.log('[SW] Processing mutation queue...');

  try {
    const db = await openDatabase();
    const mutations = await getPendingMutations(db);

    console.log(`[SW] Found ${mutations.length} pending mutations`);

    for (const mutation of mutations) {
      try {
        await processSingleMutation(db, mutation);
        await removeMutation(db, mutation.id);
        console.log(`[SW] Mutation ${mutation.id} synced successfully`);
      } catch (error) {
        console.error(`[SW] Mutation ${mutation.id} failed:`, error);
        await updateMutationRetry(db, mutation.id);
      }
    }

    // Notify clients of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error('[SW] Mutation queue processing failed:', error);
    throw error; // Re-throw to trigger retry
  }
}

// Process a single mutation
async function processSingleMutation(db, mutation) {
  const endpoint = MUTATION_ENDPOINTS[mutation.storeName];
  if (!endpoint) {
    console.warn(`[SW] No endpoint for store: ${mutation.storeName}`);
    return;
  }

  // Clean payload (remove offline flags)
  const { _offline, _pending, ...cleanPayload } = mutation.payload;

  let response;

  switch (mutation.operation) {
    case 'create':
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });
      break;

    case 'update':
      response = await fetch(`${endpoint}/${mutation.entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });
      break;

    case 'delete':
      response = await fetch(`${endpoint}/${mutation.entityId}`, {
        method: 'DELETE',
      });
      break;

    default:
      throw new Error(`Unknown operation: ${mutation.operation}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

// Perform full sync of all data stores
async function performFullSync() {
  console.log('[SW] Performing full sync...');

  // Notify clients to refresh their data
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'FULL_SYNC_NEEDED',
      timestamp: new Date().toISOString(),
    });
  });
}

// IndexedDB helpers for service worker
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getPendingMutations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_QUEUE_STORE, 'readonly');
    const store = transaction.objectStore(MUTATION_QUEUE_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const mutations = request.result || [];
      // Filter to pending/failed with retries remaining
      const pending = mutations.filter(
        (m) => (m.status === 'pending' || m.status === 'failed') && m.retryCount < 5
      );
      // Sort by timestamp
      pending.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      resolve(pending);
    };
  });
}

function removeMutation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_QUEUE_STORE, 'readwrite');
    const store = transaction.objectStore(MUTATION_QUEUE_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function updateMutationRetry(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_QUEUE_STORE, 'readwrite');
    const store = transaction.objectStore(MUTATION_QUEUE_STORE);
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const mutation = getRequest.result;
      if (mutation) {
        mutation.retryCount = (mutation.retryCount || 0) + 1;
        mutation.status = 'failed';
        const putRequest = store.put(mutation);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'trades-captain-periodic') {
    event.waitUntil(performFullSync());
  }
});

console.log('[SW] Custom service worker loaded with offline sync support');
