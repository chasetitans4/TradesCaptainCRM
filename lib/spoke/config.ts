// =====================================================
// SPOKE - CONFIGURATION
//
// Per Spoke Spec v1.0 (Beta Gate Addendum):
// All configuration constants and environment settings
//
// Beta Constraints:
// - Global thresholds only (no adaptive per-contractor)
// - No learning system features
// - One call = one job (multi-job → DRAFT)
// =====================================================

import {
  DEFAULT_CONFIDENCE_THRESHOLDS,
  DEFAULT_SPOKE_SETTINGS,
  MATCH_SIGNAL_WEIGHTS,
  type ConfidenceThresholds,
  type SpokeSettings,
} from './types';

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

/** OpenAI API key for Whisper transcription */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/** Anthropic API key for Claude parsing */
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/** Base URL for webhooks */
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// =====================================================
// PERFORMANCE BUDGETS
// Per Spec Section 12
// =====================================================

export const PERFORMANCE_BUDGETS = {
  /** Total processing time (hang-up → SMS confirmation) */
  TOTAL_PROCESSING_MS: 30_000,

  /** Whisper transcription budget */
  TRANSCRIPTION_MS: 3_000,

  /** Claude extraction budget */
  PARSING_MS: 1_500,

  /** Job matching budget */
  MATCHING_MS: 300,

  /** SMS delivery budget */
  SMS_DELIVERY_MS: 400,
} as const;

// =====================================================
// CONFIDENCE THRESHOLDS
// Per Spec Section 5.1 (Beta: Global only)
// =====================================================

/**
 * Get confidence thresholds
 * Beta: Returns global defaults only
 * Post-beta: Will support per-contractor adaptive thresholds
 */
export function getConfidenceThresholds(_contractorId?: string): ConfidenceThresholds {
  // Beta constraint: Global thresholds only
  // Post-beta: Look up contractor-specific thresholds
  return { ...DEFAULT_CONFIDENCE_THRESHOLDS };
}

// =====================================================
// MATCHING CONFIGURATION
// Per Spec Section 6
// =====================================================

export const MATCHING_CONFIG = {
  /** Signal weights for composite scoring */
  WEIGHTS: MATCH_SIGNAL_WEIGHTS,

  /** GPS proximity threshold in feet */
  GPS_PROXIMITY_THRESHOLD_FT: 500,

  /** Schedule window in hours (±) */
  SCHEDULE_WINDOW_HOURS: 2,

  /** Minimum composite score to auto-match */
  AUTO_MATCH_THRESHOLD: 0.85,

  /** Threshold below which to create DRAFT */
  DRAFT_THRESHOLD: 0.60,

  /** Maximum candidate jobs to return for clarification */
  MAX_CLARIFICATION_CANDIDATES: 3,
} as const;

// =====================================================
// CONFIRMATION SMS
// Per Spec Section 8
// =====================================================

export const CONFIRMATION_CONFIG = {
  /** Maximum characters per SMS segment */
  MAX_SMS_LENGTH: 160,

  /** Edit window in minutes */
  EDIT_WINDOW_MINUTES: 30,

  /** Keyword to trigger edit flow */
  EDIT_KEYWORD: 'EDIT',

  /** Clarification response timeout in hours */
  CLARIFICATION_TIMEOUT_HOURS: 24,
} as const;

// =====================================================
// AUDIO QUALITY
// Per Spec Section 3.1
// =====================================================

export const AUDIO_QUALITY_CONFIG = {
  /** Minimum acceptable SNR in dB */
  MIN_SNR_DB: 10,

  /** Good SNR threshold in dB */
  GOOD_SNR_DB: 20,

  /** Maximum recording duration in seconds */
  MAX_RECORDING_DURATION_SECONDS: 120,

  /** Minimum recording duration to process */
  MIN_RECORDING_DURATION_SECONDS: 2,
} as const;

// =====================================================
// TWILIO VOICE
// Per Spec Section 2
// =====================================================

