'use client';

/**
 * Navigation Stack Context
 *
 * Per CIL Spec Section 1.1:
 * - Preserves navigation context with dynamic back button labels
 * - Memory-only (not persisted)
 * - Max depth of 5 entries (oldest pruned)
 * - Same screen revisited = replace, don't stack (prevents loops)
 * - Cross-entity navigation = clear stack, start new
 * - Swipe-from-left-edge triggers back
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Navigation entry in the stack
 */
export interface NavigationEntry {
  /** Route path */
  route: string;
  /** Human-readable label for back button */
  label: string;
  /** Route parameters */
  params: Record<string, string>;
  /** Scroll position to restore */
  scrollPosition?: number;
  /** Entity type for cross-entity detection */
  entityType?: 'job' | 'customer' | 'invoice' | 'quote' | 'lead' | 'equipment' | 'schedule' | 'other';
  /** Entity ID */
  entityId?: string;
  /** Timestamp for debugging */
  timestamp: number;
}

/**
 * Navigation context value
 */
interface NavigationContextValue {
  /** Current navigation stack */
  stack: NavigationEntry[];
  /** Current entry (top of stack) */
  currentEntry: NavigationEntry | null;
  /** Previous entry (for back button label) */
  previousEntry: NavigationEntry | null;
  /** Push a new entry onto the stack */
  push: (entry: Omit<NavigationEntry, 'timestamp'>) => void;
  /** Replace current entry */
  replace: (entry: Omit<NavigationEntry, 'timestamp'>) => void;
  /** Go back with context preservation */
  goBack: () => void;
  /** Go back to a specific entry in the stack */
  goBackTo: (route: string) => void;
  /** Clear the entire stack */
  clearStack: () => void;
  /** Get the back button label */
  getBackLabel: () => string;
  /** Check if we can go back */
  canGoBack: boolean;
  /** Update scroll position for current entry */
  updateScrollPosition: (position: number) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const MAX_STACK_DEPTH = 5;

/**
 * Extract entity info from route
 */
function extractEntityInfo(route: string): { entityType?: NavigationEntry['entityType']; entityId?: string } {
  const patterns: Array<{ pattern: RegExp; type: NavigationEntry['entityType'] }> = [
    { pattern: /\/jobs\/([^/]+)/, type: 'job' },
    { pattern: /\/customers\/([^/]+)/, type: 'customer' },
    { pattern: /\/invoices\/([^/]+)/, type: 'invoice' },
    { pattern: /\/quotes\/([^/]+)/, type: 'quote' },
    { pattern: /\/leads\/([^/]+)/, type: 'lead' },
    { pattern: /\/equipment\/([^/]+)/, type: 'equipment' },
    { pattern: /\/schedule/, type: 'schedule' },
  ];

  for (const { pattern, type } of patterns) {
    const match = route.match(pattern);
    if (match) {
      return { entityType: type, entityId: match[1] !== 'new' ? match[1] : undefined };
    }
  }

  return { entityType: 'other' };
}

/**
 * Generate default label from route
 */
function generateLabelFromRoute(route: string): string {
  const labelMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/my-day': 'My Day',
    '/schedule': 'Schedule',
    '/jobs': 'Jobs',
    '/customers': 'Customers',
    '/invoices': 'Invoices',
    '/quotes': 'Quotes',
    '/leads': 'Leads',
    '/messages': 'Messages',
    '/reports': 'Reports',
    '/settings': 'Settings',
  };

  // Direct match
  if (labelMap[route]) {
    return labelMap[route];
  }

  // Extract from path
  const segments = route.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';

  // Get the last meaningful segment
  const lastSegment = segments[segments.length - 1];

  // If it's an ID (UUID or similar), use the previous segment
  if (lastSegment.match(/^[a-f0-9-]{8,}$/i) || lastSegment === 'new') {
    const entitySegment = segments[segments.length - 2];
    if (entitySegment) {
      // Capitalize and singularize
      const singular = entitySegment.replace(/s$/, '');
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
  }

  // Capitalize the segment
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
}

/**
 * Check if two routes are the same (ignoring query params)
 */
function isSameRoute(route1: string, route2: string): boolean {
  const path1 = route1.split('?')[0];
  const path2 = route2.split('?')[0];
  return path1 === path2;
}

/**
 * Check if navigation is cross-entity (should clear stack)
 */
function isCrossEntityNavigation(
  from: NavigationEntry | null,
  to: Omit<NavigationEntry, 'timestamp'>
): boolean {
  if (!from) return false;

  const fromInfo = from.entityType ? { entityType: from.entityType, entityId: from.entityId } : extractEntityInfo(from.route);
  const toInfo = to.entityType ? { entityType: to.entityType, entityId: to.entityId } : extractEntityInfo(to.route);

  // Different entity types = cross-entity
  if (fromInfo.entityType !== toInfo.entityType && toInfo.entityType !== 'other') {
    // Exception: navigating from a detail to a list is not cross-entity
    if (!toInfo.entityId && fromInfo.entityType === toInfo.entityType) {
      return false;
    }
    return true;
  }

  // Same entity type but different entity ID = cross-entity
  if (
    fromInfo.entityType === toInfo.entityType &&
    fromInfo.entityId &&
    toInfo.entityId &&
    fromInfo.entityId !== toInfo.entityId
  ) {
    return true;
  }

  return false;
}

interface NavigationProviderProps {
  children: ReactNode;
}

/**
 * Navigation Provider Component
 */
export function NavigationProvider({ children }: NavigationProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stack, setStack] = useState<NavigationEntry[]>([]);
  const lastPathRef = useRef<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Get current and previous entries
  const currentEntry = stack.length > 0 ? stack[stack.length - 1] : null;
  const previousEntry = stack.length > 1 ? stack[stack.length - 2] : null;
  const canGoBack = stack.length > 1;

