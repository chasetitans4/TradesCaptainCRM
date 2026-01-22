// =====================================================
// INDEXEDDB STORAGE LAYER
// Client-side data persistence for offline access
// =====================================================

const DB_NAME = 'trades-captain-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  CUSTOMERS: 'customers',
  JOBS: 'jobs',
  LEADS: 'leads',
  INVOICES: 'invoices',
  SYNC_META: 'sync_meta',
  MUTATION_QUEUE: 'mutation_queue',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

// Sync metadata
export interface SyncMeta {
  storeName: string;
  lastSyncAt: string;
  version: number;
  itemCount: number;
}

// Mutation queue item
export interface QueuedMutation {
  id: string;
  storeName: StoreName;
  operation: 'create' | 'update' | 'delete';
  entityId?: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'succeeded';
  errorMessage?: string;
}

// Initialize IndexedDB
let dbInstance: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Customers store
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        customerStore.createIndex('business_id', 'business_id', { unique: false });
        customerStore.createIndex('updated_at', 'updated_at', { unique: false });
        customerStore.createIndex('name', 'name', { unique: false });
      }

      // Jobs store
      if (!db.objectStoreNames.contains(STORES.JOBS)) {
        const jobStore = db.createObjectStore(STORES.JOBS, { keyPath: 'id' });
        jobStore.createIndex('business_id', 'business_id', { unique: false });
        jobStore.createIndex('customer_id', 'customer_id', { unique: false });
        jobStore.createIndex('scheduled_date', 'scheduled_date', { unique: false });
        jobStore.createIndex('status', 'status', { unique: false });
        jobStore.createIndex('assigned_to', 'assigned_to', { unique: false });
      }

      // Leads store
      if (!db.objectStoreNames.contains(STORES.LEADS)) {
        const leadStore = db.createObjectStore(STORES.LEADS, { keyPath: 'id' });
        leadStore.createIndex('business_id', 'business_id', { unique: false });
        leadStore.createIndex('status', 'status', { unique: false });
        leadStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Invoices store
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
        invoiceStore.createIndex('business_id', 'business_id', { unique: false });
        invoiceStore.createIndex('customer_id', 'customer_id', { unique: false });
        invoiceStore.createIndex('status', 'status', { unique: false });
        invoiceStore.createIndex('due_date', 'due_date', { unique: false });
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'storeName' });
      }

      // Mutation queue store
      if (!db.objectStoreNames.contains(STORES.MUTATION_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.MUTATION_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('storeName', 'storeName', { unique: false });
      }
    };
  });
}

// Generic CRUD operations
export async function getItem<T>(storeName: StoreName, id: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(new Error(`Failed to get item from ${storeName}`));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllItems<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(new Error(`Failed to get all items from ${storeName}`));
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function getItemsByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(new Error(`Failed to query index ${indexName} in ${storeName}`));
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function putItem<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onerror = () => reject(new Error(`Failed to put item in ${storeName}`));
    request.onsuccess = () => resolve();
  });
}

export async function putItems<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.onerror = () => reject(new Error(`Failed to put items in ${storeName}`));
    transaction.oncomplete = () => resolve();

    for (const item of items) {
      store.put(item);
    }
  });
}

export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(new Error(`Failed to delete item from ${storeName}`));
    request.onsuccess = () => resolve();
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
    request.onsuccess = () => resolve();
  });
}

// Sync metadata operations
export async function getSyncMeta(storeName: StoreName): Promise<SyncMeta | null> {
  return getItem<SyncMeta>(STORES.SYNC_META, storeName);
}

export async function updateSyncMeta(storeName: StoreName, itemCount: number): Promise<void> {
  const meta: SyncMeta = {
    storeName,
    lastSyncAt: new Date().toISOString(),
    version: DB_VERSION,
    itemCount,
  };
  await putItem(STORES.SYNC_META, meta as any);
}

// Mutation queue operations
export async function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const queuedMutation: QueuedMutation = {
    ...mutation,
    id,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };
  await putItem(STORES.MUTATION_QUEUE, queuedMutation as any);
  return id;
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const all = await getAllItems<QueuedMutation>(STORES.MUTATION_QUEUE);
  return all
    .filter((m) => m.status === 'pending' || m.status === 'failed')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function updateMutationStatus(
  id: string,
  status: QueuedMutation['status'],
  errorMessage?: string
): Promise<void> {
  const mutation = await getItem<QueuedMutation>(STORES.MUTATION_QUEUE, id);
  if (mutation) {
    mutation.status = status;
    if (errorMessage) {
      mutation.errorMessage = errorMessage;
    }
    if (status === 'failed') {
      mutation.retryCount += 1;
    }
    await putItem(STORES.MUTATION_QUEUE, mutation as any);
  }
}

export async function removeMutation(id: string): Promise<void> {
  await deleteItem(STORES.MUTATION_QUEUE, id);
}

export async function clearSuccessfulMutations(): Promise<void> {
  const all = await getAllItems<QueuedMutation>(STORES.MUTATION_QUEUE);
  const succeeded = all.filter((m) => m.status === 'succeeded');
  for (const mutation of succeeded) {
    await deleteItem(STORES.MUTATION_QUEUE, mutation.id);
  }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

// Get database storage estimate
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}
