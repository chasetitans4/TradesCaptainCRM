// =====================================================
// AI VOICE RECEPTIONIST TYPES - v2.0 with Delta Adjustments
//
// Delta 1: Emergency-only voice escalation
// Delta 2: Multi-location config hierarchy
// Delta 3: Hard minute caps with explicit approval
// Delta 4: Silence-over-guessing (confidence thresholds)
// Delta 5: Initiation evidence logging (TCPA)
// Delta 6: No training / no cross-tenant
// =====================================================

// Availability states (from spec Section 3)
export type AvailabilityState = 'LIVE_ANSWER' | 'ON_CALL' | 'MESSAGE_ONLY';

// Answer certainty modes (from spec Section 2)
export type AnswerCertaintyMode =
  | 'RING_TIMEOUT_ONLY'
  | 'RING_TIMEOUT_OR_FORWARD'
  | 'EXPLICIT_FORWARD_ONLY';

// Answer certainty signals
export type AnswerCertaintySignal = 'TIMEOUT' | 'FORWARD' | 'IMMEDIATE';

// Emergency sources (from spec Section 9)
export type EmergencySource =
  | 'CALLER_CONFIRMATION'
  | 'PHRASE_REQUIRED'
  | 'PHRASE_OPTIONAL_CONFIRMED'
  | 'KEYPAD';

// Delta 5: Initiation sources
export type InitiationSource = 'CALL' | 'SMS' | 'VOICEMAIL' | 'FORM';

// Delta 3: Overage modes
export type OverageMode = 'hard_stop' | 'approved_overage';

// Delta 1: Escalation action types
export type EscalationActionType = 'sms' | 'push' | 'email' | 'slack' | 'outbound_voice';

// Escalation acknowledgment methods
export type AcknowledgmentMethod = 'sms_reply' | 'app_interaction' | 'portal_click' | 'callback';

// Phrase types
export type PhraseType = 'required' | 'optional';

// =====================================================
// DELTA 4: CONFIDENCE HANDLING
// =====================================================

export interface ConfidenceThresholds {
  high: number;    // Default 0.85 - proceed with action
  medium: number;  // Default 0.60 - ask clarifying question
  // Below medium: defer to human or end safely
}

export type ConfidenceAction = 'proceed' | 'clarify' | 'defer' | 'end_safely';

export interface ConfidenceResult {
  confidence: number;
  action: ConfidenceAction;
  reason?: string;
}

// Default thresholds
export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  high: 0.85,
  medium: 0.60,
};

// =====================================================
// CORE INTERFACES
// =====================================================

// Voice receptionist settings (global)
export interface VoiceReceptionistSettings {
  id: string;
  business_id: string;

  // Core settings
  answer_certainty_mode: AnswerCertaintyMode;
  ring_timeout_seconds: number;
  enable_daytime_ai_voice: boolean;
  daytime_ai_voice_consent_at?: string;
  daytime_ai_voice_consent_by?: string;
  voicemail_escape_enabled: boolean;

  // Synthflow integration
  synthflow_assistant_id?: string;
  synthflow_voice_id?: string;

  // Greetings (TTS + custom audio)
  greeting_text?: string;
  greeting_audio_url?: string;
  after_hours_greeting?: string;
  after_hours_audio_url?: string;

  // Default contacts
  default_primary_contact_id?: string;
  default_backup_contact_id?: string;
  default_escalation_wait_minutes: number;

  // Delta 3: Overage mode
  overage_mode: OverageMode;
  overage_opt_in_at?: string;
  overage_opt_in_by?: string;

  // Delta 1: Emergency escalation
  emergency_voice_escalation_enabled: boolean;
  max_voice_escalation_attempts: number;

  // Delta 4: Confidence thresholds
  confidence_threshold_high: number;
  confidence_threshold_medium: number;

  // Delta 6: Training opt-out (always true)
  training_opt_out: true;

  created_at: string;
  updated_at: string;
}

// Delta 2: Location override (overrideable fields only)
export interface VoiceLocationOverride {
  id: string;
  business_id: string;
  location_id: string;

  // Only these fields can be overridden per location
  business_hours?: Record<string, { start: string; end: string }>;
  primary_contact_id?: string;
  backup_contact_id?: string;
  escalation_wait_minutes?: number;
  emergency_phrases?: EmergencyPhrase[];
  service_categories?: string[];

  created_at: string;
  updated_at: string;
}

// Emergency rule
export interface VoiceEmergencyRule {
  id: string;
  business_id: string;
  category: string;
  is_enabled: boolean;

  caller_confirmation_enabled: boolean;
  keypad_override_enabled: boolean;

