'use client';

/**
 * Navigation Hook
 *
 * Simplified hook for common navigation operations.
 * Wraps NavigationContext with convenience methods.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigationContext, type NavigationEntry } from './navigation-context';

/**
 * Navigation options for push
 */
export interface NavigateOptions {
  /** Custom label for back button */
  label?: string;
  /** Replace current entry instead of pushing */
  replace?: boolean;
  /** Entity type for cross-entity detection */
  entityType?: NavigationEntry['entityType'];
  /** Entity ID */
  entityId?: string;
}

/**
 * Hook for contextual navigation
 */
export function useNavigation() {
  const router = useRouter();
  const context = useNavigationContext();

  /**
   * Navigate to a route with context preservation
   */
  const navigate = useCallback(
    (route: string, options: NavigateOptions = {}) => {
      const { label, replace = false, entityType, entityId } = options;

      const entry = {
        route,
        label: label || generateLabel(route),
        params: {},
        entityType,
        entityId,
      };

      if (replace) {
        context.replace(entry);
      } else {
        context.push(entry);
      }

      router.push(route);
    },
    [router, context]
  );

  /**
   * Navigate to a job with context
   */
  const navigateToJob = useCallback(
    (jobId: string, jobLabel?: string) => {
      navigate(`/jobs/${jobId}`, {
        label: jobLabel || 'Job',
        entityType: 'job',
        entityId: jobId,
      });
    },
    [navigate]
  );

  /**
   * Navigate to a customer with context
   */
  const navigateToCustomer = useCallback(
    (customerId: string, customerName?: string) => {
      navigate(`/customers/${customerId}`, {
        label: customerName || 'Customer',
        entityType: 'customer',
        entityId: customerId,
      });
    },
    [navigate]
  );

  /**
   * Navigate to an invoice with context
   */
  const navigateToInvoice = useCallback(
    (invoiceId: string, invoiceNumber?: string) => {
      navigate(`/invoices/${invoiceId}`, {
        label: invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice',
        entityType: 'invoice',
        entityId: invoiceId,
      });
    },
    [navigate]
  );

  /**
   * Navigate to a quote with context
   */
  const navigateToQuote = useCallback(
    (quoteId: string, quoteNumber?: string) => {
      navigate(`/quotes/${quoteId}`, {
        label: quoteNumber ? `Quote ${quoteNumber}` : 'Quote',
        entityType: 'quote',
        entityId: quoteId,
      });
    },
    [navigate]
  );

  /**
   * Navigate to schedule
   */
  const navigateToSchedule = useCallback(() => {
    navigate('/schedule', {
      label: 'Schedule',
      entityType: 'schedule',
    });
  }, [navigate]);

  /**
   * Navigate from schedule to job (common pattern)
   */
  const navigateFromScheduleToJob = useCallback(
    (jobId: string, jobTitle?: string) => {
      // First ensure schedule is in the stack
      context.push({
        route: '/schedule',
        label: 'Schedule',
        params: {},
        entityType: 'schedule',
      });

      // Then navigate to job
      navigateToJob(jobId, jobTitle);
    },
    [context, navigateToJob]
  );

  return {
    // Core navigation
    navigate,
    goBack: context.goBack,
    goBackTo: context.goBackTo,
    clearStack: context.clearStack,

    // Entity navigation helpers
    navigateToJob,
    navigateToCustomer,
    navigateToInvoice,
    navigateToQuote,
    navigateToSchedule,
    navigateFromScheduleToJob,

    // Stack info
    stack: context.stack,
    currentEntry: context.currentEntry,
    previousEntry: context.previousEntry,
    canGoBack: context.canGoBack,
    getBackLabel: context.getBackLabel,

    // Scroll management
    updateScrollPosition: context.updateScrollPosition,
  };
}

/**
 * Generate label from route path
 */
function generateLabel(route: string): string {
  const labelMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/my-day': 'My Day',
    '/schedule': 'Schedule',
    '/jobs': 'Jobs',
    '/jobs/new': 'New Job',
    '/customers': 'Customers',
    '/customers/new': 'New Customer',
    '/invoices': 'Invoices',
    '/invoices/new': 'New Invoice',
    '/quotes': 'Quotes',
    '/quotes/new': 'New Quote',
    '/leads': 'Leads',
    '/messages': 'Messages',
    '/reports': 'Reports',
    '/settings': 'Settings',
  };

  if (labelMap[route]) {
    return labelMap[route];
  }

  // Extract meaningful label from path
  const segments = route.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';

  const lastSegment = segments[segments.length - 1];

  // Skip UUIDs
  if (lastSegment.match(/^[a-f0-9-]{8,}$/i)) {
    if (segments.length > 1) {
      const entityType = segments[segments.length - 2];
      const singular = entityType.replace(/s$/, '');
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
  }

  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
}

/**
 * Hook for just the back functionality
 * Lighter weight for components that only need back
 */
export function useContextualBack() {
  const { goBack, canGoBack, getBackLabel, previousEntry } = useNavigationContext();

  return {
    goBack,
    canGoBack,
    backLabel: getBackLabel(),
    previousRoute: previousEntry?.route,
  };
}
