/**
 * Nudge Engine
 *
 * Per CIL Spec Section 1.2:
 * - Max 2 nudges per screen
 * - Never block primary action
 * - Empty state = show nothing (no placeholder)
 * - Dismissal persists per-context
 * - Evaluates all registered evaluators and returns prioritized nudges
 *
 * CRITICAL RULE: A nudge may never create another nudge automatically.
 * This prevents cascading intelligence and maintains user trust.
 *
 * NOTE: Some nudges are informational for technicians but actionable
 * by office staff. Future dashboards may surface the same signals differently.
 */

import type {
  Nudge,
  NudgeContext,
  NudgeEvaluator,
  NudgeEvaluatorResult,
  NudgeEntityType,
  DEFAULT_NUDGE_DISPLAY_CONFIG,
} from './types';
import {
  isNudgeDismissed,
  calculateContextHash,
  hasContextChanged,
} from './dismissal-store';

/**
 * Registered evaluators
 */
const evaluators: Map<string, NudgeEvaluator> = new Map();

/**
 * Register a nudge evaluator
 */
export function registerEvaluator(evaluator: NudgeEvaluator): void {
  evaluators.set(evaluator.id, evaluator);
}

/**
 * Unregister a nudge evaluator
 */
export function unregisterEvaluator(id: string): void {
  evaluators.delete(id);
}

/**
 * Get all registered evaluators
 */
export function getRegisteredEvaluators(): NudgeEvaluator[] {
  return Array.from(evaluators.values());
}

/**
 * Evaluate all nudges for a given context
 */
export async function evaluateNudges(
  context: NudgeContext,
  maxNudges: number = 2
): Promise<Nudge[]> {
  const applicableEvaluators = getApplicableEvaluators(context);
  const results: Array<{ evaluator: NudgeEvaluator; result: NudgeEvaluatorResult }> = [];

  // Run all evaluators in parallel
  const evaluatorPromises = applicableEvaluators.map(async (evaluator) => {
    try {
      const result = await evaluator.evaluate(context);
      return { evaluator, result };
    } catch (error) {
      console.error(`Nudge evaluator ${evaluator.id} failed:`, error);
      return { evaluator, result: { shouldShow: false } };
    }
  });

  const evaluatedResults = await Promise.all(evaluatorPromises);

  // Filter and collect nudges
  const nudges: Nudge[] = [];

  for (const { evaluator, result } of evaluatedResults) {
    if (!result.shouldShow || !result.nudge) continue;

    // Check if dismissed
    if (
      isNudgeDismissed(
        result.nudge.source,
        result.nudge.entityType,
        result.nudge.entityId,
        result.contextHash
      )
    ) {
      // Check for material condition change
      if (result.contextHash) {
        const changed = hasContextChanged(
          result.nudge.source,
          result.nudge.entityType,
          result.nudge.entityId,
          result.contextHash
        );
        if (!changed) continue;
      } else {
        continue;
      }
    }

    // Check if in dismissed list from context
    const nudgeId = generateNudgeId(result.nudge);
    if (context.dismissedNudgeIds.includes(nudgeId)) {
      continue;
    }

    nudges.push({
      ...result.nudge,
      id: nudgeId,
      createdAt: new Date(),
      contextHash: result.contextHash,
    });
  }

  // Sort by priority (higher first) and limit
  return nudges
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxNudges);
}

/**
 * Get evaluators applicable to the current context
 */
function getApplicableEvaluators(context: NudgeContext): NudgeEvaluator[] {
  const entityType = context.entity?.type;

  return Array.from(evaluators.values()).filter((evaluator) => {
    // If no entity, only return evaluators that work without entity
    if (!entityType) {
      return evaluator.entityTypes.includes('customer') ||
        evaluator.entityTypes.includes('job');
    }

    // Match entity type
    return evaluator.entityTypes.includes(entityType);
  });
}

/**
 * Generate a deterministic nudge ID
 */
function generateNudgeId(nudge: Omit<Nudge, 'id' | 'createdAt'>): string {
  return `${nudge.source}:${nudge.entityType}:${nudge.entityId}`;
}

/**
 * Build context for a customer detail page
 */
export function buildCustomerContext(
  userId: string,
  organizationId: string,
  customer: NudgeContext['customer'],
  options: {
    equipment?: NudgeContext['equipment'];
    dismissedNudgeIds?: string[];
  } = {}
): NudgeContext {
  return {
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
    dismissedNudgeIds: options.dismissedNudgeIds || [],
  };
}

/**
 * Build context for a job briefing page
 */
export function buildJobContext(
  userId: string,
  organizationId: string,
  job: NudgeContext['job'],
  customer: NudgeContext['customer'],
  options: {
    equipment?: NudgeContext['equipment'];
    dismissedNudgeIds?: string[];
  } = {}
): NudgeContext {
  return {
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
    dismissedNudgeIds: options.dismissedNudgeIds || [],
  };
}

/**
 * Build context for invoice creation
 */
export function buildInvoiceContext(
  userId: string,
  organizationId: string,
  job: NudgeContext['job'],
  customer: NudgeContext['customer'],
  options: {
    equipment?: NudgeContext['equipment'];
    dismissedNudgeIds?: string[];
  } = {}
): NudgeContext {
  return {
    userId,
    organizationId,
    screen: 'invoice_create',
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
    dismissedNudgeIds: options.dismissedNudgeIds || [],
  };
}

/**
 * Performance: Evaluate nudges with timeout
 */
export async function evaluateNudgesWithTimeout(
  context: NudgeContext,
  maxNudges: number = 2,
  timeoutMs: number = 50 // Per spec: <50ms
): Promise<Nudge[]> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('Nudge evaluation timed out');
      resolve([]);
    }, timeoutMs);

    evaluateNudges(context, maxNudges)
      .then((nudges) => {
        clearTimeout(timeout);
        resolve(nudges);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('Nudge evaluation failed:', error);
        resolve([]);
      });
  });
}

/**
 * Nudge action handlers registry
 */
const actionHandlers: Map<string, (nudge: Nudge, context: NudgeContext) => void | Promise<void>> =
  new Map();

/**
 * Register an action handler
 */
export function registerActionHandler(
  name: string,
  handler: (nudge: Nudge, context: NudgeContext) => void | Promise<void>
): void {
  actionHandlers.set(name, handler);
}

/**
 * Execute a nudge action
 */
export async function executeNudgeAction(
  nudge: Nudge,
  context: NudgeContext
): Promise<boolean> {
  if (!nudge.actionHandler) {
    return false;
  }

  const handler = actionHandlers.get(nudge.actionHandler);
  if (!handler) {
    console.warn(`No action handler registered for: ${nudge.actionHandler}`);
    return false;
  }

  try {
    await handler(nudge, context);
    return true;
  } catch (error) {
    console.error(`Action handler ${nudge.actionHandler} failed:`, error);
    return false;
  }
}
