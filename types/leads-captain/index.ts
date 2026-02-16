// =====================================================
// Leads Captain v2.0 TypeScript Types
// Rules-first AI SMS response system
// =====================================================

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

// Business type options
export type BusinessType = 'plumbing' | 'hvac' | 'electrical' | 'roofing' | 'general' | 'landscaping' | 'cleaning' | 'pest_control' | 'other';

// Response tone options
export type ToneOption = 'casual' | 'friendly_professional' | 'formal';

// AI creativity levels
export type CreativityLevel = 'none' | 'low' | 'medium' | 'high';

// AI pricing disclosure modes
export type PricingMode = 'never' | 'ranges' | 'specific';

// Memory scope options
export type MemoryScope = 'conversation' | 'per_customer' | 'never';

// Global mode options
export type GlobalMode = 'normal' | 'templates_only' | 'paused';

// Approval requirement levels
export type ApprovalRequirement = 'never' | 'low_confidence' | 'first_message' | 'all';

// Conversation status (Legacy/UI simplified status)
export type ConversationStatus = 'active' | 'human_takeover' | 'closed' | 'blocked';

// Sentiment analysis results
export type SentimentType = 'positive' | 'neutral' | 'negative' | 'angry';

// Message direction
export type MessageDirection = 'inbound' | 'outbound';

// Delivery status
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';

// Approval status
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

// Training rating
export type TrainingRating = 'good' | 'bad';

// Notification recipient roles
export type RecipientRole = 'owner' | 'oncall' | 'backup';

// Notification urgency
export type NotificationUrgency = 'immediate' | 'normal' | 'low';

// Intent categories
export type IntentCategory = 'lead' | 'scheduling' | 'service' | 'other';

// Template emoji settings
export type EmojiSetting = 'business_default' | 'always' | 'never';

// AI personalization levels
export type AIPersonalization = 'none' | 'low' | 'medium';

// Day of week keys
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// =====================================================
// BUSINESS HOURS
// =====================================================

export interface DayHours {
  open: string | null; // HH:MM format or null
  close: string | null; // HH:MM format or null
  enabled: boolean;
}

export type BusinessHours = Record<DayOfWeek, DayHours>;

// =====================================================
// NOTIFICATION TRIGGERS
// =====================================================

export interface NotificationTriggers {
  new_conversation: boolean;
  hot_lead: boolean;
  emergency: boolean;
  angry_customer: boolean;
  escalation: boolean;
  booking: boolean;
  every_message: boolean;
}

// =====================================================
// RULE CONDITIONS
// =====================================================

// Condition operators
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any' | 'all' | 'is' | 'greater_than' | 'less_than' | 'between';

// Condition fields that can be evaluated
export type ConditionField =
  | 'intent'
  | 'time'
  | 'message_contains'
  | 'sentiment'
  | 'confidence'
  | 'customer_status'
  | 'conversation_length'
  | 'is_first_message'
  | 'customer_name'
  | 'detected_language';

// Time condition values
export type TimeConditionValue = 'business_hours' | 'outside_hours' | 'quiet_hours';

// Single condition
export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | string[] | number | boolean | TimeConditionValue;
}

// Grouped conditions with AND/OR logic
export interface RuleConditions {
  operator: 'AND' | 'OR';
  conditions: RuleCondition[];
}

// =====================================================
// RULE ACTIONS
// =====================================================

export interface NotifyAction {
  recipients: RecipientRole[];
  methods: ('sms' | 'push' | 'email')[];
  urgency?: NotificationUrgency;
}

export interface RuleActions {
  // Response actions
  send_template?: string; // Template UUID
  send_text?: string; // Direct text (rarely used)
  use_ai?: boolean; // Fall back to AI for response

  // Include options
  include_phone?: boolean;
  include_booking_link?: boolean;
  include_pricing?: boolean;

  // Follow-up
  ask_followup?: boolean;
  followup_question?: string;

  // Conversation control
  stop_ai?: boolean; // Stop AI from responding further
  escalate_to_human?: boolean;
  do_not_respond?: boolean;

  // Notifications
  notify?: NotifyAction;

  // Tags and flags
  add_tag?: string;
  set_hot_lead?: boolean;
  set_emergency?: boolean;

  // CRM actions
  create_lead?: boolean;
  create_job?: boolean;
}

// =====================================================
// DATABASE TABLE TYPES
// =====================================================

