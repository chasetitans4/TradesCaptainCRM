/**
 * Filter Persistence Hook
 *
 * Per Design Constitution Section 3.15.3:
 * - Save filters to URL params
 * - Restore on page load
 * - "Clear filters" action
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * Serializable filter value types
 */
type FilterValue = string | number | boolean | string[] | undefined;

/**
 * Filter state object
 */
export type FilterState = Record<string, FilterValue>;

/**
 * Filter persistence options
 */
interface UseFilterPersistenceOptions {
  /** Default filter values */
  defaults?: FilterState;
  /** Keys to persist (if not provided, all keys are persisted) */
  persistKeys?: string[];
  /** Whether to replace or push history entry */
  replaceHistory?: boolean;
  /** Debounce delay for URL updates (ms) */
  debounceMs?: number;
}

/**
 * Filter persistence result
 */
interface UseFilterPersistenceResult<T extends FilterState> {
  /** Current filter state */
  filters: T;
  /** Update a single filter */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Update multiple filters */
  setFilters: (updates: Partial<T>) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Clear a single filter */
  clearFilter: <K extends keyof T>(key: K) => void;
  /** Check if any filters are active */
  hasActiveFilters: boolean;
  /** Count of active filters */
  activeFilterCount: number;
  /** Get URL with current filters */
  getFilterUrl: (baseUrl?: string) => string;
}

/**
 * Parse value from URL string
 */
function parseValue(value: string | null, defaultValue: FilterValue): FilterValue {
  if (value === null) return defaultValue;

  // Try to parse as JSON for arrays/objects
  if (value.startsWith('[') || value.startsWith('{')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value === String(num)) return num;

  // String
  return value;
}

/**
 * Serialize value for URL
 */
function serializeValue(value: FilterValue): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Check if value is different from default
 */
function isActive(value: FilterValue, defaultValue: FilterValue): boolean {
  if (value === undefined || value === defaultValue) return false;

  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return JSON.stringify(value) !== JSON.stringify(defaultValue);
  }

  return true;
}

/**
 * Hook for persisting filters in URL params
 */
export function useFilterPersistence<T extends FilterState>(
  options: UseFilterPersistenceOptions = {}
): UseFilterPersistenceResult<T> {
  const {
    persistKeys,
    replaceHistory = true,
    debounceMs = 300,
  } = options;

  // Cast defaults to T to ensure type safety with indexed access
  const defaults = (options.defaults || {}) as T;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const getInitialState = useCallback((): T => {
    const state = { ...defaults } as T;

    searchParams.forEach((value, key) => {
      if (!persistKeys || persistKeys.includes(key)) {
        const defaultVal = defaults[key as keyof T];
        state[key as keyof T] = parseValue(value, defaultVal) as T[keyof T];
      }
    });

    return state;
  }, [searchParams, defaults, persistKeys]);

  const [filters, setFiltersState] = useState<T>(getInitialState);
  const [pendingUpdate, setPendingUpdate] = useState<T | null>(null);

  // Sync with URL on mount and navigation
  useEffect(() => {
    setFiltersState(getInitialState());
  }, [searchParams, getInitialState]);

  // Debounced URL update
  useEffect(() => {
    if (!pendingUpdate) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams();

      // Preserve non-filter params
      searchParams.forEach((value, key) => {
        if (persistKeys && !persistKeys.includes(key)) {
          params.set(key, value);
        }
      });

      // Add filter params
      Object.entries(pendingUpdate).forEach(([key, value]) => {
        if (persistKeys && !persistKeys.includes(key)) return;

        const serialized = serializeValue(value);
        const defaultValue = defaults[key as keyof T];

        // Only include if different from default
        if (serialized !== null && isActive(value, defaultValue)) {
          params.set(key, serialized);
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      if (replaceHistory) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }

      setPendingUpdate(null);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [pendingUpdate, pathname, router, replaceHistory, defaults, persistKeys, searchParams, debounceMs]);

  // Update URL with new filters
  const updateUrl = useCallback((newFilters: T) => {
    setPendingUpdate(newFilters);
  }, []);

  // Set a single filter
  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((prev) => {
        const next = { ...prev, [key]: value };
        updateUrl(next);
        return next;
      });
    },
    [updateUrl]
  );

  // Set multiple filters
  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setFiltersState((prev) => {
        const next = { ...prev, ...updates };
        updateUrl(next);
        return next;
      });
    },
    [updateUrl]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    const cleared = { ...defaults } as T;
    setFiltersState(cleared);
    updateUrl(cleared);
  }, [defaults, updateUrl]);

  // Clear a single filter
  const clearFilter = useCallback(
    <K extends keyof T>(key: K) => {
      setFiltersState((prev) => {
        const next = { ...prev, [key]: defaults[key] };
        updateUrl(next);
        return next;
      });
    },
    [defaults, updateUrl]
  );

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    const defaultValue = defaults[key as keyof T];
    return isActive(value, defaultValue);
  }).length;

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0;

  // Get URL with current filters
  const getFilterUrl = useCallback(
    (baseUrl?: string) => {
      const base = baseUrl || pathname;
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (persistKeys && !persistKeys.includes(key)) return;

        const serialized = serializeValue(value);
        const defaultValue = defaults[key as keyof T];

        if (serialized !== null && isActive(value, defaultValue)) {
          params.set(key, serialized);
        }
      });

      const queryString = params.toString();
      return queryString ? `${base}?${queryString}` : base;
    },
    [filters, pathname, defaults, persistKeys]
  );

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
    getFilterUrl,
  };
}

/**
 * Common filter presets
 */
export const JOB_FILTER_DEFAULTS = {
  status: undefined as string | undefined,
  priority: undefined as string | undefined,
  technicianId: undefined as string | undefined,
  dateFrom: undefined as string | undefined,
  dateTo: undefined as string | undefined,
  search: undefined as string | undefined,
};

export const CUSTOMER_FILTER_DEFAULTS = {
  type: undefined as string | undefined,
  status: undefined as string | undefined,
  search: undefined as string | undefined,
  sortBy: 'name' as string,
  sortOrder: 'asc' as 'asc' | 'desc',
};

export const INVOICE_FILTER_DEFAULTS = {
  status: undefined as string | undefined,
  customerId: undefined as string | undefined,
  dateFrom: undefined as string | undefined,
  dateTo: undefined as string | undefined,
  minAmount: undefined as number | undefined,
  maxAmount: undefined as number | undefined,
};
