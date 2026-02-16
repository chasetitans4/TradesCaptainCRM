// =====================================================
// REPUTATION MANAGER TYPES
//
// Convert completed jobs into verified public reputation
// Consumes Proof of Work artifacts (READ-ONLY reference)
//
// CRITICAL INTEGRATION DIRECTIVE:
//   - Proof of Work is EXISTING and IMMUTABLE
//   - NEVER modify PoW records
//   - NEVER duplicate PoW tables or logic
//   - Reference PoW by foreign key ONLY
// =====================================================

// =====================================================
// ENUMS AND LITERAL TYPES
// =====================================================

/** Reputation request status lifecycle */
export type ReputationRequestStatus =
  | 'pending'           // Created, not yet sent
  | 'scheduled'         // Scheduled for future delivery
  | 'sent'              // Delivered to customer
  | 'delivered'         // Confirmed delivery
  | 'opened'            // Customer opened the link
  | 'feedback_received' // Customer submitted feedback
  | 'review_requested'  // Positive: sent to review site
  | 'recovery_started'  // Negative: human recovery initiated
  | 'completed'         // Workflow complete
  | 'expired';          // No response within expiry period

/** Delivery channel options */
export type ReputationDeliveryChannel = 'SMS' | 'EMAIL' | 'BOTH';

/** TCPA consent method */
export type TCPAConsentMethod = 'transactional' | 'prior_express' | 'customer_initiated';

/** Sentiment category (determines routing) */
export type SentimentCategory = 'positive' | 'neutral' | 'negative';

/** Recovery status */
export type RecoveryStatus = 'pending' | 'in_progress' | 'resolved' | 'escalated' | 'closed';

/** Recovery action types */
export type RecoveryActionType =
  | 'assigned'
  | 'reassigned'
  | 'note_added'
  | 'status_changed'
  | 'customer_contacted'
  | 'resolution_offered'
  | 'resolved'
  | 'escalated'
  | 'closed';

/** Review platform types */
export type ReviewPlatform = 'google' | 'facebook' | 'yelp' | 'nextdoor' | 'other';

/** PoW link position in message */
export type PowLinkPosition = 'before_feedback' | 'after_feedback' | 'separate_message';

// =====================================================
// CORE INTERFACES
// =====================================================

/** Main reputation request record */
export interface ReputationRequest {
  id: string;
  business_id: string;
  customer_id: string;
  job_id: string;

  // PoW Reference (READ-ONLY - NEVER modify the referenced PoW)
  proof_of_work_id?: string;

  // Request identification
  access_token: string;

  // Status
  status: ReputationRequestStatus;

  // Delivery configuration
  delivery_channel: ReputationDeliveryChannel;
  delivery_delay_minutes: number;

  // Delivery tracking
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  delivery_failed_at?: string;
  delivery_error?: string;
  delivery_attempts: number;

  // TCPA Compliance
  tcpa_consent_method: TCPAConsentMethod;
  tcpa_consent_at?: string;
  opt_out_at?: string;

  // Reminder tracking
  reminder_sent_at?: string;
  reminder_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

/** Reputation feedback record */
export interface ReputationFeedback {
  id: string;
  request_id: string;
  business_id: string;
  customer_id: string;

  // Sentiment (determines routing)
  sentiment_score: number; // 1-5
  sentiment_category: SentimentCategory;

  // Feedback content
  feedback_text?: string;

  // Structured feedback
  praise_areas?: string[];
  improvement_areas?: string[];

  // Review site routing (for positive sentiment)
  review_link_shown: boolean;
  review_link_clicked: boolean;
  review_link_clicked_at?: string;
  review_platform?: ReviewPlatform;
  review_url_used?: string;

  // Recovery tracking (for negative sentiment)
  recovery_needed: boolean;
  recovery_assigned_to?: string;
  recovery_status?: RecoveryStatus;
  recovery_notes?: string;
  recovery_started_at?: string;
  recovery_resolved_at?: string;
  recovery_resolution?: string;

  // Privacy
  is_public: boolean;
  published_at?: string;

  created_at: string;
  updated_at: string;
}

/** Per-business reputation settings */
export interface ReputationSettings {
  id: string;
  business_id: string;

  // Feature toggle
  is_enabled: boolean;

  // Timing configuration
  send_delay_minutes: number;
  request_expiry_days: number;
  reminder_delay_hours: number;
  max_reminders: number;

  // Sentiment thresholds
  positive_threshold: number; // Score >= this is positive
  negative_threshold: number; // Score <= this is negative

  // Delivery preferences
  default_channel: ReputationDeliveryChannel;

  // Daily limits
  max_requests_per_day: number;

  // Review platforms
  review_platforms: ReviewPlatformConfig[];

  // Message templates
  initial_message_template: string;
  initial_message_with_pow_template: string;
  positive_followup_template: string;
  negative_followup_template: string;
  reminder_template: string;

  // Recovery settings
  auto_assign_recovery: boolean;
  recovery_default_assignee?: string;
  recovery_sla_hours: number;
  recovery_escalation_hours: number;

  // PoW integration
  attach_pow_link: boolean;
  pow_link_position: PowLinkPosition;

  created_at: string;
  updated_at: string;
}

/** Review platform configuration */
export interface ReviewPlatformConfig {
  platform: ReviewPlatform;
  enabled: boolean;
  priority: number;
  url?: string;
}

/** Recovery log entry */
export interface ReputationRecoveryLog {
  id: string;
  feedback_id: string;
  business_id: string;

