// =====================================================
// SYNC ENGINE
// Handles data synchronization between client and server
// Includes conflict resolution and delta sync
// =====================================================

import {
  STORES,
  StoreName,
  getAllItems,
  putItems,
  getSyncMeta,
  updateSyncMeta,
  clearStore,
  isIndexedDBAvailable,
} from './indexeddb';
import { processMutationQueue, getPendingMutationCount } from './mutation-queue';

// Sync configuration
export interface SyncConfig {
  // Stores to sync
  stores: StoreName[];
  // Sync interval in ms (default: 5 minutes)
  syncInterval?: number;
  // Conflict resolution strategy
  conflictStrategy?: 'server-wins' | 'client-wins' | 'latest-wins';
  // Maximum items per sync batch
  batchSize?: number;
}

const DEFAULT_CONFIG: Required<SyncConfig> = {
  stores: [STORES.CUSTOMERS, STORES.JOBS, STORES.LEADS, STORES.INVOICES],
  syncInterval: 5 * 60 * 1000,
  conflictStrategy: 'latest-wins',
  batchSize: 100,
};

// Store-specific API endpoints
const SYNC_ENDPOINTS: Partial<Record<StoreName, string>> = {
  [STORES.CUSTOMERS]: '/api/customers',
  [STORES.JOBS]: '/api/jobs',
  [STORES.LEADS]: '/api/leads',
  [STORES.INVOICES]: '/api/invoices',
};

// Sync status
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingMutations: number;
  syncError: string | null;
  storeStatuses: Record<string, {
    lastSyncAt: string | null;
    itemCount: number;
    status: 'synced' | 'syncing' | 'stale' | 'error';
  }>;
}

// Global sync state
let syncStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncAt: null,
  pendingMutations: 0,
  syncError: null,
  storeStatuses: {},
};

let syncInterval: NodeJS.Timeout | null = null;
const statusListeners: Set<(status: SyncStatus) => void> = new Set();

/**
 * Subscribe to sync status updates
 */
export function subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
  statusListeners.add(callback);
  callback(syncStatus); // Immediate callback with current status
  return () => statusListeners.delete(callback);
}

function updateStatus(updates: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...updates };
  statusListeners.forEach((cb) => cb(syncStatus));
}

/**
 * Initialize the sync engine
 */
export async function initializeSyncEngine(config: Partial<SyncConfig> = {}): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!isIndexedDBAvailable()) {
    console.warn('[SyncEngine] IndexedDB not available, sync disabled');
    return;
  }

  // Set up online/offline listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Load initial sync metadata
  for (const storeName of finalConfig.stores) {
    const meta = await getSyncMeta(storeName);
    syncStatus.storeStatuses[storeName] = {
      lastSyncAt: meta?.lastSyncAt || null,
      itemCount: meta?.itemCount || 0,
      status: meta ? 'synced' : 'stale',
    };
  }

  // Initial sync if online
  if (navigator.onLine) {
    await fullSync(finalConfig);
  }

  // Set up periodic sync
  if (finalConfig.syncInterval > 0) {
    syncInterval = setInterval(() => {
      if (navigator.onLine && !syncStatus.isSyncing) {
        fullSync(finalConfig).catch(console.error);
      }
    }, finalConfig.syncInterval);
  }

  // Update pending mutations count
  const pendingCount = await getPendingMutationCount();
  updateStatus({ pendingMutations: pendingCount });
}

/**
 * Stop the sync engine
 */
export function stopSyncEngine(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
}

/**
 * Handle coming online
 */
async function handleOnline(): Promise<void> {
  console.log('[SyncEngine] Online');
  updateStatus({ isOnline: true });

  // Process pending mutations first
  await processMutationQueue();

  // Then sync data from server
  await fullSync(DEFAULT_CONFIG);
}

/**
 * Handle going offline
 */
function handleOffline(): void {
  console.log('[SyncEngine] Offline');
  updateStatus({ isOnline: false });
}

/**
 * Full sync - fetch all data from server
 */
