// =====================================================
// OFFLINE MUTATION QUEUE
// Queues mutations when offline, replays when online
// =====================================================

import {
  STORES,
  StoreName,
  QueuedMutation,
  queueMutation,
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  putItem,
  deleteItem,
  isIndexedDBAvailable,
} from './indexeddb';

// API endpoint mapping for each store
const STORE_ENDPOINTS: Record<StoreName, string> = {
  [STORES.CUSTOMERS]: '/api/customers',
  [STORES.JOBS]: '/api/jobs',
  [STORES.LEADS]: '/api/leads',
  [STORES.INVOICES]: '/api/invoices',
  [STORES.SYNC_META]: '',
  [STORES.MUTATION_QUEUE]: '',
};

// Maximum retry attempts before marking as permanently failed
const MAX_RETRIES = 5;

// Backoff delays (in ms) for retries
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];

// Event emitter for sync status updates
type SyncEventCallback = (event: SyncEvent) => void;
const syncListeners: Set<SyncEventCallback> = new Set();

export interface SyncEvent {
  type: 'mutation_queued' | 'sync_started' | 'sync_completed' | 'sync_failed' | 'mutation_synced' | 'mutation_failed';
  mutationId?: string;
  storeName?: StoreName;
  pendingCount?: number;
  error?: string;
}

export function subscribeSyncEvents(callback: SyncEventCallback): () => void {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

function emitSyncEvent(event: SyncEvent) {
  syncListeners.forEach((callback) => callback(event));
}

/**
 * Queue an offline mutation
 * This stores the mutation locally and applies optimistic update
 */
export async function queueOfflineMutation<T extends { id: string }>(
  storeName: StoreName,
  operation: 'create' | 'update' | 'delete',
  payload: T,
  entityId?: string
): Promise<{ mutationId: string; optimisticData: T }> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available');
  }

  // Generate ID for new entities
  const id = entityId || payload.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const optimisticData = { ...payload, id, _offline: true, _pending: true };

  // Apply optimistic update to local store
  if (operation === 'delete') {
    await deleteItem(storeName, id);
  } else {
    await putItem(storeName, optimisticData);
  }

  // Queue the mutation
  const mutationId = await queueMutation({
    storeName,
    operation,
    entityId: id,
    payload: optimisticData,
  });

  const pending = await getPendingMutations();
  emitSyncEvent({
    type: 'mutation_queued',
    mutationId,
    storeName,
    pendingCount: pending.length,
  });

  // Try to sync immediately if online
  if (navigator.onLine) {
    processMutationQueue().catch(console.error);
  }

  return { mutationId, optimisticData };
}

/**
 * Process all pending mutations
 * Called when coming online or manually triggered
 */
export async function processMutationQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (!isIndexedDBAvailable()) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const pending = await getPendingMutations();
  if (pending.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  emitSyncEvent({ type: 'sync_started', pendingCount: pending.length });

  let succeeded = 0;
  let failed = 0;

  for (const mutation of pending) {
    try {
      await processSingleMutation(mutation);
      succeeded++;
      emitSyncEvent({
        type: 'mutation_synced',
        mutationId: mutation.id,
        storeName: mutation.storeName,
      });
    } catch (error) {
      failed++;
      emitSyncEvent({
        type: 'mutation_failed',
        mutationId: mutation.id,
        storeName: mutation.storeName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const remaining = await getPendingMutations();
  emitSyncEvent({
    type: succeeded > 0 ? 'sync_completed' : 'sync_failed',
    pendingCount: remaining.length,
  });

  return { processed: pending.length, succeeded, failed };
}

/**
 * Process a single mutation
 */
async function processSingleMutation(mutation: QueuedMutation): Promise<void> {
  const endpoint = STORE_ENDPOINTS[mutation.storeName];
  if (!endpoint) {
    await removeMutation(mutation.id);
    return;
  }

  // Check retry count
  if (mutation.retryCount >= MAX_RETRIES) {
    await updateMutationStatus(mutation.id, 'failed', 'Max retries exceeded');
    return;
  }

  // Mark as syncing
  await updateMutationStatus(mutation.id, 'syncing');

  try {
    let response: Response;
    const { _offline, _pending, ...cleanPayload } = mutation.payload;

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

    // Success - get server response and update local store
    if (mutation.operation !== 'delete') {
      const serverData = await response.json();
      // Update local store with server data (removes _offline flags)
      await putItem(mutation.storeName, { ...serverData, _offline: false, _pending: false });
    }

    // Remove from queue
    await removeMutation(mutation.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a conflict (409) - need special handling
    if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('conflict')) {
      await updateMutationStatus(mutation.id, 'failed', 'Conflict - manual resolution needed');
      return;
    }

    // Check if it's a permanent error (4xx except 409)
    if (errorMessage.includes('40') && !errorMessage.includes('409')) {
      await updateMutationStatus(mutation.id, 'failed', errorMessage);
      return;
    }

    // Transient error - retry later
    const delay = RETRY_DELAYS[Math.min(mutation.retryCount, RETRY_DELAYS.length - 1)];
    await updateMutationStatus(mutation.id, 'failed', errorMessage);

    // Schedule retry
    setTimeout(() => {
      if (navigator.onLine) {
        processMutationQueue().catch(console.error);
      }
    }, delay);

    throw error;
  }
}

/**
 * Get count of pending mutations
 */
export async function getPendingMutationCount(): Promise<number> {
  if (!isIndexedDBAvailable()) {
    return 0;
  }
  const pending = await getPendingMutations();
  return pending.length;
}

/**
 * Get all failed mutations that need manual attention
 */
export async function getFailedMutations(): Promise<QueuedMutation[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }
  const pending = await getPendingMutations();
  return pending.filter((m) => m.status === 'failed' && m.retryCount >= MAX_RETRIES);
}

/**
 * Retry a specific failed mutation
 */
export async function retryMutation(mutationId: string): Promise<void> {
  await updateMutationStatus(mutationId, 'pending');
  await processMutationQueue();
}

/**
 * Discard a failed mutation (rollback optimistic update)
 */
export async function discardMutation(mutationId: string): Promise<void> {
  // In a real implementation, you'd also rollback the optimistic update
  // For now, we just remove from queue - the next sync will overwrite with server data
  await removeMutation(mutationId);
}

/**
 * Register online/offline event listeners
 */
export function registerNetworkListeners(): () => void {
  const handleOnline = () => {
    console.log('[OfflineSync] Online - processing mutation queue');
    processMutationQueue().catch(console.error);
  };

  const handleOffline = () => {
    console.log('[OfflineSync] Offline - mutations will be queued');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