  // Push new entry
  const push = useCallback((entry: Omit<NavigationEntry, 'timestamp'>) => {
    setStack((prev) => {
      const newEntry: NavigationEntry = {
        ...entry,
        timestamp: Date.now(),
      };

      // Check for cross-entity navigation
      const current = prev.length > 0 ? prev[prev.length - 1] : null;
      if (isCrossEntityNavigation(current, entry)) {
        // Clear stack and start fresh
        return [newEntry];
      }

      // Check if same route already exists - replace instead of stack
      const existingIndex = prev.findIndex((e) => isSameRoute(e.route, entry.route));
      if (existingIndex !== -1) {
        // Replace the existing entry and remove everything after
        const newStack = prev.slice(0, existingIndex);
        newStack.push(newEntry);
        return newStack;
      }

      // Add new entry and enforce max depth
      const newStack = [...prev, newEntry];
      if (newStack.length > MAX_STACK_DEPTH) {
        return newStack.slice(-MAX_STACK_DEPTH);
      }

      return newStack;
    });
  }, []);

  // Replace current entry
  const replace = useCallback((entry: Omit<NavigationEntry, 'timestamp'>) => {
    setStack((prev) => {
      if (prev.length === 0) {
        return [{ ...entry, timestamp: Date.now() }];
      }

      const newStack = [...prev];
      newStack[newStack.length - 1] = { ...entry, timestamp: Date.now() };
      return newStack;
    });
  }, []);

  // Go back
  const goBack = useCallback(() => {
    if (stack.length > 1) {
      isNavigatingRef.current = true;
      const targetEntry = stack[stack.length - 2];

      // Pop current entry
      setStack((prev) => prev.slice(0, -1));

      // Navigate and restore scroll
      router.push(targetEntry.route);

      // Restore scroll position after navigation
      if (targetEntry.scrollPosition !== undefined) {
        requestAnimationFrame(() => {
          window.scrollTo(0, targetEntry.scrollPosition!);
          isNavigatingRef.current = false;
        });
      } else {
        isNavigatingRef.current = false;
      }
    } else {
      // Fallback to dashboard
      router.push('/dashboard');
    }
  }, [stack, router]);

  // Go back to specific route
  const goBackTo = useCallback(
    (route: string) => {
      const targetIndex = stack.findIndex((e) => isSameRoute(e.route, route));
      if (targetIndex !== -1) {
        isNavigatingRef.current = true;
        const targetEntry = stack[targetIndex];

        // Remove everything after target
        setStack((prev) => prev.slice(0, targetIndex + 1));

        // Navigate
        router.push(targetEntry.route);

        // Restore scroll
        if (targetEntry.scrollPosition !== undefined) {
          requestAnimationFrame(() => {
            window.scrollTo(0, targetEntry.scrollPosition!);
            isNavigatingRef.current = false;
          });
        } else {
          isNavigatingRef.current = false;
        }
      }
    },
    [stack, router]
  );

  // Clear stack
  const clearStack = useCallback(() => {
    setStack([]);
  }, []);

  // Get back label
  const getBackLabel = useCallback(() => {
    if (previousEntry) {
      return previousEntry.label;
    }
    return 'Back';
  }, [previousEntry]);

  // Update scroll position
  const updateScrollPosition = useCallback((position: number) => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      newStack[newStack.length - 1] = {
        ...newStack[newStack.length - 1],
        scrollPosition: position,
      };
      return newStack;
    });
  }, []);

  // Track scroll position on current page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking && !isNavigatingRef.current) {
        requestAnimationFrame(() => {
          updateScrollPosition(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateScrollPosition]);

  // Auto-track navigation (for routes not explicitly pushed)
  useEffect(() => {
    if (pathname && pathname !== lastPathRef.current && !isNavigatingRef.current) {
      lastPathRef.current = pathname;

      // Don't auto-track if this was a goBack navigation
      const label = generateLabelFromRoute(pathname);
      const { entityType, entityId } = extractEntityInfo(pathname);

      // Check if already current
      if (currentEntry && isSameRoute(currentEntry.route, pathname)) {
        return;
      }

      push({
        route: pathname,
        label,
        params: {},
        entityType,
        entityId,
      });
    }
  }, [pathname, push, currentEntry]);

  // Handle swipe-from-left gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = window.innerWidth * 0.5; // 50% of screen width
    const EDGE_ZONE = 30; // px from left edge

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_ZONE) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX === 0) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // Check for horizontal swipe from edge
      if (deltaX > SWIPE_THRESHOLD && deltaY < 100 && canGoBack) {
        goBack();
      }

      touchStartX = 0;
      touchStartY = 0;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canGoBack, goBack]);

  const value: NavigationContextValue = {
    stack,
    currentEntry,
    previousEntry,
    push,
    replace,
    goBack,
    goBackTo,
    clearStack,
    getBackLabel,
    canGoBack,
    updateScrollPosition,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

/**
 * Hook to access navigation context
 */
export function useNavigationContext(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
}
