'use client';

// =====================================================
// OFFLINE-FIRST DATA FETCHING HOOK
// Combines network fetching with IndexedDB caching
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithSWR } from '@/lib/performance';
import {
  STORES,
  StoreName,
  getAllItems,
  getItem,
  getItemsByIndex,
  putItems,
  putItem,
  isIndexedDBAvailable,
  getSyncMeta,
  updateSyncMeta,
} from '@/lib/offline/indexeddb';
import { queueOfflineMutation } from '@/lib/offline/mutation-queue';

interface UseOfflineFetchOptions<T> {
  /** Store name for IndexedDB caching */
  storeName?: StoreName;
  /** Initial data to use before fetch completes */
  initialData?: T;
  /** Time in ms before data is considered stale (default: 30000) */
  staleTime?: number;
  /** Whether to refetch on window focus */
  refetchOnFocus?: boolean;
  /** Whether to refetch on reconnect */
  refetchOnReconnect?: boolean;
  /** Polling interval in ms (0 = disabled) */
  pollingInterval?: number;
  /** Whether to use SWR caching */
  useSWR?: boolean;
  /** Dependencies that trigger refetch */
  deps?: any[];
  /** Index name for filtered queries */
  indexName?: string;
  /** Index value for filtered queries */
  indexValue?: string;
}

interface UseOfflineFetchResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  mutate: (data?: T) => void;
  refetch: () => Promise<void>;
}

/**
 * Offline-first data fetching hook
 * Tries IndexedDB first when offline, syncs to network when online
 */
export function useOfflineFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseOfflineFetchOptions<T> = {}
): UseOfflineFetchResult<T> {
  const {
    storeName,
    initialData,
    staleTime = 30000,
    refetchOnFocus = true,
    refetchOnReconnect = true,
    pollingInterval = 0,
    useSWR = true,
    deps = [],
    indexName,
    indexValue,
  } = options;
  const depsKey = JSON.stringify(deps);

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isValidating, setIsValidating] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const isMounted = useRef(true);
  const offlineCapable = isIndexedDBAvailable() && !!storeName;

  // Load from IndexedDB cache
  const loadFromCache = useCallback(async (): Promise<T | null> => {
    if (!offlineCapable || !storeName) return null;

    try {
      let cachedData: any;

      if (indexName && indexValue) {
        // Load by index
        cachedData = await getItemsByIndex(storeName, indexName, indexValue);
      } else if (key.includes('/')) {
        // Single item by ID (e.g., "customers/123")
        const id = key.split('/').pop();
        if (id) {
          cachedData = await getItem(storeName, id);
        }
      } else {
        // All items
        cachedData = await getAllItems(storeName);
      }

      return cachedData as T;
    } catch (err) {
      console.warn('[useOfflineFetch] Failed to load from cache:', err);
      return null;
    }
  }, [offlineCapable, storeName, key, indexName, indexValue]);

  // Save to IndexedDB cache
  const saveToCache = useCallback(async (result: T) => {
    if (!offlineCapable || !storeName) return;

    try {
      if (Array.isArray(result)) {
        // Multiple items
        await putItems(storeName, result as any[]);
        await updateSyncMeta(storeName, result.length);
      } else if (result && typeof result === 'object' && 'id' in result) {
        // Single item
        await putItem(storeName, result as any);
      }
    } catch (err) {
      console.warn('[useOfflineFetch] Failed to save to cache:', err);
    }
  }, [offlineCapable, storeName]);

  // Fetch data (network or cache)
  const fetchData = useCallback(async (isBackground = false) => {
    const online = navigator.onLine;
    setIsOffline(!online);

    if (!isBackground) {
      setIsLoading(true);
    }
    setIsValidating(true);
    setError(undefined);

    try {
      // If offline, try cache first
      if (!online && offlineCapable) {
        const cached = await loadFromCache();
        if (cached !== null) {
          if (isMounted.current) {
            setData(cached);
            setIsFromCache(true);
            setIsLoading(false);
            setIsValidating(false);
          }
          return;
        }
        // No cache available
        throw new Error('No cached data available offline');
      }

      // Online - fetch from network
      let result: T;

      if (useSWR) {
        result = await fetchWithSWR(key, fetcher, {
          maxAge: staleTime,
          staleWhileRevalidate: true,
        });
      } else {
        result = await fetcher();
      }

      if (isMounted.current) {
        setData(result);
        setIsFromCache(false);
        lastFetchTime.current = Date.now();

        // Save to cache for offline use
        await saveToCache(result);
      }
    } catch (err) {
      // If network fails, try cache
      if (offlineCapable) {
        const cached = await loadFromCache();
        if (cached !== null && isMounted.current) {
          setData(cached);
          setIsFromCache(true);
          // Don't set error if we have cached data
          return;
        }
      }

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Fetch failed'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [key, fetcher, staleTime, useSWR, offlineCapable, loadFromCache, saveToCache]);

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
      // Also update cache
      saveToCache(newData);
    } else {
      fetchData(true);
    }
  }, [fetchData, saveToCache]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchData(false);

    return () => {
      isMounted.current = false;
    };
  }, [fetchData, key, depsKey]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (refetchOnReconnect) {
        fetchData(true);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetchOnReconnect, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      const now = Date.now();
      if (navigator.onLine && now - lastFetchTime.current > staleTime) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, staleTime, fetchData]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        fetchData(true);
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingInterval, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    isOffline,
    isFromCache,
    mutate,
    refetch,
  };
}

/**
 * Hook for offline-capable mutations (create, update, delete)
 */
export function useOfflineMutation<T extends { id: string }>(
  storeName: StoreName,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    onOfflineQueue?: (mutationId: string) => void;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (
    payload: Omit<T, 'id'>,
    endpoint: string
  ): Promise<T | { queued: boolean; mutationId: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.onLine && isIndexedDBAvailable()) {
        // Queue for later sync
        const { mutationId, optimisticData } = await queueOfflineMutation(
          storeName,
          'create',
          payload as any
        );
        options.onOfflineQueue?.(mutationId);
        setIsLoading(false);
        return { queued: true, mutationId };
      }

      // Online - send to server
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      options.onSuccess?.(data);
      setIsLoading(false);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      options.onError?.(error);
      setIsLoading(false);
      throw error;
    }
  }, [storeName, options]);

  const update = useCallback(async (
    id: string,
    payload: Partial<T>,
    endpoint: string
  ): Promise<T | { queued: boolean; mutationId: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.onLine && isIndexedDBAvailable()) {
        const { mutationId, optimisticData } = await queueOfflineMutation(
          storeName,
          'update',
          { ...payload, id } as T,
          id
        );
        options.onOfflineQueue?.(mutationId);
        setIsLoading(false);
        return { queued: true, mutationId };
      }

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      options.onSuccess?.(data);
      setIsLoading(false);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      options.onError?.(error);
      setIsLoading(false);
      throw error;
    }
  }, [storeName, options]);

  const remove = useCallback(async (
    id: string,
    endpoint: string
  ): Promise<void | { queued: boolean; mutationId: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.onLine && isIndexedDBAvailable()) {
        const { mutationId } = await queueOfflineMutation(
          storeName,
          'delete',
          { id } as T,
          id
        );
        options.onOfflineQueue?.(mutationId);
        setIsLoading(false);
        return { queued: true, mutationId };
      }

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      options.onSuccess?.({ id } as T);
      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      options.onError?.(error);
      setIsLoading(false);
      throw error;
    }
  }, [storeName, options]);

  return {
    create,
    update,
    remove,
    isLoading,
    error,
  };
}