export const TWILIO_VOICE_CONFIG = {
  /** Voice for prompts */
  VOICE: 'alice',

  /** Language for prompts */
  LANGUAGE: 'en-US',

  /** Max recording length in seconds */
  MAX_RECORDING_LENGTH: 120,

  /** Silence timeout (end recording after X seconds of silence) */
  TIMEOUT: 5,

  /** Play beep before recording */
  PLAY_BEEP: true,

  /** Transcription callback path */
  TRANSCRIPTION_CALLBACK: '/api/spoke/transcription',

  /** Recording complete callback path */
  RECORDING_CALLBACK: '/api/spoke/recording',

  /** Recording status callback path */
  STATUS_CALLBACK: '/api/spoke/status',
} as const;

// =====================================================
// WHISPER CONFIGURATION
// =====================================================

export const WHISPER_CONFIG = {
  /** Model to use */
  MODEL: 'whisper-1',

  /** Default language (can be auto-detected) */
  LANGUAGE: 'en',

  /** Response format */
  RESPONSE_FORMAT: 'verbose_json' as const,

  /** Temperature for transcription */
  TEMPERATURE: 0,
} as const;

// =====================================================
// CLAUDE CONFIGURATION
// =====================================================

export const CLAUDE_CONFIG = {
  /** Model for extraction */
  MODEL: 'claude-sonnet-4-20250514',

  /** Max tokens for response */
  MAX_TOKENS: 1024,

  /** Temperature for extraction (low for consistency) */
  TEMPERATURE: 0.1,
} as const;

// =====================================================
// BETA CONSTRAINTS
// Per Beta Gate Addendum
// =====================================================

export const BETA_CONSTRAINTS = {
  /** Learning features disabled in beta */
  LEARNING_ENABLED: false,

  /** Adaptive thresholds disabled in beta */
  ADAPTIVE_THRESHOLDS_ENABLED: false,

  /** Route prediction disabled in beta */
  ROUTE_PREDICTION_ENABLED: false,

  /** Multi-job segmentation disabled (detection only) */
  MULTI_JOB_SEGMENTATION_ENABLED: false,

  /** One call = one job */
  ONE_CALL_ONE_JOB: true,
} as const;

// =====================================================
// STOP CONDITIONS
// Per Spec Section 12
// =====================================================

export const STOP_CONDITIONS = {
  /** Minimum transcription accuracy */
  MIN_TRANSCRIPTION_ACCURACY: 0.85,

  /** Maximum acceptable edit rate */
  MAX_EDIT_RATE: 0.25,

  /** Maximum p50 latency in ms */
  MAX_P50_LATENCY_MS: 45_000,

  /** Minimum SMS delivery rate */
  MIN_SMS_DELIVERY_RATE: 0.95,

  /** Zero tolerance for payment errors */
  PAYMENT_ERROR_TOLERANCE: 0,
} as const;

// =====================================================
// DEFAULT SETTINGS FACTORY
// =====================================================

/**
 * Get default Spoke settings for a business
 */
export function getDefaultSpokeSettings(): SpokeSettings {
  return { ...DEFAULT_SPOKE_SETTINGS };
}

// =====================================================
// WEBHOOK URLS
// =====================================================

/**
 * Get the full webhook URL for a path
 */
export function getSpokeWebhookUrl(path: string): string {
  return `${APP_BASE_URL}${path}`;
}

/**
 * Get all Spoke webhook URLs
 */
export function getSpokeWebhookUrls() {
  return {
    voice: getSpokeWebhookUrl('/api/spoke/webhook'),
    recording: getSpokeWebhookUrl('/api/spoke/recording'),
    transcription: getSpokeWebhookUrl('/api/spoke/transcription'),
    status: getSpokeWebhookUrl('/api/spoke/status'),
    sms_reply: getSpokeWebhookUrl('/api/spoke/edit'),
  };
}

// =====================================================
// FEATURE FLAGS
// =====================================================

export const FEATURE_FLAGS = {
  /** Spoke system enabled */
  SPOKE_ENABLED: process.env.SPOKE_ENABLED === 'true',

  /** Verbose logging enabled */
  VERBOSE_LOGGING: process.env.NODE_ENV !== 'production',

  /** Dry run mode (no CRM writes) */
  DRY_RUN: process.env.SPOKE_DRY_RUN === 'true',
} as const;
