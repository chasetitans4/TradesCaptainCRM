// =====================================================
// SPOKE - CONFIDENCE SCORING
//
// Per Spoke Spec Section 5:
// Calculate confidence scores for parsed data fields.
//
// Confidence Thresholds (Beta - Global):
// - Payment: ≥0.90 to write
// - Status: ≥0.85 to write
// - Match: ≥0.85 to auto-match job
// - Duration: ≥0.75 to write
// - Notes: ≥0.70 to include
// =====================================================

import { getConfidenceThresholds } from '../config';
import type {
  SpokeParsedData,
  ConfidenceThresholds,
  ParsedPayment,
  ParsedStatus,
  ParsedDuration,
} from '../types';

// =====================================================
// CONFIDENCE EVALUATION
// =====================================================

export interface ConfidenceEvaluation {
  /** Overall confidence score (0.0 - 1.0) */
  overall: number;

  /** Per-field scores */
  fields: {
    status?: { score: number; meetsThreshold: boolean };
    payment?: { score: number; meetsThreshold: boolean };
    duration?: { score: number; meetsThreshold: boolean };
    notes?: { score: number; meetsThreshold: boolean };
    customer?: { score: number; meetsThreshold: boolean };
  };

  /** Fields that meet write thresholds */
  writeable: ('status' | 'payment' | 'duration' | 'notes')[];

  /** Fields that need clarification */
  needsClarification: string[];

  /** Overall assessment */
  assessment: 'high' | 'medium' | 'low' | 'insufficient';
}

/**
 * Evaluate confidence scores for parsed data
 */
export function evaluateConfidence(
  parsed: SpokeParsedData,
  thresholds?: ConfidenceThresholds
): ConfidenceEvaluation {
  const t = thresholds || getConfidenceThresholds();

  const fields: ConfidenceEvaluation['fields'] = {};
  const writeable: ConfidenceEvaluation['writeable'] = [];
  const needsClarification: string[] = [];

  // Evaluate status
  if (parsed.status) {
    const score = parsed.status.confidence;
    const meetsThreshold = score >= t.status;
    fields.status = { score, meetsThreshold };

    if (meetsThreshold) {
      writeable.push('status');
    } else if (score >= 0.5) {
      needsClarification.push('status');
    }
  }

  // Evaluate payment (most critical)
  if (parsed.payment) {
    const score = parsed.payment.confidence;
    const meetsThreshold = score >= t.payment;
    fields.payment = { score, meetsThreshold };

    if (meetsThreshold) {
      writeable.push('payment');
    } else if (score >= 0.5) {
      needsClarification.push('payment');
    }
  }

  // Evaluate duration
  if (parsed.duration) {
    const score = parsed.duration.confidence;
    const meetsThreshold = score >= t.duration;
    fields.duration = { score, meetsThreshold };

    if (meetsThreshold) {
      writeable.push('duration');
    } else if (score >= 0.5) {
      needsClarification.push('duration');
    }
  }

  // Evaluate notes
  if (parsed.notes) {
    const score = parsed.notes.confidence;
    const meetsThreshold = score >= t.notes;
    fields.notes = { score, meetsThreshold };

    if (meetsThreshold) {
      writeable.push('notes');
    }
  }

  // Evaluate customer reference
  if (parsed.customer) {
    const score = parsed.customer.confidence;
    const meetsThreshold = score >= t.match;
    fields.customer = { score, meetsThreshold };

    if (!meetsThreshold && score >= 0.5) {
      needsClarification.push('customer');
    }
  }

  // Calculate overall confidence
  const scores = Object.values(fields).map(f => f.score);
  const overall = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  // Determine assessment
  let assessment: ConfidenceEvaluation['assessment'];
  if (overall >= 0.85 && writeable.length >= 2) {
    assessment = 'high';
  } else if (overall >= 0.70 && writeable.length >= 1) {
    assessment = 'medium';
  } else if (overall >= 0.50) {
    assessment = 'low';
  } else {
    assessment = 'insufficient';
  }

  return {
    overall,
    fields,
    writeable,
    needsClarification,
    assessment,
  };
}

// =====================================================
// CONFIDENCE ADJUSTMENT
// =====================================================

/**
 * Adjust confidence based on audio quality
 */
