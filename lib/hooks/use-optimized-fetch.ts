'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithSWR, debounce } from '@/lib/performance';

interface UseFetchOptions<T> {
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
}

interface UseFetchResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T) => void;
  refetch: () => Promise<void>;
}

/**
 * Optimized data fetching hook with caching, SWR, and smart revalidation
 */
export function useOptimizedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    initialData,
    staleTime = 30000,
    refetchOnFocus = true,
    refetchOnReconnect = true,
    pollingInterval = 0,
    useSWR = true,
    deps = [],
  } = options;
  const depsKey = JSON.stringify(deps);

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isValidating, setIsValidating] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const isMounted = useRef(true);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setIsValidating(true);
    setError(undefined);

    try {
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
        lastFetchTime.current = Date.now();
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Fetch failed'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [key, fetcher, staleTime, useSWR]);

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
    } else {
      fetchData(true);
    }
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchData(false);

    return () => {
      isMounted.current = false;
    };
  }, [fetchData, key, depsKey]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = debounce(() => {
      const now = Date.now();
      if (now - lastFetchTime.current > staleTime) {
        fetchData(true);
      }
    }, 100);

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, staleTime, fetchData]);

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      fetchData(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, fetchData]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingInterval, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    refetch,
  };
}

/**
 * Hook for paginated data with optimized fetching
 */
export function usePaginatedFetch<T>(
  baseKey: string,
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; total: number }>,
  options: UseFetchOptions<T[]> & { limit?: number } = {}
) {
  const { limit = 25, ...fetchOptions } = options;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [allData, setAllData] = useState<T[]>([]);

  const paginatedFetcher = useCallback(async () => {
    const result = await fetcher(page, limit);
    setTotal(result.total);
    return result.data;
  }, [fetcher, page, limit]);

  const result = useOptimizedFetch(
    `${baseKey}-page-${page}`,
    paginatedFetcher,
    { ...fetchOptions, deps: [page, ...(fetchOptions.deps || [])] }
  );

  useEffect(() => {
    if (result.data) {
      setAllData(result.data);
    }
  }, [result.data]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    ...result,
    data: allData,
    page,
    setPage,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: () => hasNextPage && setPage((p) => p + 1),
    prevPage: () => hasPrevPage && setPage((p) => p - 1),
  };
}