// leads_captain_config
export interface LeadsCaptainConfig {
  id: string;
  business_id: string;

  // Business context
  business_name: string;
  business_type: BusinessType | null;
  service_area: string | null;
  owner_name: string | null;

  // Contact info
  main_phone: string | null;
  emergency_phone: string | null;
  booking_link: string | null;

  // Hours
  business_hours: BusinessHours;
  timezone: string;
  emergency_service: boolean;

  // Response style
  tone: ToneOption;
  use_emojis: boolean;
  languages: string[];

  // AI settings
  ai_enabled: boolean;
  ai_confidence_threshold: number; // 0-100
  ai_creativity_level: CreativityLevel;
  ai_max_messages: number;
  ai_pricing_mode: PricingMode;

  // Memory settings
  memory_scope: MemoryScope;
  memory_expiration_days: number;

  // Admin settings
  global_mode: GlobalMode;
  require_approval: ApprovalRequirement;
  approval_timeout_minutes: number;

  // Feature flags
  use_new_orchestrator: boolean;

  created_at: string;
  updated_at: string;
}

// leads_captain_intents
export interface LeadsCaptainIntent {
  id: string;
  config_id: string;

  intent_code: string;
  intent_label: string;
  intent_category: IntentCategory | null;
  example_phrases: string[];
  enabled: boolean;

  created_at: string;
}

// leads_captain_templates
export interface LeadsCaptainTemplate {
  id: string;
  config_id: string;

  name: string;
  template_key: string | null;
  content: string; // Supports {{variables}}

  // Settings
  max_length: number;
  emoji_setting: EmojiSetting;
  ai_personalization: AIPersonalization;

  is_system: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// leads_captain_rules
export interface LeadsCaptainRule {
  id: string;
  config_id: string;

  name: string;
  description: string | null;
  priority: number; // Lower = higher priority

  conditions: RuleConditions;
  actions: RuleActions;

  is_system: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// leads_captain_price_list
export interface LeadsCaptainPriceItem {
  id: string;
  config_id: string;

  service_name: string;
  price_min: number | null;
  price_max: number | null;
  price_note: string | null;
  display_order: number;

  is_active: boolean;

  created_at: string;
}

// leads_captain_notifications
export interface LeadsCaptainNotificationRecipient {
  id: string;
  config_id: string;

  recipient_name: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  recipient_role: RecipientRole;

  // Methods
  notify_sms: boolean;
  notify_push: boolean;
  notify_email: boolean;

  // Triggers
  triggers: NotificationTriggers;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string; // HH:MM format
  quiet_hours_except_emergency: boolean;

  is_active: boolean;

  created_at: string;
}

// Customer memory structure
export interface CustomerMemory {
  name?: string;
  email?: string;
  address?: string;
  past_services?: string[];
  preferences?: Record<string, string>;
  notes?: string[];
  last_interaction?: string;
  [key: string]: unknown;
}

// leads_captain_conversations_v2
export interface LeadsCaptainConversation {
  id: string;
  config_id: string;

  // Customer info
  customer_phone: string;
  customer_name: string | null;
  customer_email: string | null;

  // Status
  status: ConversationStatus;

  // Classification
  initial_intent: string | null;
  current_intent: string | null;
  sentiment: SentimentType | null;

  // Flags
  is_hot_lead: boolean;
  is_emergency: boolean;
  requires_human: boolean;
  opted_out: boolean;

  // Per-conversation mute (Section 7.3 - Kill Switches)
  muted_until: string | null;

  // Memory
  customer_memory: CustomerMemory;

  // Counters
  message_count: number;
  ai_message_count: number;

  // CRM Integration
  crm_lead_id: string | null;
  crm_customer_id: string | null;

  // Timestamps
  started_at: string;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  closed_at: string | null;

  created_at: string;
}

// Extracted entities from message analysis
export interface ExtractedEntities {
  name?: string;
  service?: string;
  time?: string;
  date?: string;
  address?: string;
  phone?: string;
  email?: string;
  [key: string]: string | undefined;
}

// Decision details for audit trail
export interface DecisionDetails {
  rules_evaluated?: string[];
  rule_match_reason?: string;
  ai_prompt?: string;
  ai_response_raw?: string;
  template_variables?: Record<string, string>;
  guardrails_applied?: string[];
  [key: string]: unknown;
}

// leads_captain_messages_v2
export interface LeadsCaptainMessage {
  id: string;
  conversation_id: string;

