/**
 * Confidence Handling - Delta 4: Silence-Over-Guessing Rule
 *
 * Rule (ABSOLUTE): If confidence is insufficient, the AI must
 * remain silent or defer, never guess.
 *
 * Applies to:
 * - Emergency detection ambiguity
 * - Service classification uncertainty
 * - Customer intent uncertainty
 * - Routing ambiguity
 */

import { logger } from '@/lib/logger';
import type {
  ConfidenceResult,
  ConfidenceThresholds,
  ConfidenceAction,
} from '@/types/voice-receptionist';
import { DEFAULT_CONFIDENCE_THRESHOLDS } from '@/types/voice-receptionist';

const confidenceLogger = logger.child({ module: 'voice-confidence' });

/**
 * Delta 4: Evaluate confidence and determine action
 *
 * Behavior Matrix:
 * - High (>= 0.85): Proceed with action
 * - Medium (0.60-0.85): Ask clarifying question
 * - Low (< 0.60): Defer to human review OR end safely
 *
 * PROHIBITED:
 * - Making assumptions
 * - Defaulting to emergency without confirmation
 * - Guessing service categories
 */
export function evaluateConfidence(
  confidence: number,
  context: string,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS
): ConfidenceResult {
  // High confidence - proceed
  if (confidence >= thresholds.high) {
    return {
      confidence,
      action: 'proceed',
    };
  }

  // Medium confidence - ask for clarification
  if (confidence >= thresholds.medium) {
    confidenceLogger.info({
      msg: 'Medium confidence - requesting clarification',
      confidence,
      context,
      threshold: thresholds.medium,
    });

    return {
      confidence,
      action: 'clarify',
      reason: `Confidence ${(confidence * 100).toFixed(0)}% for ${context} - asking clarifying question`,
    };
  }

  // Low confidence - defer to human or end safely
  // Delta 4: NEVER guess when confidence is low
  confidenceLogger.warn({
    msg: 'Low confidence - deferring to human',
    confidence,
    context,
    threshold: thresholds.medium,
  });

  return {
    confidence,
    action: 'defer',
    reason: `Confidence ${(confidence * 100).toFixed(0)}% too low for ${context} - deferring to human`,
  };
}

/**
 * Evaluate emergency detection confidence
 * Delta 4: Never guess on emergencies - this is critical for safety
 */
export function evaluateEmergencyConfidence(
  phraseMatch: { matched: boolean; confidence: number; phrase?: string; type?: 'required' | 'optional' },
  callerConfirmation: boolean | null
): ConfidenceResult {
  // Caller explicitly confirmed emergency - high confidence
  if (callerConfirmation === true) {
    return {
      confidence: 1.0,
      action: 'proceed',
      reason: 'Caller confirmed emergency',
    };
  }

  // Caller explicitly denied emergency - high confidence (not an emergency)
  if (callerConfirmation === false) {
    return {
      confidence: 1.0,
      action: 'proceed', // Proceed as non-emergency
      reason: 'Caller denied emergency',
    };
  }

  // Required phrase matched with high confidence - immediate emergency
  if (phraseMatch.matched && phraseMatch.type === 'required' && phraseMatch.confidence >= 0.9) {
    confidenceLogger.info({
      msg: 'Required emergency phrase detected',
      phrase: phraseMatch.phrase,
      confidence: phraseMatch.confidence,
    });

    return {
      confidence: phraseMatch.confidence,
      action: 'proceed',
      reason: `Required phrase "${phraseMatch.phrase}" detected with ${(phraseMatch.confidence * 100).toFixed(0)}% confidence`,
    };
  }

  // Optional phrase matched - ask for confirmation
  if (phraseMatch.matched && phraseMatch.confidence >= 0.7) {
    return {
      confidence: phraseMatch.confidence,
      action: 'clarify',
      reason: `Optional phrase "${phraseMatch.phrase}" detected - asking for confirmation`,
    };
  }

  // No clear signal - always ask the standard emergency question
  // Delta 4: Never assume emergency status without confirmation
  return {
    confidence: 0.5,
    action: 'clarify',
    reason: 'No emergency indicators detected - asking standard confirmation question',
  };
}

/**
 * Evaluate service category confidence
 * Delta 4: Never guess service categories
 */
export function evaluateServiceConfidence(
  detectedCategory: string | null,
  confidence: number,
  availableCategories: string[]
): ConfidenceResult {
  // No category detected - ask the caller
  if (!detectedCategory) {
    return {
      confidence: 0,
      action: 'clarify',
      reason: 'No service category detected - asking caller to specify',
    };
  }

  // Detected category not in available list - defer
  if (!availableCategories.includes(detectedCategory)) {
    confidenceLogger.warn({
      msg: 'Detected category not available',
      detectedCategory,
      availableCategories,
    });

    return {
      confidence: 0,
      action: 'defer',
      reason: `Detected category "${detectedCategory}" not in available categories - deferring to human`,
    };
  }

  // Evaluate confidence for the detected category
  return evaluateConfidence(confidence, `service category: ${detectedCategory}`);
}

/**
 * Evaluate customer intent confidence
 */
export function evaluateIntentConfidence(
  detectedIntent: string | null,
  confidence: number,
  validIntents: string[]
): ConfidenceResult {
  if (!detectedIntent) {
    return {
      confidence: 0,
      action: 'clarify',
      reason: 'Could not determine customer intent - asking for clarification',
    };
  }

  if (!validIntents.includes(detectedIntent)) {
    return {
      confidence: 0,
      action: 'defer',
      reason: `Detected intent "${detectedIntent}" not recognized - deferring to human`,
    };
  }

  return evaluateConfidence(confidence, `customer intent: ${detectedIntent}`);
}

/**
 * Get the appropriate action message for a confidence result
 */
export function getConfidenceActionMessage(result: ConfidenceResult): string {
  switch (result.action) {
    case 'proceed':
      return 'Proceeding with detected intent';

    case 'clarify':
      return result.reason || 'Asking for clarification';

    case 'defer':
      return result.reason || 'Deferring to human review';

    case 'end_safely':
      return 'Ending interaction safely due to uncertainty';

    default:
      return 'Unknown action';
  }
}

/**
 * Should the AI continue or hand off to human?
 */
export function shouldHandOffToHuman(result: ConfidenceResult): boolean {
  return result.action === 'defer' || result.action === 'end_safely';
}

/**
 * Should the AI ask a clarifying question?
 */
export function shouldAskClarification(result: ConfidenceResult): boolean {
  return result.action === 'clarify';
}

/**
 * Combine multiple confidence results (take the most conservative)
 */
export function combineConfidenceResults(results: ConfidenceResult[]): ConfidenceResult {
  if (results.length === 0) {
    return {
      confidence: 0,
      action: 'defer',
      reason: 'No confidence results to combine',
    };
  }

  // Priority: defer > end_safely > clarify > proceed
  const actionPriority: Record<ConfidenceAction, number> = {
    defer: 0,
    end_safely: 1,
    clarify: 2,
    proceed: 3,
  };

  // Take the most conservative action
  const sortedResults = [...results].sort(
    (a, b) => actionPriority[a.action] - actionPriority[b.action]
  );

  const mostConservative = sortedResults[0];

  // Use the minimum confidence
  const minConfidence = Math.min(...results.map(r => r.confidence));

  return {
    confidence: minConfidence,
    action: mostConservative.action,
    reason: mostConservative.reason,
  };
}
