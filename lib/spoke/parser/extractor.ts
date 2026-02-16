// =====================================================
// SPOKE - MAIN EXTRACTOR
//
// Per Spoke Spec Section 4:
// Orchestrates the full parsing pipeline:
// 1. Pre-process transcript (strip fillers, detect corrections)
// 2. Tokenize to identify patterns
// 3. Normalize numbers
// 4. Extract structured data via Claude
// 5. Calculate confidence scores
// 6. Return parsed result
// =====================================================

import { smsLogger } from '@/lib/logger';
import type { SpokeParsedData } from '../types';
import { tokenizeTranscript, stripFillerWords } from './tokenizer';
import { normalizePaymentAmount, normalizeDuration } from './normalizer';
import { evaluateConfidence, type ConfidenceEvaluation } from './confidence';
import { extractFromTranscript } from '../prompts/extraction-prompt';

const extractorLogger = smsLogger.child({ context: 'spoke.extractor' });

// =====================================================
// EXTRACTION RESULT
// =====================================================

export interface ExtractorResult {
  success: boolean;

  /** Parsed data from transcript */
  parsed: SpokeParsedData;

  /** Confidence evaluation */
  confidence: ConfidenceEvaluation;

  /** Pre-processed transcript (fillers removed) */
  cleanedTranscript: string;

  /** Whether self-corrections were detected */
  hadCorrections: boolean;

  /** Processing latency in ms */
  latencyMs: number;

  /** Error if extraction failed */
  error?: string;
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

/**
 * Extract structured data from a voice transcript
 *
 * @param transcript - Raw transcript from Whisper
 * @param context - Optional context for better extraction
 */
export async function extractStructuredData(
  transcript: string,
  context?: {
    contractorId?: string;
    contractorName?: string;
    businessId?: string;
    recentCustomers?: string[];
    recentJobs?: { customerName: string; serviceType: string }[];
    audioQualityScore?: number;
  }
): Promise<ExtractorResult> {
  const startTime = Date.now();

  try {
    // Step 1: Pre-process transcript
    const { tokens, cleanedText, hasCorrections } = tokenizeTranscript(transcript);

    extractorLogger.info({
      msg: 'Transcript pre-processed',
      originalLength: transcript.length,
      cleanedLength: cleanedText.length,
      tokenCount: tokens.length,
      hasCorrections,
    });

    // Step 2: Quick pattern detection (before Claude)
    // This gives us hints about what to expect
    const quickParse = performQuickParse(cleanedText);

    extractorLogger.info({
      msg: 'Quick parse complete',
      hasStatus: !!quickParse.status,
      hasPayment: !!quickParse.payment,
      hasDuration: !!quickParse.duration,
    });

    // Step 3: Claude extraction for full structured data
    const claudeResult = await extractFromTranscript(cleanedText, {
      contractorName: context?.contractorName,
      recentCustomers: context?.recentCustomers,
      recentJobs: context?.recentJobs,
    });

    if (!claudeResult.success || !claudeResult.data) {
      extractorLogger.warn({
        msg: 'Claude extraction failed, using quick parse fallback',
        error: claudeResult.error,
      });

      // Fall back to quick parse results
      const confidence = evaluateConfidence(quickParse);

      return {
        success: true, // We have some data from quick parse
        parsed: quickParse,
        confidence,
        cleanedTranscript: cleanedText,
        hadCorrections: hasCorrections,
        latencyMs: Date.now() - startTime,
      };
    }

    // Step 4: Merge and validate results
    const merged = mergeResults(quickParse, claudeResult.data, hasCorrections);

    // Step 5: Adjust confidence based on audio quality
    if (context?.audioQualityScore !== undefined) {
      adjustConfidenceForAudio(merged, context.audioQualityScore);
    }

    // Step 6: Evaluate final confidence
    const confidence = evaluateConfidence(merged);

    extractorLogger.info({
      msg: 'Extraction complete',
      overallConfidence: confidence.overall,
      assessment: confidence.assessment,
      writeableFields: confidence.writeable,
      needsClarification: confidence.needsClarification,
      latencyMs: Date.now() - startTime,
    });

    return {
      success: true,
      parsed: merged,
      confidence,
      cleanedTranscript: cleanedText,
      hadCorrections: hasCorrections,
      latencyMs: Date.now() - startTime,
    };

  } catch (error) {
    extractorLogger.error({
      msg: 'Extraction error',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    });

    return {
      success: false,
      parsed: {},
      confidence: {
        overall: 0,
        fields: {},
        writeable: [],
        needsClarification: [],
        assessment: 'insufficient',
      },
      cleanedTranscript: transcript,
      hadCorrections: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Extraction failed',
    };
  }
}

// =====================================================
// QUICK PARSE (Before Claude)
// =====================================================

/**
 * Perform quick pattern-based parsing
 * This runs before Claude and provides fallback data
 */
function performQuickParse(text: string): SpokeParsedData {
  const result: SpokeParsedData = {};

  // Try to extract payment
  const paymentPatterns = [
    /(?:paid|collected|got)\s+(?:\$)?(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?)?(?:\s+(?:in\s+)?(cash|check|card|credit|debit|zelle|venmo))?/i,
    /(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?)\s*(?:(?:in\s+)?(cash|check|card))?/i,
  ];

  for (const pattern of paymentPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const method = match[2]?.toLowerCase() as any;

      result.payment = {
        amount,
        method: method || null,
        confidence: 0.85,
        raw_tokens: [match[0]],
      };
      break;
    }
  }

