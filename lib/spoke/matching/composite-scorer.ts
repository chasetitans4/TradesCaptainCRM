// =====================================================
// SPOKE - COMPOSITE SCORER
//
// Per Spoke Spec Section 6.2:
// Combines all matching signals into final job match score.
//
// Beta Constraint:
// - Fixed thresholds (no adaptive adjustment)
// - Match threshold: 0.85
// =====================================================

import { smsLogger } from '@/lib/logger';
import { MATCHING_CONFIG } from '../config';
import type { MatchSignals } from '../types';
import {
  calculateMatchSignals,
  getContractorLocation,
  type SignalStackResult,
  type JobMatchCandidate,
} from './signal-stack';
import { findCustomerMatches } from './customer-matcher';

const scorerLogger = smsLogger.child({ context: 'spoke.composite-scorer' });

// =====================================================
// TYPES
// =====================================================

export interface CompositeMatchResult {
  /** Best matched job */
  matchedJob: {
    jobId: string;
    customerId: string;
    customerName: string;
    serviceType: string | null;
  } | null;

  /** Match confidence (0-1) */
  confidence: number;

  /** Whether match meets threshold for auto-write */
  meetsThreshold: boolean;

  /** Whether multiple jobs are close in score */
  isAmbiguous: boolean;

  /** Whether clarification is needed */
  needsClarification: boolean;

  /** Signals that contributed to match */
  matchSignals: MatchSignals;

  /** Alternative matches for clarification */
  alternatives: Array<{
    jobId: string;
    customerName: string;
    score: number;
  }>;

  /** Human-readable explanation */
  explanation: string;
}

// =====================================================
// MAIN SCORING FUNCTION
// =====================================================

/**
 * Calculate composite match score for a voice update
 *
 * Combines signals from:
 * - Customer name mention (from transcript)
 * - GPS proximity (from technician location)
 * - Schedule window (job scheduled around now)
 * - Last viewed job (from app activity)
 */
