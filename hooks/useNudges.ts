'use client';

/**
 * useNudges Hook
 *
 * Per CIL Spec Section 1.2:
 * - Evaluates nudges for current context
 * - Max 2 nudges per screen
 * - Handles dismissal
 * - <50ms evaluation target
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Nudge, NudgeContext, NudgeEntityType } from '@/lib/nudges/types';
import {
  evaluateNudgesWithTimeout,
  dismissNudge,
  buildCustomerContext,
  buildJobContext,
  buildInvoiceContext,
  executeNudgeAction,
} from '@/lib/nudges';

interface UseNudgesOptions {
  /** User ID */
  userId: string;
  /** Organization ID */
  organizationId: string;
  /** Current screen identifier */
  screen: string;
  /** Entity being viewed */
  entity?: {
    type: NudgeEntityType;
    id: string;
    data?: Record<string, unknown>;
  };
  /** Customer data (if applicable) */
  customer?: NudgeContext['customer'];
  /** Job data (if applicable) */
  job?: NudgeContext['job'];
  /** Equipment data (if applicable) */
  equipment?: NudgeContext['equipment'];
  /** Maximum nudges to show */
  maxNudges?: number;
  /** Evaluation timeout in ms */
  timeoutMs?: number;
  /** Whether to auto-refresh periodically */
  autoRefresh?: boolean;
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Whether evaluation is enabled */
  enabled?: boolean;
}

interface UseNudgesResult {
  /** Current nudges to display */
  nudges: Nudge[];
  /** Whether nudges are being evaluated */
  isLoading: boolean;
  /** Error if evaluation failed */
  error: Error | null;
  /** Dismiss a nudge */
  dismiss: (nudge: Nudge) => Promise<void>;
  /** Execute a nudge action */
  executeAction: (nudge: Nudge) => Promise<boolean>;
  /** Manually refresh nudges */
  refresh: () => Promise<void>;
  /** Whether there are nudges to show */
  hasNudges: boolean;
}

/**
 * Hook for evaluating and managing nudges
 */
export function useNudges(options: UseNudgesOptions): UseNudgesResult {
  const {
    userId,
    organizationId,
    screen,
    entity,
    customer,
    job,
    equipment,
    maxNudges = 2,
    timeoutMs = 50,
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
    enabled = true,
  } = options;

  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const lastContextRef = useRef<string>('');
  const mountedRef = useRef(true);

  // Build context
  const buildContext = useCallback((): NudgeContext => {
    return {
      userId,
      organizationId,
      screen,
      entity,
      customer,
      job,
      equipment,
      dismissedNudgeIds: dismissedIds,
    };
  }, [userId, organizationId, screen, entity, customer, job, equipment, dismissedIds]);

  // Evaluate nudges
  const evaluate = useCallback(async () => {
    if (!enabled || !userId || !organizationId) {
      setNudges([]);
      return;
    }

    const context = buildContext();

    // Skip if context hasn't changed
    const contextKey = JSON.stringify({
      screen,
      entityType: entity?.type,
      entityId: entity?.id,
      customerId: customer?.id,
      jobId: job?.id,
    });

    if (contextKey === lastContextRef.current && nudges.length > 0) {
      return;
    }

    lastContextRef.current = contextKey;
    setIsLoading(true);
    setError(null);

    try {
      const evaluatedNudges = await evaluateNudgesWithTimeout(
        context,
        maxNudges,
        timeoutMs
      );

      if (mountedRef.current) {
        setNudges(evaluatedNudges);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to evaluate nudges'));
        setNudges([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    enabled,
    userId,
    organizationId,
    screen,
    entity,
    customer,
    job,
    buildContext,
    maxNudges,
    timeoutMs,
    nudges.length,
  ]);

  // Dismiss a nudge
  const dismiss = useCallback(
    async (nudge: Nudge) => {
      // Optimistic update
      setNudges((prev) => prev.filter((n) => n.id !== nudge.id));
      setDismissedIds((prev) => [...prev, nudge.id]);

      try {
        await dismissNudge(userId, nudge.source, {
          entityType: nudge.entityType,
          entityId: nudge.entityId,
          contextKey: nudge.contextHash,
        });
      } catch (err) {
        console.error('Failed to dismiss nudge:', err);
        // Revert on error
        setNudges((prev) => [...prev, nudge].sort((a, b) => b.priority - a.priority));
        setDismissedIds((prev) => prev.filter((id) => id !== nudge.id));
      }
    },
    [userId]
  );

  // Execute nudge action
  const executeAction = useCallback(
    async (nudge: Nudge): Promise<boolean> => {
      const context = buildContext();
      return executeNudgeAction(nudge, context);
    },
    [buildContext]
  );

  // Manual refresh
  const refresh = useCallback(async () => {
    lastContextRef.current = ''; // Force re-evaluation
    await evaluate();
  }, [evaluate]);

  // Initial evaluation
  useEffect(() => {
    mountedRef.current = true;
    evaluate();

    return () => {
      mountedRef.current = false;
    };
  }, [evaluate]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      if (mountedRef.current) {
        refresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, refresh]);

  return {
    nudges,
    isLoading,
    error,
    dismiss,
    executeAction,
    refresh,
    hasNudges: nudges.length > 0,
  };
}

/**
 * Hook for nudges on customer detail page
 */
export function useCustomerNudges(
  userId: string,
  organizationId: string,
  customer: NudgeContext['customer'],
  options: {
    equipment?: NudgeContext['equipment'];
    enabled?: boolean;
  } = {}
): UseNudgesResult {
  return useNudges({
    userId,
    organizationId,
    screen: 'customer_detail',
    entity: customer
      ? {
          type: 'customer',
          id: customer.id,
          data: customer as Record<string, unknown>,
        }
      : undefined,
    customer,
    equipment: options.equipment,
    enabled: options.enabled ?? !!customer,
  });
}

/**
 * Hook for nudges on job briefing page
 */
export function useJobBriefingNudges(
  userId: string,
  organizationId: string,
  job: NudgeContext['job'],
  customer: NudgeContext['customer'],
  options: {
    equipment?: NudgeContext['equipment'];
    enabled?: boolean;
  } = {}
): UseNudgesResult {
  return useNudges({
    userId,
    organizationId,
    screen: 'job_briefing',
    entity: job
      ? {
          type: 'job',
          id: job.id,
          data: job as Record<string, unknown>,
        }
      : undefined,
    job,
    customer,
    equipment: options.equipment,
    enabled: options.enabled ?? !!job,
  });
}

/**
 * Hook for nudges on invoice creation page
 */
export function useInvoiceNudges(
  userId: string,
  organizationId: string,
  job: NudgeContext['job'],
  customer: NudgeContext['customer'],
  options: {
    equipment?: NudgeContext['equipment'];
    previousNotes?: Array<{ id: string; text: string; jobId: string; createdAt: Date }>;
    enabled?: boolean;
  } = {}
): UseNudgesResult {
  // Include previous notes in entity data for While I'm Here evaluator
  const entityData = job
    ? {
        ...job,
        previousNotes: options.previousNotes,
      }
    : undefined;

  return useNudges({
    userId,
    organizationId,
    screen: 'invoice_create',
    entity: job
      ? {
          type: 'job',
          id: job.id,
          data: entityData as Record<string, unknown>,
        }
      : undefined,
    job,
    customer,
    equipment: options.equipment,
    enabled: options.enabled ?? !!job,
  });
}
