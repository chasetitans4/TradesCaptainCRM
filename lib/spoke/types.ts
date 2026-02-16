// =====================================================
// SPOKE - TYPE DEFINITIONS
//
// Per Spoke Spec v1.0:
// Voice-first CRM updates via natural contractor speech
//
// Core Principle: "Speak once, structured data appears"
// =====================================================

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

/** Spoke entry points */
export type SpokeSource = 'CALL' | 'SMS' | 'APP';

/** Contractor role determines what CRM writes are allowed */
export type ContractorRole = 'OWNER' | 'ADMIN' | 'TECH';

/** Processing status for spoke updates */
export type SpokeUpdateStatus =
  | 'PROCESSING'  // Currently being processed
  | 'PROCESSED'   // Successfully written to CRM
  | 'DRAFT'       // Needs manual resolution (ambiguous job match)
  | 'EDITED'      // User corrected via EDIT flow
  | 'FAILED'      // Processing failed
  | 'REJECTED';   // Invalid/spam

/** How a draft was resolved */
export type DraftResolutionMethod = 'SMS_REPLY' | 'APP' | 'AUTO_TIMEOUT';

/** How a correction was made */
export type CorrectionMethod = 'SMS_EDIT' | 'APP_EDIT' | 'CLARIFICATION';

/** Unknown caller policy */
export type UnknownCallerPolicy = 'reject' | 'provisional';

// =====================================================
// TOKEN GRAMMAR
// Per Spec Section 3.2
// =====================================================

/** Token categories for parsing */
export type TokenCategory =
  | 'STATUS_COMPLETE'
  | 'STATUS_DELAYED'
  | 'STATUS_ISSUE'
  | 'DURATION_HOURS'
  | 'DURATION_MINUTES'
  | 'PAYMENT_AMOUNT'
  | 'PAYMENT_METHOD'
  | 'CUSTOMER_NAME'
  | 'CUSTOMER_PRONOUN'
  | 'CORRECTION_SIGNAL'
  | 'FILLER'
  | 'UNKNOWN';

/** Payment methods recognized */
export type PaymentMethodToken =
  | 'cash'
  | 'check'
  | 'card'
  | 'credit'
  | 'debit'
  | 'zelle'
  | 'venmo'
  | 'paypal'
  | 'financing';

// =====================================================
// CONFIDENCE SCORING
// Per Spec Section 5
// =====================================================

/** Confidence score for a single field */
export interface FieldConfidence {
  value: number;  // 0.0 to 1.0
  source: 'extraction' | 'context' | 'default';
  signals?: string[];
}

/** Confidence thresholds (Beta: Global only, no per-contractor) */
export interface ConfidenceThresholds {
  payment: number;   // Default: 0.90
  status: number;    // Default: 0.85
  match: number;     // Default: 0.85
  duration: number;  // Default: 0.75
  notes: number;     // Default: 0.70
}

/** Default global thresholds per spec */
export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  payment: 0.90,
  status: 0.85,
  match: 0.85,
  duration: 0.75,
  notes: 0.70,
};

// =====================================================
// PARSED DATA STRUCTURES
// =====================================================

/** Parsed status from transcript */
export interface ParsedStatus {
  value: 'complete' | 'delayed' | 'issue' | 'in_progress';
  confidence: number;
  raw_tokens: string[];
}

/** Parsed payment from transcript */
export interface ParsedPayment {
  amount: number;
  method: PaymentMethodToken | null;
  confidence: number;
  raw_tokens: string[];
  ambiguous?: boolean;
}

/** Parsed duration from transcript */
export interface ParsedDuration {
  minutes: number;
  confidence: number;
  raw_tokens: string[];
  is_range?: boolean;
  range_min?: number;
  range_max?: number;
}

/** Parsed customer reference from transcript */
export interface ParsedCustomerReference {
  value: string;
  type: 'name' | 'pronoun' | 'address';
  confidence: number;
  resolved_customer_id?: string;
  resolved_customer_name?: string;
}

/** Parsed notes/comments from transcript */
export interface ParsedNotes {
  value: string;
  confidence: number;
  category?: 'work_done' | 'materials' | 'issue' | 'follow_up' | 'general';
}

/** Complete parsed data from a transcript */
export interface SpokeParsedData {
  status?: ParsedStatus;
  payment?: ParsedPayment;
  duration?: ParsedDuration;
  customer?: ParsedCustomerReference;
  notes?: ParsedNotes;
  corrections_detected?: {
    field: string;
    original: string;
    corrected: string;
  }[];
  multi_job_detected?: boolean;
  raw_segments?: string[];
}

// =====================================================
// JOB MATCHING
// Per Spec Section 6
// =====================================================

/** Individual matching signal */
export interface MatchSignal {
  type: 'customer_name' | 'gps_proximity' | 'schedule_window' | 'last_viewed' | 'route_prediction' | 'recent_activity';
  score: number;
  weight: number;
  metadata?: Record<string, unknown>;
}