export function adjustForAudioQuality(
  confidence: number,
  audioQualityScore: number
): number {
  // If audio quality is poor, reduce confidence
  if (audioQualityScore < 0.5) {
    return confidence * 0.8;
  }
  if (audioQualityScore < 0.7) {
    return confidence * 0.9;
  }
  return confidence;
}

/**
 * Adjust confidence based on self-correction
 * If the contractor corrected themselves, we're more confident in the corrected value
 */
export function adjustForCorrection(
  confidence: number,
  wasCorrection: boolean
): number {
  // Self-corrections indicate the speaker caught their mistake
  // This can actually increase confidence in the corrected value
  if (wasCorrection) {
    return Math.min(confidence * 1.05, 1.0);
  }
  return confidence;
}

/**
 * Adjust confidence based on context match
 * If the data matches expected patterns for this contractor/business, boost confidence
 */
export function adjustForContext(
  confidence: number,
  contextSignals: {
    matchesTypicalPaymentRange?: boolean;
    matchesTypicalDuration?: boolean;
    knownCustomer?: boolean;
  }
): number {
  let adjusted = confidence;

  // Boost if matches typical patterns
  if (contextSignals.matchesTypicalPaymentRange) {
    adjusted = Math.min(adjusted * 1.05, 1.0);
  }
  if (contextSignals.matchesTypicalDuration) {
    adjusted = Math.min(adjusted * 1.03, 1.0);
  }
  if (contextSignals.knownCustomer) {
    adjusted = Math.min(adjusted * 1.05, 1.0);
  }

  return adjusted;
}

// =====================================================
// THRESHOLD CHECKS
// =====================================================

/**
 * Check if payment can be written (≥0.90 confidence per spec)
 */
export function canWritePayment(
  payment: ParsedPayment | undefined,
  thresholds?: ConfidenceThresholds
): boolean {
  if (!payment) return false;
  const t = thresholds || getConfidenceThresholds();
  return payment.confidence >= t.payment;
}

/**
 * Check if status can be written (≥0.85 confidence per spec)
 */
export function canWriteStatus(
  status: ParsedStatus | undefined,
  thresholds?: ConfidenceThresholds
): boolean {
  if (!status) return false;
  const t = thresholds || getConfidenceThresholds();
  return status.confidence >= t.status;
}

/**
 * Check if duration can be written (≥0.75 confidence per spec)
 */
export function canWriteDuration(
  duration: ParsedDuration | undefined,
  thresholds?: ConfidenceThresholds
): boolean {
  if (!duration) return false;
  const t = thresholds || getConfidenceThresholds();
  return duration.confidence >= t.duration;
}

// =====================================================
// QUALITY SCORING
// =====================================================

/**
 * Calculate overall quality score for the update
 * Combines transcription, parsing, and match quality
 */
export function calculateQualityScore(
  transcriptionConfidence: number,
  audioQuality: number,
  parseConfidence: ConfidenceEvaluation,
  matchConfidence: number
): number {
  // Weighted combination
  const weights = {
    transcription: 0.25,
    audio: 0.15,
    parsing: 0.35,
    matching: 0.25,
  };

  const score =
    transcriptionConfidence * weights.transcription +
    audioQuality * weights.audio +
    parseConfidence.overall * weights.parsing +
    matchConfidence * weights.matching;

  return Math.round(score * 100) / 100;
}

/**
 * Determine if update should be auto-processed or needs draft/review
 */
export function shouldAutoProcess(
  qualityScore: number,
  hasPayment: boolean,
  paymentMeetsThreshold: boolean,
  statusMeetsThreshold: boolean
): { autoProcess: boolean; reason: string } {
  // Payment is critical - if present, must meet threshold
  if (hasPayment && !paymentMeetsThreshold) {
    return {
      autoProcess: false,
      reason: 'Payment confidence below threshold',
    };
  }

  // Overall quality check
  if (qualityScore >= 0.70 && statusMeetsThreshold) {
    return {
      autoProcess: true,
      reason: 'High quality update',
    };
  }

  if (qualityScore >= 0.50) {
    return {
      autoProcess: false,
      reason: 'Medium quality - needs confirmation',
    };
  }

  return {
    autoProcess: false,
    reason: 'Low quality - needs review',
  };
}