export async function calculateCompositeMatch(
  businessId: string,
  contractorPhoneId: string,
  parsedData: {
    customerName?: string;
    customerConfidence?: number;
    status?: string;
  },
  transcript?: string
): Promise<CompositeMatchResult> {
  const startTime = Date.now();

  try {
    // Get contractor's current location if available
    const contractorLocation = await getContractorLocation(contractorPhoneId);

    // Calculate signals for all candidate jobs
    const signalResult = await calculateMatchSignals(
      businessId,
      contractorPhoneId,
      {
        customerName: parsedData.customerName,
        customerConfidence: parsedData.customerConfidence,
      },
      contractorLocation || undefined
    );

    // Build match signals object
    const matchSignals = buildMatchSignals(signalResult);

    // Determine result
    if (!signalResult.bestMatch) {
      scorerLogger.info({
        msg: 'No matching job found',
        businessId,
        customerName: parsedData.customerName,
        latencyMs: Date.now() - startTime,
      });

      return {
        matchedJob: null,
        confidence: 0,
        meetsThreshold: false,
        isAmbiguous: false,
        needsClarification: true,
        matchSignals,
        alternatives: [],
        explanation: 'No matching job found. Please specify the customer name.',
      };
    }

    const bestMatch = signalResult.bestMatch;
    const confidence = bestMatch.confidence;
    const meetsThreshold = confidence >= MATCHING_CONFIG.AUTO_MATCH_THRESHOLD;

    // Build alternatives list for clarification
    const alternatives = signalResult.candidates
      .slice(1, 4) // Top 3 alternatives
      .map(c => ({
        jobId: c.job.jobId,
        customerName: c.job.customerName,
        score: c.totalScore,
      }));

    // Generate explanation
    const explanation = generateExplanation(bestMatch, signalResult);

    scorerLogger.info({
      msg: 'Composite match calculated',
      matchedJobId: bestMatch.job.jobId,
      confidence,
      meetsThreshold,
      isAmbiguous: signalResult.isAmbiguous,
      signalCount: bestMatch.signals.length,
      latencyMs: Date.now() - startTime,
    });

    return {
      matchedJob: {
        jobId: bestMatch.job.jobId,
        customerId: bestMatch.job.customerId,
        customerName: bestMatch.job.customerName,
        serviceType: bestMatch.job.serviceType,
      },
      confidence,
      meetsThreshold,
      isAmbiguous: signalResult.isAmbiguous,
      needsClarification: signalResult.needsClarification,
      matchSignals,
      alternatives,
      explanation,
    };

  } catch (error) {
    scorerLogger.error({
      msg: 'Composite scoring error',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    });

    return {
      matchedJob: null,
      confidence: 0,
      meetsThreshold: false,
      isAmbiguous: false,
      needsClarification: true,
      matchSignals: {
        customer_name_match: undefined,
        gps_proximity: undefined,
        schedule_window: undefined,
        last_viewed: undefined,
        composite_score: 0,
      },
      alternatives: [],
      explanation: 'Error calculating match. Manual assignment required.',
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Build MatchSignals object from signal stack result
 */
function buildMatchSignals(result: SignalStackResult): MatchSignals {
  const signals: MatchSignals = {
    customer_name_match: undefined,
    gps_proximity: undefined,
    schedule_window: undefined,
    last_viewed: undefined,
    composite_score: 0,
  };

  if (!result.bestMatch) return signals;
  
  signals.composite_score = result.bestMatch.normalizedScore;

  for (const signal of result.bestMatch.signals) {
    switch (signal.signal) {
      case 'customer_name':
        signals.customer_name_match = signal.score;
        break;
      case 'gps_proximity':
        signals.gps_proximity = signal.score;
        break;
      case 'schedule_window':
        signals.schedule_window = signal.score;
        break;
      case 'last_viewed':
        signals.last_viewed = signal.score;
        break;
      case 'recent_activity':
        signals.recent_activity = signal.score;
        break;
    }
  }

  return signals;
}

/**
 * Generate human-readable explanation of match
 */
function generateExplanation(
  bestMatch: JobMatchCandidate,
  result: SignalStackResult
): string {
  const parts: string[] = [];

  // Summarize primary signal
  const primarySignal = bestMatch.signals[0];
  if (primarySignal) {
    switch (primarySignal.signal) {
      case 'customer_name':
        parts.push(`Matched by customer name "${bestMatch.job.customerName}"`);
        break;
      case 'gps_proximity':
        parts.push(`Matched by GPS proximity to job site`);
        break;
      case 'schedule_window':
        parts.push(`Matched by scheduled time window`);
        break;
      case 'last_viewed':
        parts.push(`Matched to last viewed job`);
        break;
      case 'recent_activity':
        parts.push(`Matched due to recent activity`);
        break;
    }
  }

  // Note confidence level
  const confidencePercent = Math.round(bestMatch.confidence * 100);
  if (confidencePercent >= 90) {
    parts.push(`(${confidencePercent}% confident)`);
  } else if (confidencePercent >= 85) {
    parts.push(`(${confidencePercent}% confident - meets threshold)`);
  } else {
    parts.push(`(${confidencePercent}% confident - needs confirmation)`);
  }

  // Note ambiguity
  if (result.isAmbiguous) {
    parts.push(`Multiple possible matches detected.`);
  }

  return parts.join(' ');
}

/**
 * Quick match when customer name is explicitly mentioned
 * Bypasses full signal stack for performance
 */
export async function quickMatchByName(
  customerName: string,
  businessId: string,
  recentJobCustomerIds?: string[]
): Promise<{
  customerId: string;
  customerName: string;
  confidence: number;
} | null> {
  const matchResult = await findCustomerMatches(
    customerName,
    businessId,
    recentJobCustomerIds
  );

  if (matchResult.bestMatch && matchResult.confidence >= MATCHING_CONFIG.AUTO_MATCH_THRESHOLD) {
    return {
      customerId: matchResult.bestMatch.customerId,
      customerName: matchResult.bestMatch.customerName,
      confidence: matchResult.confidence,
    };
  }

  return null;
}

/**
 * Validate that a job belongs to the business and is matchable
 */
export async function validateJobForMatch(
  jobId: string,
  businessId: string
): Promise<boolean> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .eq('business_id', businessId)
      .in('status', ['SCHEDULED', 'IN_PROGRESS', 'PENDING'])
      .single();

    return !!data;
  } catch {
    return false;
  }
}