  // Message content
  direction: MessageDirection;
  content: string;

  // Analysis (inbound messages)
  detected_intent: string | null;
  intent_confidence: number | null; // 0-100
  detected_sentiment: SentimentType | null;
  detected_language: string | null;
  extracted_entities: ExtractedEntities | null;

  // Decision tracking (outbound messages)
  rule_matched: string | null; // Rule UUID
  template_used: string | null; // Template UUID
  ai_used: boolean;
  ai_model: string | null;
  ai_confidence: number | null;

  // Explainability
  decision_explanation: string | null;
  decision_details: DecisionDetails | null;

  // Approval workflow
  approval_required: boolean;
  approval_status: ApprovalStatus | null;
  approved_by: string | null;
  approved_at: string | null;
  original_content: string | null; // If edited before sending

  // Delivery
  twilio_sid: string | null;
  delivery_status: DeliveryStatus;
  delivery_error: string | null;

  created_at: string;
  sent_at: string | null;
}

// Feedback reasons for training
export type FeedbackReason = 'too_long' | 'too_short' | 'too_formal' | 'too_casual' | 'wrong_info' | 'wrong_tone' | 'confusing' | 'inappropriate' | 'other';

// leads_captain_training
export interface LeadsCaptainTraining {
  id: string;
  config_id: string;
  message_id: string | null;

  incoming_message: string;
  ai_response: string;

  rating: TrainingRating | null;
  feedback_reasons: FeedbackReason[];
  better_response: string | null;

  processed: boolean;

  created_at: string;
}

// Audit log actions
export type AuditAction =
  | 'message_received'
  | 'message_sent'
  | 'rule_matched'
  | 'ai_invoked'
  | 'escalated'
  | 'human_takeover'
  | 'human_released'
  | 'config_changed'
  | 'rule_created'
  | 'rule_updated'
  | 'rule_deleted'
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'opt_out'
  | 'opt_in'
  | 'blocked'
  | 'unblocked'
  | 'muted'
  | 'unmuted'
  | 'flagged_hot_lead'
  | 'unflagged_hot_lead'
  | 'conversation_closed'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'approval_timeout';

// leads_captain_audit_log
export interface LeadsCaptainAuditLog {
  id: string;
  config_id: string;
  conversation_id: string | null;
  message_id: string | null;

  action: AuditAction;
  actor: string; // 'system', 'ai', or user email/name
  details: Record<string, unknown> | null;

