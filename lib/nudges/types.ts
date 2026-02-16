/**
 * Nudge System Types
 *
 * Per CIL Spec Section 1.2:
 * - Nudges are inline on current screen
 * - Link-weight styling (font-weight: 400)
 * - Dismissible
 * - Never blocks primary action
 * - Max 2 per screen
 */

/**
 * Nudge type - determines icon and visual treatment
 */
export type NudgeType = 'insight' | 'reminder' | 'suggestion' | 'status';

/**
 * Nudge source - where the nudge originated
 */
export type NudgeSource =
  | 'quiet_customer'
  | 'promise_keeper'
  | 'maintenance_tracker'
  | 'while_im_here'
  | 'job_briefing';

/**
 * Entity types that nudges can be associated with
 */
export type NudgeEntityType = 'customer' | 'job' | 'equipment' | 'agreement' | 'invoice';

/**
 * Core nudge interface
 */
export interface Nudge {
  /** Unique identifier */
  id: string;

  /** Type determines icon and visual treatment */
  type: NudgeType;

  /** Associated entity type */
  entityType: NudgeEntityType;

  /** Associated entity ID */
  entityId: string;

  /** Main message (≤60 characters recommended) */
  message: string;

  /** Secondary description (optional) */
  description?: string;

  /** Action label (e.g., "Send check-in →") */
  actionLabel?: string;

  /** Route to navigate on action click */
  actionRoute?: string;

  /** Custom action handler name */
  actionHandler?: string;

  /** Priority for sorting (1-10, higher = more important) */
  priority: number;

  /** Source system that generated the nudge */
  source: NudgeSource;

  /** Hash of conditions that generated nudge (for change detection) */
  contextHash?: string;

  /** When the nudge expires automatically */
  expiresAt?: Date;

  /** When the nudge was dismissed */
  dismissedAt?: Date;

  /** Dismiss until this date (temporary dismissal) */
  dismissedUntil?: Date;

  /** When the nudge was created */
  createdAt: Date;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Nudge configuration for evaluators
 */
export interface NudgeConfig {
  /** Whether this nudge type is enabled */
  enabled: boolean;

  /** Priority override */
  priority?: number;

  /** Custom thresholds */
  thresholds?: Record<string, number>;
}

/**
 * Nudge evaluator result
 */
export interface NudgeEvaluatorResult {
  /** Whether a nudge should be shown */
  shouldShow: boolean;

  /** The nudge to display (if shouldShow is true) */
  nudge?: Omit<Nudge, 'id' | 'createdAt'>;

  /** Context hash for change detection */
  contextHash?: string;
}

/**
 * Nudge evaluator interface
 */
export interface NudgeEvaluator {
  /** Unique identifier for this evaluator */
  id: string;

  /** Source type this evaluator generates */
  source: NudgeSource;

  /** Entity types this evaluator applies to */
  entityTypes: NudgeEntityType[];

  /** Evaluate and return nudge result */
  evaluate: (context: NudgeContext) => Promise<NudgeEvaluatorResult>;
}

/**
 * Context passed to nudge evaluators
 */
export interface NudgeContext {
  /** Current user ID */
  userId: string;

  /** Organization ID */
  organizationId: string;

  /** Current screen/page */
  screen: string;

  /** Entity being viewed (if any) */
  entity?: {
    type: NudgeEntityType;
    id: string;
    data?: Record<string, unknown>;
  };

  /** Customer data (if applicable) */
  customer?: {
    id: string;
    name: string;
    lastJobDate?: Date;
    hasMaintenanceAgreement?: boolean;
    agreementExpiresAt?: Date;
    tags?: string[];
    totalJobs?: number;
  };

  /** Job data (if applicable) */
  job?: {
    id: string;
    customerId: string;
    status: string;
    scheduledAt?: Date;
    notes?: string;
    equipmentIds?: string[];
  };

  /** Equipment data (if applicable) */
  equipment?: {
    id: string;
    type: string;
    installDate?: Date;
    lastServiceDate?: Date;
    age?: number; // in years
  }[];

  /** Dismissed nudge IDs for this context */
  dismissedNudgeIds: string[];
}

/**
 * Nudge dismissal record
 */
export interface NudgeDismissal {
  /** Unique ID */
  id: string;

  /** User who dismissed */
  userId: string;

  /** Nudge type that was dismissed */
  nudgeType: NudgeSource;

  /** Entity type */
  entityType?: NudgeEntityType;

  /** Entity ID */
  entityId?: string;

  /** Context key for specific dismissals */
  contextKey?: string;

  /** When dismissed */
  dismissedAt: Date;

  /** When dismissal expires (null = permanent) */
  expiresAt?: Date | null;
}

/**
 * Nudge display configuration
 */
export interface NudgeDisplayConfig {
  /** Maximum nudges to show per screen */
  maxPerScreen: number;

  /** Whether to show empty state */
  showEmptyState: boolean;

  /** Animation settings */
  animate: boolean;
}

/**
 * Default display configuration per spec
 */
export const DEFAULT_NUDGE_DISPLAY_CONFIG: NudgeDisplayConfig = {
  maxPerScreen: 2,
  showEmptyState: false, // "Empty state = show nothing (no placeholder)"
  animate: false, // "Nudges must NOT animate, pulse, or demand attention"
};

/**
 * Nudge icon mapping
 */
export const NUDGE_ICONS: Record<NudgeType, string> = {
  insight: '💡',
  reminder: '⏰',
  suggestion: '📋',
  status: '🕐',
};

/**
 * Nudge type descriptions
 */
export const NUDGE_TYPE_DESCRIPTIONS: Record<NudgeType, string> = {
  insight: 'Historical pattern',
  reminder: 'Time-based follow-up',
  suggestion: 'Contextual opportunity',
  status: 'Account/agreement state',
};