  default_primary_contact_id?: string;
  default_backup_contact_id?: string;
  escalation_wait_minutes: number;

  phrases?: EmergencyPhrase[];

  created_at: string;
  updated_at?: string;
}

// Emergency phrase
export interface EmergencyPhrase {
  id: string;
  rule_id: string;
  phrase: string;
  phrase_type: PhraseType;
  created_at: string;
}

// Voice call event (Delta 5: includes initiation evidence)
export interface VoiceCallEvent {
  id: string;
  business_id: string;
  location_id?: string;
  conversation_id?: string;
  customer_id?: string;

  // Delta 5: Initiation evidence (REQUIRED)
  initiation_source: InitiationSource;
  initiation_evidence_id: string;
  initiated_at: string;

  // Call metadata
  call_sid: string;
  phone_from: string;
  phone_to: string;
  call_start_time: string;
  call_end_time?: string;
  call_duration_seconds?: number;

  // AI handling
  availability_state: AvailabilityState;
  answer_certainty_signal?: AnswerCertaintySignal;
  was_ai_answered: boolean;
  was_missed: boolean;
  voicemail_requested: boolean;

  // Delta 4: Confidence tracking
  ai_confidence?: number;
  ai_deferred_reason?: string;

  // Emergency
  is_emergency: boolean;
  emergency_source?: EmergencySource;

  // AI summary (non-verbatim)
  ai_summary?: string;
  ai_extracted_data?: Record<string, unknown>;
  routing_action_taken?: string;

  created_at: string;
}

// Voice usage (Delta 3: hard cap enforcement)
export interface VoiceUsage {
  id: string;
  business_id: string;
  billing_period_start: string;
  billing_period_end: string;

  included_minutes: number;
  used_minutes: number;

  // Delta 3: Overage tracking
  overage_minutes: number;
  overage_approved: boolean;
  overage_approved_at?: string;
  overage_approved_by?: string;

  // Cap enforcement
  hard_cap_triggered_at?: string;
  hard_cap_active: boolean;

  // Warnings
  warning_70_sent_at?: string;
  warning_90_sent_at?: string;

  created_at: string;
}

// Escalation event (Delta 1: emergency-only voice)
export interface VoiceEscalationEvent {
  id: string;
  call_event_id: string;

  step: number;
  action_type: EscalationActionType;
  target_contact_id?: string;

  // Delta 1: Voice escalation requires emergency
  is_emergency_escalation: boolean;

  sent_at: string;
  acknowledged_at?: string;
  acknowledgment_method?: AcknowledgmentMethod;

  failed_at?: string;
  failure_reason?: string;

  created_at: string;
}

// =====================================================
// HELPER TYPES
// =====================================================

// Delta 2: Configuration resolution
export interface ResolvedVoiceConfig {
  settings: VoiceReceptionistSettings;
  locationOverride?: VoiceLocationOverride;

  // Resolved values (location override if exists, else global)
  businessHours: Record<string, { start: string; end: string }>;
  primaryContactId?: string;
  backupContactId?: string;
  escalationWaitMinutes: number;
  emergencyPhrases: EmergencyPhrase[];
  serviceCategories: string[];
}

// Delta 3: Usage status
export interface VoiceUsageStatus {
  included: number;
  used: number;
  remaining: number;
  percentUsed: number;

  isWarning70: boolean;
  isWarning90: boolean;
  isAtCap: boolean;

  overageMode: OverageMode;
  overageApproved: boolean;
  overageMinutes: number;
}

// Delta 1: Escalation plan
export interface EscalationPlan {
  steps: EscalationStep[];
  isEmergency: boolean;
}

export interface EscalationStep {
  step: number;
  actionType: EscalationActionType;
  targetContactId: string;
  waitMinutes: number;
}

// =====================================================
// VOICE MINUTES BY PLAN
// =====================================================

export const VOICE_MINUTES_BY_PLAN: Record<string, number> = {
  // CRM Plans
  crm_starter: 0,       // Addon required
  crm_pro: 100,         // 100 min/mo
  crm_enterprise: 300,  // 300 min/mo

  // Gold Bundles
  gold_starter: 150,    // 150 min/mo
  gold_pro: 300,        // 300 min/mo
  gold_enterprise: 500, // 500 min/mo

  // Addon
  voice_addon: 100,     // 100 min/mo
};

export const VOICE_OVERAGE_RATE = 0.08; // $0.08/minute

// =====================================================
// DELTA 2: OVERRIDEABLE VS GLOBAL FIELDS
// =====================================================

// Fields that CAN be overridden per location
export const OVERRIDEABLE_FIELDS = [
  'business_hours',
  'primary_contact_id',
  'backup_contact_id',
  'escalation_wait_minutes',
  'emergency_phrases',
  'service_categories',
] as const;