  created_at: string;
}

// =====================================================
// FEATURE GATING & LIMITS
// =====================================================

export type PlanTier = 'standalone' | 'silver' | 'gold';

export interface LeadsCaptainFeatureLimits {
  max_rules: number;
  max_templates: number;
  max_notification_recipients: number;
  max_price_list_items: number;
  ai_enabled: boolean;
  ai_max_messages_per_conversation: number;
  approval_queue_enabled: boolean;
  analytics_enabled: boolean;
  crm_integration_enabled: boolean;
  custom_intents_enabled: boolean;
  multi_language_enabled: boolean;
}

export const PLAN_FEATURE_LIMITS: Record<PlanTier, LeadsCaptainFeatureLimits> = {
  standalone: {
    max_rules: 10,
    max_templates: 15,
    max_notification_recipients: 2,
    max_price_list_items: 20,
    ai_enabled: true,
    ai_max_messages_per_conversation: 5,
    approval_queue_enabled: false,
    analytics_enabled: false,
    crm_integration_enabled: false,
    custom_intents_enabled: false,
    multi_language_enabled: false,
  },
  silver: {
    max_rules: 25,
    max_templates: 50,
    max_notification_recipients: 5,
    max_price_list_items: 50,
    ai_enabled: true,
    ai_max_messages_per_conversation: 10,
    approval_queue_enabled: true,
    analytics_enabled: true,
    crm_integration_enabled: true,
    custom_intents_enabled: false,
    multi_language_enabled: false,
  },
  gold: {
    max_rules: 100,
    max_templates: 200,
    max_notification_recipients: 20,
    max_price_list_items: 200,
    ai_enabled: true,
    ai_max_messages_per_conversation: 25,
    approval_queue_enabled: true,
    analytics_enabled: true,
    crm_integration_enabled: true,
    custom_intents_enabled: true,
    multi_language_enabled: true,
  },
};

// =====================================================
// COMPLIANCE CONSTANTS
// =====================================================

// TCPA Compliance keywords
export const COMPLIANCE_KEYWORDS = {
  OPT_OUT: ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
  HELP: ['HELP', 'INFO'],
  OPT_IN: ['START', 'YES', 'UNSTOP'],
} as const;

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

// Config update request
export interface UpdateConfigRequest {
  business_name?: string;
  business_type?: BusinessType | null;
  service_area?: string | null;
  owner_name?: string | null;
  main_phone?: string | null;
  emergency_phone?: string | null;
  booking_link?: string | null;
  business_hours?: BusinessHours;
  timezone?: string;
  emergency_service?: boolean;
  tone?: ToneOption;
  use_emojis?: boolean;
  languages?: string[];
  ai_enabled?: boolean;
  ai_confidence_threshold?: number;
  ai_creativity_level?: CreativityLevel;
  ai_max_messages?: number;
  ai_pricing_mode?: PricingMode;
  memory_scope?: MemoryScope;
  memory_expiration_days?: number;
  global_mode?: GlobalMode;
  require_approval?: ApprovalRequirement;
  approval_timeout_minutes?: number;
}

// Intent bulk update request
export interface UpdateIntentsRequest {
  intents: Array<{
    intent_code: string;
    enabled: boolean;
  }>;
}

// Template create/update request
export interface CreateTemplateRequest {
  name: string;
  template_key?: string;
  content: string;
  max_length?: number;
  emoji_setting?: EmojiSetting;
  ai_personalization?: AIPersonalization;
  is_active?: boolean;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {}

// Template preview request
export interface PreviewTemplateRequest {
  template_id?: string;
  content?: string; // For previewing unsaved content
  sample_data?: Record<string, string>;
}

// Rule create/update request
export interface CreateRuleRequest {
  name: string;
  description?: string;
  priority?: number;
  conditions: RuleConditions;
  actions: RuleActions;
  is_active?: boolean;
}

export interface UpdateRuleRequest extends Partial<CreateRuleRequest> {}

// Rule reorder request
export interface ReorderRulesRequest {
  rule_ids: string[]; // Ordered list of rule IDs
}

// Rule test request
export interface TestRuleRequest {
  message: string;
  context?: {
    is_first_message?: boolean;
    conversation_length?: number;
    customer_name?: string;
    time_override?: 'business_hours' | 'outside_hours' | 'quiet_hours';
  };
}

// Rule test response
export interface TestRuleResponse {
  matched_rule: LeadsCaptainRule | null;
  intent_classification: {
    intent: string;
    confidence: number;
    sentiment: SentimentType;
  };
  would_send: {
    template_id?: string;
    template_content?: string;
    rendered_content?: string;
    ai_response?: string;
    no_response?: boolean;
  };
  explanation: string;
}

// Price list create/update request
export interface CreatePriceItemRequest {
  service_name: string;
  price_min?: number;
  price_max?: number;
  price_note?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdatePriceItemRequest extends Partial<CreatePriceItemRequest> {}

// Notification recipient create/update request
export interface CreateNotificationRecipientRequest {
  recipient_name: string;
  recipient_phone?: string;
  recipient_email?: string;
  recipient_role?: RecipientRole;
  notify_sms?: boolean;
  notify_push?: boolean;
  notify_email?: boolean;
  triggers?: Partial<NotificationTriggers>;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_except_emergency?: boolean;
  is_active?: boolean;
}

export interface UpdateNotificationRecipientRequest extends Partial<CreateNotificationRecipientRequest> {}

// Conversation filters
export interface ConversationFilters {
  status?: ConversationStatus | ConversationStatus[];
  is_hot_lead?: boolean;
  is_emergency?: boolean;
  requires_human?: boolean;
  search?: string; // Search in phone, name, messages
  date_from?: string;
  date_to?: string;
  intent?: string;
  sentiment?: SentimentType;
}

// Conversation list response
export interface ConversationListResponse {
  conversations: LeadsCaptainConversation[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// Conversation detail response
export interface ConversationDetailResponse {
  conversation: LeadsCaptainConversation;
  messages: LeadsCaptainMessage[];
  config: Pick<LeadsCaptainConfig, 'business_name' | 'owner_name' | 'timezone'>;
}

// Approval queue item
export interface ApprovalQueueItem {
  message: LeadsCaptainMessage;
  conversation: Pick<LeadsCaptainConversation, 'id' | 'customer_phone' | 'customer_name' | 'status'>;
  pending_since: string;
  timeout_at: string;
}

// Approval queue response
export interface ApprovalQueueResponse {
  items: ApprovalQueueItem[];
  total: number;
}

// Approval action request
export interface ApprovalActionRequest {
  action: 'approve' | 'reject' | 'edit';
  edited_content?: string; // Required for 'edit' action
}

// Analytics overview response
export interface AnalyticsOverviewResponse {
  period: {
    start: string;
    end: string;
  };
  conversations: {
    total: number;
    active: number;
    human_takeover: number;
    closed: number;
    change_percent: number;
  };
  messages: {
    total: number;
    inbound: number;
    outbound: number;
    ai_generated: number;
    template_used: number;
  };
  leads: {
    total: number;
    hot_leads: number;
    converted: number;
    conversion_rate: number;
  };
  response_metrics: {
    avg_response_time_seconds: number;
    ai_confidence_avg: number;
    approval_rate: number;
  };
  intents: Array<{
    intent_code: string;
    count: number;
    percentage: number;
  }>;
}

// Rule analytics response
export interface RuleAnalyticsResponse {
  rules: Array<{
    rule_id: string;
    rule_name: string;
    hits: number;
    hit_rate: number;
    avg_confidence: number;
    last_hit: string | null;
  }>;
  period: {
    start: string;
    end: string;
  };
}

// =====================================================
// PROCESSING ENGINE TYPES
// =====================================================

// Intent classification result
export interface IntentClassificationResult {
  intent: string;
  confidence: number; // 0-100
  sentiment: SentimentType;
  language: string;
  entities: ExtractedEntities;
  is_compliance: boolean; // STOP/HELP/START
  compliance_type?: 'opt_out' | 'help' | 'opt_in';
}

// Context for rule evaluation
export interface RuleEvaluationContext {
  message: string;
  classification: IntentClassificationResult;
  conversation: LeadsCaptainConversation | null;
  config: LeadsCaptainConfig;
  is_first_message: boolean;
  current_time: Date;
  is_business_hours: boolean;
  is_quiet_hours: boolean;
}

// Rule evaluation result
export interface RuleEvaluationResult {
  matched: boolean;
  rule: LeadsCaptainRule | null;
  conditions_checked: Array<{
    condition: RuleCondition;
    result: boolean;
    actual_value: unknown;
  }>;
  // Chain depth tracking (Section 3.3)
  chain_depth?: number;
  chain_depth_exceeded?: boolean;
}

// Template variables for rendering
export interface TemplateVariables {
  // Business variables
  business_name?: string;
  owner_name?: string;
  main_phone?: string;
  emergency_phone?: string;
  booking_link?: string;
  service_area?: string;

  // Customer variables
  first_name?: string;
  customer_name?: string;
  customer_phone?: string;

  // Time variables
  next_available?: string;
  appointment_date?: string;
  appointment_time?: string;
  current_time?: string;

  // Service variables
  service_requested?: string;
  price_range?: string;

  // Custom variables
  [key: string]: string | undefined;
}

// Rendered template result
export interface RenderedTemplate {
  content: string;
  variables_used: string[];
  missing_variables: string[];
  truncated: boolean;
  original_length: number;
}

// AI generation options
export interface AIGenerationOptions {
  creativity_level: CreativityLevel;
  max_length: number;
  tone: ToneOption;
  use_emojis: boolean;
  pricing_mode: PricingMode;
  templates_for_reference: LeadsCaptainTemplate[];
  price_list: LeadsCaptainPriceItem[];
}

// AI response result
export interface AIResponseResult {
  content: string;
  confidence?: number;
  model?: string;
  tokens_used?: number;
  guardrails_applied?: string[];
}

// =====================================================
// MISSING EXPORTS RESTORATION
// =====================================================

export type ConversationState =
  | 'INITIATED'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'ROUTED'
  | 'HUMAN_ACTIVE'
  | 'UNRESPONSIVE'
  | 'OPTED_OUT'
  | 'CLOSED';

export const VALID_STATE_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  INITIATED: ['QUALIFYING', 'OPTED_OUT', 'CLOSED'],
  QUALIFYING: ['QUALIFIED', 'HUMAN_ACTIVE', 'UNRESPONSIVE', 'OPTED_OUT', 'CLOSED'],
  QUALIFIED: ['ROUTED', 'HUMAN_ACTIVE', 'OPTED_OUT', 'CLOSED'],
  ROUTED: ['HUMAN_ACTIVE', 'UNRESPONSIVE', 'OPTED_OUT', 'CLOSED'],
  HUMAN_ACTIVE: ['OPTED_OUT', 'CLOSED'],
  UNRESPONSIVE: ['QUALIFYING', 'HUMAN_ACTIVE', 'OPTED_OUT', 'CLOSED'],
  OPTED_OUT: ['QUALIFYING'], // Via opt-in
  CLOSED: [],
};

export function isValidStateTransition(
  fromState: ConversationState | null,
  toState: ConversationState
): boolean {
  if (fromState === null) {
    return toState === 'INITIATED';
  }
  return VALID_STATE_TRANSITIONS[fromState]?.includes(toState) ?? false;
}

export type StateChangeTrigger = 'ai' | 'system' | 'human' | 'customer' | 'admin';

export interface StateTransitionLog {
  id: string;
  conversation_id: string;
  from_state: ConversationState | null;
  to_state: ConversationState;
  reason: string | null;
  triggered_by: StateChangeTrigger;
  created_at: string;
}

export type LeadUrgency = 'routine' | 'soon' | 'urgent' | 'emergency';

export const URGENCY_ROUTING_TIMEOUT: Record<LeadUrgency, number> = {
  routine: 30,
  soon: 30,
  urgent: 10,
  emergency: 0,
};

export interface QualificationData {
  name?: string;
  service_needed?: string;
  urgency?: LeadUrgency;
  address?: string;
  availability?: string;
  photos_offered?: boolean;
}

export interface QualificationStatus {
  isComplete: boolean;
  missingRequired: (keyof QualificationData)[];
  nextQuestion: string | null;
  data: QualificationData;
}

export const REQUIRED_QUALIFICATION_FIELDS: (keyof QualificationData)[] = ['name', 'service_needed', 'urgency'];

export function isQualificationComplete(data: QualificationData): boolean {
  return REQUIRED_QUALIFICATION_FIELDS.every(field => !!data[field as keyof QualificationData]);
}

export const FOLLOW_UP_TIMING = {
  first: 60,
  second: 240,
  third: 1440,
  unresponsiveAfter: 120, // 2 hours
};

export const RATE_LIMITS = {
  maxConsecutiveFollowUps: 3,
};

export function getFollowUpDelay(followUpNumber: 1 | 2 | 3): number {
  switch (followUpNumber) {
    case 1: return FOLLOW_UP_TIMING.first;
    case 2: return FOLLOW_UP_TIMING.second;
    case 3: return FOLLOW_UP_TIMING.third;
  }
}

export interface FollowUpSchedule {
  id: string;
  conversation_id: string;
  follow_up_number: 1 | 2 | 3;
  scheduled_at: string;
  sent_at: string | null;
  customer_responded: boolean;
  created_at: string;
}

// =====================================================
// TIMEZONE TYPES - Spec v1.1 Section 4.5
// =====================================================

/** Timezone source priority per spec */
export type TimezonePriority = 'customer_profile' | 'service_address' | 'area_code' | 'business_default';

/** Resolved timezone with confidence level */
export interface TimezoneResolution {
  timezone: string;
  source: TimezonePriority;
  confidence: 'high' | 'medium' | 'low';
}

/** Default quiet hours: 9 PM to 8 AM local time */
export const QUIET_HOURS = {
  start: 21, // 9 PM
  end: 8,    // 8 AM
} as const;

// =====================================================
// MESSAGE PROCESSING RESULT
// =====================================================

/** Notification recipient for message processing */
export interface NotificationRecipientResult {
  recipient_id: string;
  methods: ('sms' | 'push' | 'email')[];
  urgency: 'immediate' | 'normal' | 'low' | string;
}

/** Result from processing an inbound message */
export interface MessageProcessingResult {
  response_content: string | null;
  should_send: boolean;
  requires_approval: boolean;
  classification: IntentClassificationResult;
  rule_matched: LeadsCaptainRule | null;
  template_used: LeadsCaptainTemplate | null;
  ai_used: boolean;
  explanation: string;
  decision_details: DecisionDetails;
  notifications: NotificationRecipientResult[];
  conversation_updates: Partial<LeadsCaptainConversation> & Record<string, unknown>;
  should_escalate: boolean;
  compliance_action?: string;
}
