'use client';

// =====================================================
// OFFLINE CONTEXT PROVIDER
// React context for offline status and sync management
// =====================================================

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { isIndexedDBAvailable } from './indexeddb';
import {
  subscribeSyncEvents,
  SyncEvent,
  getPendingMutationCount,
  processMutationQueue,
  registerNetworkListeners,
} from './mutation-queue';
import {
  initializeSyncEngine,
  stopSyncEngine,
  subscribeSyncStatus,
  SyncStatus,
  fullSync,
  getSyncStatus,
} from './sync-engine';

// Context types
export interface OfflineContextValue {
  // Connection status
  isOnline: boolean;
  // Sync status
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  // Pending mutations
  pendingMutations: number;
  // IndexedDB availability
  isOfflineCapable: boolean;
  // Actions
  triggerSync: () => Promise<void>;
  processPendingMutations: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

// Provider props
interface OfflineProviderProps {
  children: ReactNode;
  // Auto-initialize sync engine on mount
  autoInitialize?: boolean;
  // Sync interval in ms (0 to disable)
  syncInterval?: number;
}

export function OfflineProvider({
  children,
  autoInitialize = true,
  syncInterval = 5 * 60 * 1000, // 5 minutes
}: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [isOfflineCapable, setIsOfflineCapable] = useState(false);

  // Initialize on mount
  useEffect(() => {
    // Check capabilities
    const capable = isIndexedDBAvailable();
    setIsOfflineCapable(capable);

    if (!capable) {
      console.warn('[OfflineProvider] IndexedDB not available, offline features disabled');
      return;
    }

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Register network listeners
    const unregisterNetwork = registerNetworkListeners();

    // Online/offline event handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync events
    const unsubscribeEvents = subscribeSyncEvents((event: SyncEvent) => {
      switch (event.type) {
        case 'mutation_queued':
          setPendingMutations(event.pendingCount || 0);
          break;
        case 'sync_started':
          setIsSyncing(true);
          break;
        case 'sync_completed':
          setIsSyncing(false);
          setPendingMutations(event.pendingCount || 0);
          break;
        case 'sync_failed':
          setIsSyncing(false);
          break;
      }
    });

    // Subscribe to sync status
    const unsubscribeStatus = subscribeSyncStatus((status: SyncStatus) => {
      setIsSyncing(status.isSyncing);
      setLastSyncAt(status.lastSyncAt);
      setSyncError(status.syncError);
      setPendingMutations(status.pendingMutations);
    });

    // Initialize sync engine if auto-initialize is enabled
    if (autoInitialize) {
      initializeSyncEngine({ syncInterval }).catch(console.error);
    }

    // Load initial pending count
    getPendingMutationCount().then(setPendingMutations).catch(console.error);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      unregisterNetwork();
      unsubscribeEvents();
      unsubscribeStatus();
      stopSyncEngine();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [autoInitialize, syncInterval]);

  // Handle service worker messages
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type } = event.data || {};

    switch (type) {
      case 'SYNC_COMPLETED':
        setIsSyncing(false);
        getPendingMutationCount().then(setPendingMutations).catch(console.error);
        break;
      case 'FULL_SYNC_NEEDED':
        fullSync().catch(console.error);
        break;
    }
  }, []);

  // Trigger full sync
  const triggerSync = useCallback(async () => {
    if (!isOfflineCapable || !isOnline) return;
    await fullSync();
  }, [isOfflineCapable, isOnline]);

  // Process pending mutations
  const processPendingMutations = useCallback(async () => {
    if (!isOfflineCapable || !isOnline) return;
    await processMutationQueue();
    const count = await getPendingMutationCount();
    setPendingMutations(count);
  }, [isOfflineCapable, isOnline]);

  const value: OfflineContextValue = {
    isOnline,
    isSyncing,
    lastSyncAt,
    syncError,
    pendingMutations,
    isOfflineCapable,
    triggerSync,
    processPendingMutations,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

// Hook to use offline context
export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    // Return default values if provider not mounted
    return {
      isOnline: true,
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      pendingMutations: 0,
      isOfflineCapable: false,
      triggerSync: async () => {},
      processPendingMutations: async () => {},
    };
  }
  return context;
}

// Hook for just online status (lightweight)
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
