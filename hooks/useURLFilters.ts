'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * Hook for managing URL-based filter state
 * Enables shareable URLs and filter persistence across page refreshes
 */

type FilterValue = string | string[] | number | boolean | null | undefined;
type FilterRecord = Record<string, FilterValue>;

interface UseURLFiltersOptions<T extends FilterRecord> {
  /** Default values for filters when not present in URL */
  defaults?: Partial<T>;
  /** Whether to replace or push to history on filter change */
  replace?: boolean;
}

export function useURLFilters<T extends FilterRecord>(
  options: UseURLFiltersOptions<T> = {}
) {
  const { defaults = {} as Partial<T>, replace = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current filters from URL
  const filters = useMemo(() => {
    const params: Record<string, FilterValue> = { ...defaults };

    searchParams.forEach((value, key) => {
      // Handle array values (key=a&key=b)
      const existing = params[key];
      if (existing !== undefined && existing !== null) {
        if (Array.isArray(existing)) {
          params[key] = [...existing, value];
        } else {
          params[key] = [String(existing), value];
        }
      } else {
        // Try to parse as number or boolean
        if (value === 'true') {
          params[key] = true;
        } else if (value === 'false') {
          params[key] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          params[key] = Number(value);
        } else {
          params[key] = value;
        }
      }
    });

    return params as T;
  }, [searchParams, defaults]);

  // Set a single filter value
  const setFilter = useCallback(
    (key: keyof T, value: FilterValue) => {
      const params = new URLSearchParams(searchParams.toString());

      const defaultValue = (defaults as Record<string, FilterValue>)[String(key)];
      if (value === null || value === undefined || value === '' || value === defaultValue) {
        params.delete(String(key));
      } else if (Array.isArray(value)) {
        params.delete(String(key));
        value.forEach((v) => params.append(String(key), String(v)));
      } else {
        params.set(String(key), String(value));
      }

      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      if (replace) {
        router.replace(newUrl);
      } else {
        router.push(newUrl);
      }
    },
    [router, pathname, searchParams, replace, defaults]
  );

  // Set multiple filters at once
  const setFilters = useCallback(
    (newFilters: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newFilters).forEach(([key, value]) => {
        const defaultValue = (defaults as Record<string, FilterValue>)[key];
        if (value === null || value === undefined || value === '' || value === defaultValue) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.delete(key);
          value.forEach((v) => params.append(key, String(v)));
        } else {
          params.set(key, String(value));
        }
      });

      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      if (replace) {
        router.replace(newUrl);
      } else {
        router.push(newUrl);
      }
    },
    [router, pathname, searchParams, replace, defaults]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    if (replace) {
      router.replace(pathname);
    } else {
      router.push(pathname);
    }
  }, [router, pathname, replace]);

  // Check if any filters are active (different from defaults)
  const hasActiveFilters = useMemo(() => {
    return searchParams.toString().length > 0;
  }, [searchParams]);

  // Get filter value with type safety
  const getFilter = useCallback(
    <K extends keyof T>(key: K): T[K] => {
      const defaultValue = (defaults as Record<string, FilterValue>)[String(key)];
      return (filters[key] ?? defaultValue) as T[K];
    },
    [filters, defaults]
  );

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    getFilter,
  };
}

/**
 * Common filter presets for admin pages
 */
export interface CommonFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const commonFilterDefaults: CommonFilters = {
  page: 1,
  limit: 25,
  order: 'desc',
};