export async function fullSync(config: SyncConfig = DEFAULT_CONFIG): Promise<void> {
  if (!isIndexedDBAvailable() || !navigator.onLine) {
    return;
  }

  if (syncStatus.isSyncing) {
    console.log('[SyncEngine] Sync already in progress');
    return;
  }

  updateStatus({ isSyncing: true, syncError: null });

  try {
    for (const storeName of config.stores) {
      await syncStore(storeName, config);
    }

    const pendingCount = await getPendingMutationCount();
    updateStatus({
      isSyncing: false,
      lastSyncAt: new Date().toISOString(),
      pendingMutations: pendingCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Sync failed';
    console.error('[SyncEngine] Sync error:', errorMessage);
    updateStatus({
      isSyncing: false,
      syncError: errorMessage,
    });
  }
}

/**
 * Sync a single store
 */
async function syncStore(storeName: StoreName, config: SyncConfig): Promise<void> {
  const endpoint = SYNC_ENDPOINTS[storeName];
  if (!endpoint) {
    return;
  }

  // Update store status
  syncStatus.storeStatuses[storeName] = {
    ...syncStatus.storeStatuses[storeName],
    status: 'syncing',
  };
  statusListeners.forEach((cb) => cb(syncStatus));

  try {
    // Get last sync time for delta sync
    const meta = await getSyncMeta(storeName);
    const lastSyncAt = meta?.lastSyncAt;

    // Build URL with delta sync parameter if available
    let url = endpoint;
    if (lastSyncAt) {
      url += `?updated_after=${encodeURIComponent(lastSyncAt)}`;
    }

    // Fetch data from server
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Handle different response formats
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items) {
      items = data.items;
    } else if (data.data) {
      items = data.data;
    } else if (data[storeName]) {
      items = data[storeName];
    }

    // If this is a full sync (no lastSyncAt), clear the store first
    if (!lastSyncAt && items.length > 0) {
      await clearStore(storeName);
    }

    // Store items locally
    if (items.length > 0) {
      await putItems(storeName, items);
    }

    // Update sync metadata
    const allItems = await getAllItems(storeName);
    await updateSyncMeta(storeName, allItems.length);

    // Update store status
    syncStatus.storeStatuses[storeName] = {
      lastSyncAt: new Date().toISOString(),
      itemCount: allItems.length,
      status: 'synced',
    };
    statusListeners.forEach((cb) => cb(syncStatus));

    console.log(`[SyncEngine] Synced ${storeName}: ${items.length} items`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SyncEngine] Failed to sync ${storeName}:`, errorMessage);

    syncStatus.storeStatuses[storeName] = {
      ...syncStatus.storeStatuses[storeName],
      status: 'error',
    };
    statusListeners.forEach((cb) => cb(syncStatus));

    throw error;
  }
}

/**
 * Force sync a specific store
 */
export async function forceSync(storeName: StoreName): Promise<void> {
  // Clear sync metadata to force full refresh
  await updateSyncMeta(storeName, 0);
  await syncStore(storeName, DEFAULT_CONFIG);
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Resolve a conflict manually
 */
export async function resolveConflict<T extends { id: string; updated_at?: string }>(
  storeName: StoreName,
  localItem: T,
  serverItem: T,
  resolution: 'keep-local' | 'keep-server' | 'merge'
): Promise<T> {
  let resolvedItem: T;

  switch (resolution) {
    case 'keep-local':
      resolvedItem = localItem;
      break;

    case 'keep-server':
      resolvedItem = serverItem;
      break;

    case 'merge':
      // Simple merge: server wins for same fields, keep local additions
      resolvedItem = {
        ...localItem,
        ...serverItem,
        updated_at: new Date().toISOString(),
      };
      break;

    default:
      resolvedItem = serverItem;
  }

  // Update local store
  await putItems(storeName, [resolvedItem]);

  return resolvedItem;
}

/**
 * Check if data is stale (needs refresh)
 */
export async function isStoreStale(storeName: StoreName, maxAgeMs: number = 5 * 60 * 1000): Promise<boolean> {
  const meta = await getSyncMeta(storeName);
  if (!meta?.lastSyncAt) {
    return true;
  }

  const lastSync = new Date(meta.lastSyncAt).getTime();
  const now = Date.now();
  return now - lastSync > maxAgeMs;
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  for (const storeName of Object.values(STORES)) {
    await clearStore(storeName);
  }
  updateStatus({
    lastSyncAt: null,
    pendingMutations: 0,
    storeStatuses: {},
  });
}