export type OverrideableField = typeof OVERRIDEABLE_FIELDS[number];

// Fields that are ALWAYS global (cannot be overridden)
export const GLOBAL_ONLY_FIELDS = [
  'answer_certainty_mode',
  'ring_timeout_seconds',
  'enable_daytime_ai_voice',
  'voicemail_escape_enabled',
  'overage_mode',
  'confidence_threshold_high',
  'confidence_threshold_medium',
  'training_opt_out',
  'synthflow_assistant_id',
  'synthflow_voice_id',
] as const;

export type GlobalOnlyField = typeof GLOBAL_ONLY_FIELDS[number];

// =====================================================
// INPUT TYPES FOR CRUD OPERATIONS
// =====================================================

export interface CreateVoiceSettingsInput {
  business_id: string;
  answer_certainty_mode?: AnswerCertaintyMode;
  ring_timeout_seconds?: number;
  enable_daytime_ai_voice?: boolean;
  voicemail_escape_enabled?: boolean;
  greeting_text?: string;
  after_hours_greeting?: string;
  default_primary_contact_id?: string;
  default_backup_contact_id?: string;
  default_escalation_wait_minutes?: number;
  overage_mode?: OverageMode;
  synthflow_assistant_id?: string;
  synthflow_voice_id?: string;
}

export interface UpdateVoiceSettingsInput {
  answer_certainty_mode?: AnswerCertaintyMode;
  ring_timeout_seconds?: number;
  enable_daytime_ai_voice?: boolean;
  voicemail_escape_enabled?: boolean;
  greeting_text?: string;
  greeting_audio_url?: string;
  after_hours_greeting?: string;
  after_hours_audio_url?: string;
  default_primary_contact_id?: string;
  default_backup_contact_id?: string;
  default_escalation_wait_minutes?: number;
  overage_mode?: OverageMode;
  emergency_voice_escalation_enabled?: boolean;
  max_voice_escalation_attempts?: number;
  confidence_threshold_high?: number;
  confidence_threshold_medium?: number;
  synthflow_assistant_id?: string;
  synthflow_voice_id?: string;
}

export interface CreateLocationOverrideInput {
  business_id: string;
  location_id: string;
  business_hours?: Record<string, { start: string; end: string }>;
  primary_contact_id?: string;
  backup_contact_id?: string;
  escalation_wait_minutes?: number;
  emergency_phrases?: Omit<EmergencyPhrase, 'id' | 'rule_id' | 'created_at'>[];
  service_categories?: string[];
}

export interface CreateEmergencyRuleInput {
  business_id: string;
  category: string;
  is_enabled?: boolean;
  caller_confirmation_enabled?: boolean;
  keypad_override_enabled?: boolean;
  default_primary_contact_id?: string;
  default_backup_contact_id?: string;
  phrases?: { phrase: string; phrase_type: PhraseType }[];
}

export interface CreateCallEventInput {
  business_id: string;
  location_id?: string;
  conversation_id?: string;
  customer_id?: string;

  // Delta 5: Required initiation evidence
  initiation_source: InitiationSource;
  initiation_evidence_id: string;

  call_sid: string;
  phone_from: string;
  phone_to: string;
  call_start_time: string;
  availability_state: AvailabilityState;
  answer_certainty_signal?: AnswerCertaintySignal;
}

// =====================================================
// SYNTHFLOW TYPES
// =====================================================

export interface SynthflowCallParams {
  phoneNumber: string;
  assistantId: string;
  voiceId?: string;
  greeting: string;
  context: Record<string, unknown>;
  webhookUrl: string;
  // Delta 6: Always opt out of training
  noTraining: true;
}

export interface SynthflowResponse {
  callId: string;
  status: 'initiated' | 'connected' | 'completed' | 'failed';
  transcript?: string;
  extractedData?: Record<string, unknown>;
  confidence?: number;
}

export interface SynthflowWebhookPayload {
  call_id: string;
  event_type: 'call_started' | 'call_ended' | 'transcript_ready' | 'error';
  phone_number: string;
  duration_seconds?: number;
  transcript?: string;
  extracted_data?: Record<string, unknown>;
  confidence?: number;
  error?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface VoiceSettingsResponse {
  success: boolean;
  settings?: VoiceReceptionistSettings;
  error?: string;
}

export interface VoiceUsageResponse {
  success: boolean;
  usage?: VoiceUsageStatus;
  error?: string;
}

export interface RecordMinutesResponse {
  success: boolean;
  cappedAt?: number;
  error?: string;
}

export interface EscalationResponse {
  success: boolean;
  escalationId?: string;
  error?: string;
}