/** Match signals for job matching */
export interface MatchSignals {
  customer_name_match?: number;
  gps_proximity?: number;
  schedule_window?: number;
  last_viewed?: number;
  route_prediction?: number;  // Not used in beta
  recent_activity?: number;
  composite_score: number;
  matched_job_id?: string;
  candidate_jobs?: {
    job_id: string;
    customer_name: string;
    score: number;
  }[];
}

/** Job matching weights (per spec) */
export const MATCH_SIGNAL_WEIGHTS = {
  customer_name: 1.0,
  gps_proximity: 0.8,
  schedule_window: 0.6,
  last_viewed: 0.3,
  route_prediction: 0.4,  // Not used in beta
} as const;

// =====================================================
// CRM WRITES
// =====================================================

/** What was written to the CRM */
export interface CRMWrites {
  job_status?: string;
  job_completion_notes?: string;
  job_completed_at?: string;
  payment_logged?: {
    amount: number;
    method: PaymentMethodToken | null;
  };
  duration_logged?: {
    minutes: number;
  };
  job_note_added?: string;
}

// =====================================================
// DATABASE MODELS
// =====================================================

/** Contractor phone record */
export interface ContractorPhone {
  id: string;
  business_id: string;
  phone_number: string;
  display_name: string;
  role: ContractorRole;
  is_verified: boolean;
  verified_at: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  flagged_for_review: boolean;
  last_used_at: string | null;
  total_updates: number;
  created_at: string;
  updated_at: string;
}

/** Spoke update record */
export interface SpokeUpdate {
  id: string;
  business_id: string;
  contractor_phone_id: string | null;
  job_id: string | null;
  source: SpokeSource;

  // Audio/transcript
  audio_url: string | null;
  audio_duration_seconds: number | null;
  raw_transcript: string | null;
  transcript_language: string;
  audio_quality_score: number | null;
  transcription_confidence: number | null;

  // Parsed data
  parsed_data: SpokeParsedData;
  confidence_scores: Record<string, number>;
  match_signals: MatchSignals | null;
  quality_score: number | null;

  // Status
  status: SpokeUpdateStatus;
  error_code: string | null;
  error_message: string | null;

  // Confirmation
  confirmation_sent_at: string | null;
  confirmation_sms_id: string | null;

  // Edits
  edit_count: number;
  last_edited_at: string | null;
  edit_window_expires_at: string | null;

  // What was written
  crm_writes: CRMWrites;

  // Timestamps
  created_at: string;
  processed_at: string | null;
  transcription_completed_at: string | null;
  parsing_completed_at: string | null;
  matching_completed_at: string | null;
}

/** Spoke draft record */
export interface SpokeDraft {
  id: string;
  spoke_update_id: string;
  business_id: string;
  candidate_jobs: {
    job_id: string;
    customer_name: string;
    score: number;
  }[];
  clarification_sent_at: string | null;
  clarification_sms_id: string | null;
  clarification_response: string | null;
  clarification_response_at: string | null;
  assigned_to_job_id: string | null;
  resolved_at: string | null;
  resolved_by: DraftResolutionMethod | null;
  expires_at: string;
  created_at: string;
}

/** Spoke correction record */
export interface SpokeCorrection {
  id: string;
  spoke_update_id: string;
  contractor_phone_id: string;
  business_id: string;
  field_name: string;
  original_value: unknown;
  corrected_value: unknown;
  correction_method: CorrectionMethod;
  time_to_correction: string | null;
  raw_correction_input: string | null;
  created_at: string;
}

// =====================================================
// SPOKE SETTINGS
// =====================================================

/** Business Spoke settings */
export interface SpokeSettings {
  confirmation_sms_enabled: boolean;
  edit_window_minutes: number;
  auto_draft_multi_job: boolean;
}

/** Default Spoke settings */
export const DEFAULT_SPOKE_SETTINGS: SpokeSettings = {
  confirmation_sms_enabled: true,
  edit_window_minutes: 30,
  auto_draft_multi_job: true,
};

// =====================================================
// API/WEBHOOK TYPES
// =====================================================

/** Incoming voice webhook payload */
export interface SpokeVoiceWebhookPayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  RecordingUrl?: string;
  RecordingDuration?: string;
  RecordingSid?: string;
}

/** Transcription result from Whisper */
export interface WhisperTranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments?: {
    start: number;
    end: number;
    text: string;
  }[];
}

/** Confirmation SMS template data */
export interface ConfirmationSMSData {
  contractor_name: string;
  customer_name?: string;
  status?: string;
  payment_amount?: number;
  payment_method?: string;
  duration_minutes?: number;
  notes?: string;
  edit_instructions: string;
}

// =====================================================
// PROCESSING PIPELINE
// =====================================================

/** Pipeline stage result */
export interface PipelineStageResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  duration_ms: number;
}

/** Full pipeline result */
export interface SpokePipelineResult {
  update_id: string;
  transcription: PipelineStageResult<WhisperTranscriptionResult>;
  parsing: PipelineStageResult<SpokeParsedData>;
  matching: PipelineStageResult<MatchSignals>;
  crm_write: PipelineStageResult<CRMWrites>;
  confirmation: PipelineStageResult<{ sms_id: string }>;
  total_duration_ms: number;
  final_status: SpokeUpdateStatus;
}
