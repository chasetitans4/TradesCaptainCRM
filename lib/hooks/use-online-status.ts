'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeSyncEvents,
  processMutationQueue,
  getPendingMutationCount,
  registerNetworkListeners,
} from '@/lib/offline/mutation-queue';

interface OnlineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  /** Manually trigger sync of pending mutations */
  triggerSync: () => Promise<void>;
}

/**
 * Hook for tracking online/offline state and pending mutation sync status.
 * Listens to browser online/offline events and the mutation queue.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Initialize from browser state
  useEffect(() => {
    setIsOnline(navigator.onLine);

    // Load initial pending count
    getPendingMutationCount()
      .then(setPendingCount)
      .catch(() => {});
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for sync events from mutation queue
  useEffect(() => {
    const unsubscribe = subscribeSyncEvents((event) => {
      switch (event.type) {
        case 'mutation_queued':
          setPendingCount(event.pendingCount ?? 0);
          break;
        case 'sync_started':
          setIsSyncing(true);
          setLastSyncError(null);
          break;
        case 'sync_completed':
          setIsSyncing(false);
          setPendingCount(event.pendingCount ?? 0);
          break;
        case 'sync_failed':
          setIsSyncing(false);
          setPendingCount(event.pendingCount ?? 0);
          setLastSyncError(event.error ?? 'Sync failed');
          break;
        case 'mutation_synced':
          // Refresh count after individual sync
          getPendingMutationCount()
            .then(setPendingCount)
            .catch(() => {});
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Register network listeners for auto-sync on reconnect
  useEffect(() => {
    const cleanup = registerNetworkListeners();
    return cleanup;
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await processMutationQueue();
    } finally {
      const count = await getPendingMutationCount();
      setPendingCount(count);
      setIsSyncing(false);
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncError,
    triggerSync,
  };
}
