'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Smart back navigation hook that falls back to a default path
 * if there's no browser history to go back to.
 *
 * @param fallbackPath - The path to navigate to if no history exists
 * @returns goBack function to trigger navigation
 */
export function useSmartBack(fallbackPath: string = '/dashboard') {
  const router = useRouter();
  const hasHistory = useRef(false);

  // Track if we have navigation history
  useEffect(() => {
    // Check if there's history by looking at the history length
    // Note: history.length starts at 1 for a fresh tab
    hasHistory.current = typeof window !== 'undefined' && window.history.length > 1;
  }, []);

  const goBack = useCallback(() => {
    if (hasHistory.current && typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackPath);
    }
  }, [router, fallbackPath]);

  return { goBack, hasHistory: hasHistory.current };
}

/**
 * Get the default fallback path based on the current route
 */
export function getDefaultFallback(pathname: string): string {
  // Map detail pages to their list pages
  if (pathname.startsWith('/jobs/')) return '/jobs';
  if (pathname.startsWith('/customers/')) return '/customers';
  if (pathname.startsWith('/invoices/')) return '/invoices';
  if (pathname.startsWith('/quotes/')) return '/quotes';
  if (pathname.startsWith('/leads/')) return '/leads';
  if (pathname.startsWith('/messages/')) return '/messages';
  if (pathname.startsWith('/reports/')) return '/reports';
  if (pathname.startsWith('/settings/')) return '/settings';

  // Default to dashboard
  return '/dashboard';
}