  // Try spoken number payment
  if (!result.payment) {
    const normalized = normalizePaymentAmount(text);
    if (normalized) {
      result.payment = {
        amount: normalized.value,
        method: null,
        confidence: normalized.confidence,
        raw_tokens: [normalized.original],
      };
    }
  }

  // Try to extract duration
  const durationPatterns = [
    /(?:took|spent|was there)\s+(?:about\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i,
    /(\d+)\s*(?:minutes?|mins?)/i,
  ];

  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      const isHours = /hours?|hrs?/i.test(match[0]);

      result.duration = {
        minutes: isHours ? Math.round(value * 60) : Math.round(value),
        confidence: 0.85,
        raw_tokens: [match[0]],
      };
      break;
    }
  }

  // Try spoken number duration
  if (!result.duration) {
    const normalized = normalizeDuration(text);
    if (normalized) {
      result.duration = {
        minutes: normalized.value,
        confidence: normalized.confidence,
        raw_tokens: [normalized.original],
      };
    }
  }

  // Try to extract status
  const lowerText = text.toLowerCase();

  const completionWords = ['finished', 'completed', 'done', 'wrapped up', 'all set', 'all done'];
  const issueWords = ['problem', 'issue', 'couldn\'t', 'unable', 'broken'];
  const delayWords = ['delayed', 'postponed', 'coming back', 'need to return'];

  if (completionWords.some(w => lowerText.includes(w))) {
    result.status = {
      value: 'complete',
      confidence: 0.90,
      raw_tokens: completionWords.filter(w => lowerText.includes(w)),
    };
  } else if (issueWords.some(w => lowerText.includes(w))) {
    result.status = {
      value: 'issue',
      confidence: 0.85,
      raw_tokens: issueWords.filter(w => lowerText.includes(w)),
    };
  } else if (delayWords.some(w => lowerText.includes(w))) {
    result.status = {
      value: 'delayed',
      confidence: 0.85,
      raw_tokens: delayWords.filter(w => lowerText.includes(w)),
    };
  }

  return result;
}

// =====================================================
// RESULT MERGING
// =====================================================

/**
 * Merge quick parse and Claude results
 * Prefer Claude results when available, but validate against quick parse
 */
function mergeResults(
  quickParse: SpokeParsedData,
  claudeParse: SpokeParsedData,
  hadCorrections: boolean
): SpokeParsedData {
  const merged: SpokeParsedData = { ...claudeParse };

  // For payment, validate Claude's amount against quick parse if both exist
  if (merged.payment && quickParse.payment) {
    const claudeAmount = merged.payment.amount;
    const quickAmount = quickParse.payment.amount;

    // If amounts match, boost confidence
    if (claudeAmount === quickAmount) {
      merged.payment.confidence = Math.min(merged.payment.confidence + 0.05, 1.0);
    }
    // If amounts differ significantly, reduce confidence
    else if (Math.abs(claudeAmount - quickAmount) / quickAmount > 0.2) {
      merged.payment.confidence *= 0.85;
    }
  }
  // If Claude didn't find payment but quick parse did, use quick parse
  else if (!merged.payment && quickParse.payment) {
    merged.payment = quickParse.payment;
  }

  // Same logic for duration
  if (merged.duration && quickParse.duration) {
    const claudeDuration = merged.duration.minutes;
    const quickDuration = quickParse.duration.minutes;

    if (claudeDuration === quickDuration) {
      merged.duration.confidence = Math.min(merged.duration.confidence + 0.05, 1.0);
    }
    else if (Math.abs(claudeDuration - quickDuration) / quickDuration > 0.3) {
      merged.duration.confidence *= 0.85;
    }
  }
  else if (!merged.duration && quickParse.duration) {
    merged.duration = quickParse.duration;
  }

  // Same logic for status
  if (merged.status && quickParse.status) {
    if (merged.status.value === quickParse.status.value) {
      merged.status.confidence = Math.min(merged.status.confidence + 0.05, 1.0);
    }
  }
  else if (!merged.status && quickParse.status) {
    merged.status = quickParse.status;
  }

  // Mark if corrections were detected
  if (hadCorrections && !merged.corrections_detected?.length) {
    merged.corrections_detected = [{ field: 'unknown', original: '', corrected: '' }];
  }

  return merged;
}

// =====================================================
// CONFIDENCE ADJUSTMENTS
// =====================================================

/**
 * Adjust confidence scores based on audio quality
 */
function adjustConfidenceForAudio(parsed: SpokeParsedData, audioQuality: number): void {
  const multiplier = audioQuality < 0.5 ? 0.8 : audioQuality < 0.7 ? 0.9 : 1.0;

  if (parsed.status) {
    parsed.status.confidence *= multiplier;
  }
  if (parsed.payment) {
    parsed.payment.confidence *= multiplier;
  }
  if (parsed.duration) {
    parsed.duration.confidence *= multiplier;
  }
  if (parsed.notes) {
    parsed.notes.confidence *= multiplier;
  }
  if (parsed.customer) {
    parsed.customer.confidence *= multiplier;
  }
}