  action_type: RecoveryActionType;
  performed_by?: string;
  performed_at: string;

  previous_status?: RecoveryStatus;
  new_status?: RecoveryStatus;
  notes?: string;
  metadata?: Record<string, unknown>;

  created_at: string;
}

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

/** Create reputation request input */
export interface CreateReputationRequestInput {
  job_id: string;
  delivery_channel?: ReputationDeliveryChannel;
  delay_minutes?: number;
  schedule_at?: string;
}

/** Submit feedback input (public endpoint) */
export interface SubmitFeedbackInput {
  sentiment_score: number;
  feedback_text?: string;
  praise_areas?: string[];
  improvement_areas?: string[];
}

/** Update recovery input */
export interface UpdateRecoveryInput {
  status?: RecoveryStatus;
  assigned_to?: string;
  notes?: string;
  resolution?: string;
}

/** Reputation request with relations */
export interface ReputationRequestWithDetails extends ReputationRequest {
  customer?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  job?: {
    id: string;
    service_type: string;
    completed_at?: string;
  };
  feedback?: ReputationFeedback;
  proof_of_work?: {
    id: string;
    public_token: string;
    short_code: string;
  };
}

// =====================================================
// ANALYTICS AND STATS TYPES
// =====================================================

/** Dashboard stats */
export interface ReputationDashboardStats {
  period_days: number;

  // Request metrics
  total_requests: number;
  requests_sent: number;
  response_rate: number;

  // Sentiment breakdown
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  average_score: number;

  // Review conversion
  reviews_requested: number;
  review_clicks: number;
  review_conversion_rate: number;

  // Recovery metrics
  recovery_started: number;
  recovery_resolved: number;
  recovery_pending: number;
  avg_recovery_time_hours: number;
}

/** Trend data point */
export interface ReputationTrendPoint {
  date: string;
  requests_sent: number;
  responses: number;
  avg_score: number;
}

// =====================================================
// MESSAGE TEMPLATE TYPES
// =====================================================

/** Template variable context */
export interface TemplateContext {
  customer: {
    firstName: string;
    lastName: string;
    name: string;
  };
  business: {
    name: string;
    ownerName: string;
    phone?: string;
  };
  job: {
    serviceType: string;
    completedAt: string;
  };
  feedbackUrl: string;
  reviewUrl?: string;
  powUrl?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

/** Default reputation settings */
export const DEFAULT_REPUTATION_SETTINGS: Partial<ReputationSettings> = {
  is_enabled: true,
  send_delay_minutes: 60,
  request_expiry_days: 14,
  reminder_delay_hours: 48,
  max_reminders: 1,
  positive_threshold: 4,
  negative_threshold: 2,
  default_channel: 'SMS',
  max_requests_per_day: 25,
  attach_pow_link: true,
  pow_link_position: 'before_feedback',
  auto_assign_recovery: true,
  recovery_sla_hours: 24,
  recovery_escalation_hours: 48,
};

/** Default review platforms */
export const DEFAULT_REVIEW_PLATFORMS: ReviewPlatformConfig[] = [
  { platform: 'google', enabled: true, priority: 1 },
  { platform: 'facebook', enabled: false, priority: 2 },
];

/** Status display labels */
export const REQUEST_STATUS_LABELS: Record<ReputationRequestStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  feedback_received: 'Feedback Received',
  review_requested: 'Review Requested',
  recovery_started: 'Recovery Started',
  completed: 'Completed',
  expired: 'Expired',
};

/** Sentiment display config */
export const SENTIMENT_CONFIG: Record<SentimentCategory, { label: string; color: string; icon: string }> = {
  positive: { label: 'Positive', color: 'green', icon: 'smile' },
  neutral: { label: 'Neutral', color: 'yellow', icon: 'meh' },
  negative: { label: 'Negative', color: 'red', icon: 'frown' },
};

/** Recovery status display labels */
export const RECOVERY_STATUS_LABELS: Record<RecoveryStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
  closed: 'Closed',
};

/** Review platform display config */
export const REVIEW_PLATFORM_CONFIG: Record<ReviewPlatform, { label: string; icon: string }> = {
  google: { label: 'Google', icon: 'google' },
  facebook: { label: 'Facebook', icon: 'facebook' },
  yelp: { label: 'Yelp', icon: 'yelp' },
  nextdoor: { label: 'Nextdoor', icon: 'home' },
  other: { label: 'Other', icon: 'star' },
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Categorize sentiment score into positive/neutral/negative
 */
export function categorizeSentiment(
  score: number,
  positiveThreshold = 4,
  negativeThreshold = 2
): SentimentCategory {
  if (score >= positiveThreshold) return 'positive';
  if (score <= negativeThreshold) return 'negative';
  return 'neutral';
}

/**
 * Check if request can be sent (within daily limit)
 */
export function canSendRequest(
  sentToday: number,
  maxPerDay: number
): boolean {
  return sentToday < maxPerDay;
}

/**
 * Check if reminder can be sent
 */
export function canSendReminder(
  request: ReputationRequest,
  settings: ReputationSettings
): boolean {
  if (request.status !== 'sent' && request.status !== 'delivered') return false;
  if (request.reminder_count >= settings.max_reminders) return false;
  if (request.opt_out_at) return false;
  return true;
}
