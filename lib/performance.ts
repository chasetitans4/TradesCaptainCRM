// =====================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// Helpers for improving CRM load times and performance
// =====================================================

/**
 * Prefetch critical routes for faster navigation
 */
export const CRITICAL_ROUTES = [
  '/dashboard',
  '/customers',
  '/jobs',
  '/invoices',
  '/calendar',
] as const;

/**
 * Routes that should be prefetched after initial load
 */
export const SECONDARY_ROUTES = [
  '/quotes',
  '/leads',
  '/messages',
  '/settings',
  '/reports',
] as const;

/**
 * Prefetch routes after a delay to not block initial render
 */
export function prefetchRoutes(
  router: { prefetch: (url: string) => void },
  routes: readonly string[],
  delay: number = 2000
) {
  if (typeof window === 'undefined') return;

  setTimeout(() => {
    routes.forEach((route) => {
      try {
        router.prefetch(route);
      } catch {
        // Silently fail - prefetch is optional optimization
      }
    });
  }, delay);
}

/**
 * Intersection Observer for lazy loading components when visible
 */
export function createLazyLoadObserver(
  callback: () => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
        }
      });
    },
    {
      rootMargin: '100px',
      threshold: 0.1,
      ...options,
    }
  );
}

/**
 * Debounce function for search inputs and API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Request idle callback polyfill for non-critical work
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  if ('requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback, options);
  }

  // Fallback for Safari
  return globalThis.setTimeout(callback, options?.timeout || 1) as unknown as number;
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(id: number): void {
  if (typeof window === 'undefined') return;

  if ('cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    globalThis.clearTimeout(id);
  }
}

/**
 * Measure and log performance metrics
 */
export function measurePerformance(name: string): () => void {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return () => {};
  }

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-duration`;

  performance.mark(startMark);

  return () => {
    performance.mark(endMark);
    try {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Perf] ${name}: ${measure.duration.toFixed(2)}ms`);
      }
    } catch {
      // Ignore measurement errors
    }
  };
}

/**
 * Stale-while-revalidate cache for API responses
 */
const cache = new Map<string, { data: any; timestamp: number }>();

export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { maxAge?: number; staleWhileRevalidate?: boolean }
): Promise<T> {
  const { maxAge = 30000, staleWhileRevalidate = true } = options || {};
  const cached = cache.get(key);
  const now = Date.now();

  // Return cached if fresh
  if (cached && now - cached.timestamp < maxAge) {
    return cached.data as T;
  }

  // Return stale data while revalidating
  if (cached && staleWhileRevalidate) {
    // Revalidate in background
    fetcher()
      .then((data) => {
        cache.set(key, { data, timestamp: Date.now() });
      })
      .catch(() => {});
    return cached.data as T;
  }

  // Fetch fresh data
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

/**
 * Clear cache entries
 */
export function clearCache(keyPattern?: string): void {
  if (!keyPattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
    }
  }
}
