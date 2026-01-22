// =====================================================
// REVENUE RECOVERY TYPE DEFINITIONS
// v6.0 - Revenue Recovery Feature Types
// =====================================================

/**
 * Trigger types for recovery automation
 */
export type RecoveryTriggerType =
  | 'missed_call'
  | 'estimate_followup'
  | 'no_show'
  | 'after_hours';

/**
 * Confidence levels for attribution
 */
export type AttributionConfidence = 'high' | 'medium' | 'low';

/**
 * Status for recovery opportunities
 */
export type RecoveryOpportunityStatus =
  | 'pending'
  | 'sent'
  | 'responded'
  | 'converted';

/**
 * Outcome types for recovery actions
 */
export type RecoveryOutcome =
  | 'success'
  | 'pending'
  | 'no_response';

/**
 * Revenue Attribution - tracks revenue influenced by automated recovery
 */
export interface RevenueAttribution {
  id: string;
  organizationId: string;

  // Trigger (what started the recovery attempt)
  triggerType: RecoveryTriggerType;
  triggerId: string;
  triggerAt: Date;

  // Action (what the system did)
  actionType: string;
  actionId?: string;
  actionAt: Date;

  // Outcome (what resulted)
  outcomeType?: string;
  outcomeId?: string;
  outcomeAt?: Date;

  // Attribution
  revenueAmountCents: number;
  confidence: AttributionConfidence;
  windowHours: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client Recovery Settings - per-organization configuration
 */
export interface ClientRecoverySettings {
  organizationId: string;
  recoveryEnabled: boolean;
  recoveryLocked: boolean;
  clientCanDisable: boolean;
  attributionWindowHours: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recovery Summary - aggregated stats for display
 */
export interface RevenueRecoverySummary {
  influencedRevenue: number;
  periodLabel: string;
  recoveryRate: number;
  missedCallsRecovered: number;
  afterHoursConverted: number;
  estimateFollowupsConverted: number;
}

/**
 * Recovery Opportunity - pending recovery attempt
 */
export interface RecoveryOpportunity {
  id: string;
  type: RecoveryTriggerType;
  customerName: string;
  timestamp: string;
  status: RecoveryOpportunityStatus;
  estimatedValue?: number;
}

/**
 * System Coverage - status of recovery automation
 */
export interface SystemCoverage {
  missedCalls: CoverageStatus;
  afterHours: CoverageStatus;
  estimateFollowups: CoverageStatus;
  noShows: CoverageStatus;
}

export interface CoverageStatus {
  enabled: boolean;
  lastTriggered: string | null;
}

/**
 * Recent Activity - completed recovery actions
 */
export interface RecentRecoveryActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  outcome?: RecoveryOutcome;
  revenue?: number;
}

/**
 * Admin Platform Stats - aggregate stats for admin dashboard
 */
export interface RecoveryPlatformStats {
  totalInfluencedRevenue: number;
  activeClientsCount: number;
  avgRecoveryRate: number;
  avgLatencyHours: number;
  periodComparison: {
    revenueChange: number;
    rateChange: number;
  };
}

/**
 * Admin Client Recovery Data - client row in admin table
 */
export interface AdminClientRecoveryData {
  id: string;
  businessName: string;
  recoveryEnabled: boolean;
  recoveryLocked: boolean;
  clientCanDisable: boolean;
  attributionWindowHours: number;
  totalInfluenced: number;
  recoveryRate: number;
  lastActivity: string | null;
}

/**
 * API Response Types
 */
export interface RecoverySummaryResponse {
  summary: RevenueRecoverySummary;
  coverage: SystemCoverage;
  opportunities: RecoveryOpportunity[];
  recentActivity: RecentRecoveryActivity[];
  settings: {
    recoveryEnabled: boolean;
    canDisable: boolean;
    isLocked: boolean;
  };
}

export interface RecoverySettingsResponse {
  recoveryEnabled: boolean;
  recoveryLocked: boolean;
  clientCanDisable: boolean;
  attributionWindowHours: number;
}

export interface AdminOverviewResponse extends RecoveryPlatformStats {}

export interface AdminClientsResponse {
  clients: AdminClientRecoveryData[];
}

/**
 * Settings Update Request
 */
export interface UpdateRecoverySettingsRequest {
  recoveryEnabled?: boolean;
  recoveryLocked?: boolean;
  clientCanDisable?: boolean;
  attributionWindowHours?: number;
}
