// =====================================================
// OFFLINE MODULE EXPORTS
// Central export point for offline functionality
// =====================================================

// IndexedDB storage layer
export {
  STORES,
  type StoreName,
  type SyncMeta,
  type QueuedMutation,
  openDatabase,
  getItem,
  getAllItems,
  getItemsByIndex,
  putItem,
  putItems,
  deleteItem,
  clearStore,
  getSyncMeta,
  updateSyncMeta,
  queueMutation,
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  clearSuccessfulMutations,
  isIndexedDBAvailable,
  getStorageEstimate,
} from './indexeddb';

// Mutation queue
export {
  type SyncEvent,
  subscribeSyncEvents,
  queueOfflineMutation,
  processMutationQueue,
  getPendingMutationCount,
  getFailedMutations,
  retryMutation,
  discardMutation,
  registerNetworkListeners,
} from './mutation-queue';

// Sync engine
export {
  type SyncConfig,
  type SyncStatus,
  initializeSyncEngine,
  stopSyncEngine,
  subscribeSyncStatus,
  fullSync,
  forceSync,
  getSyncStatus,
  resolveConflict,
  isStoreStale,
  clearAllOfflineData,
} from './sync-engine';

// React context and hooks
export {
  OfflineProvider,
  useOffline,
  useOnlineStatus,
  type OfflineContextValue,
} from './context';
