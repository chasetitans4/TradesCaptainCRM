// =====================================================
// SPOKE - PARSER MODULE EXPORTS
// =====================================================

// Tokenizer
export {
  tokenizeTranscript,
  stripFillerWords,
  detectStatusTokens,
  detectPaymentMethodTokens,
  detectCorrectionSignals,
  hasStatusIndicator,
  hasPaymentIndicator,
  hasDurationIndicator,
  STATUS_COMPLETE_PATTERNS,
  STATUS_DELAYED_PATTERNS,
  STATUS_ISSUE_PATTERNS,
  PAYMENT_METHOD_PATTERNS,
  FILLER_WORDS,
  CORRECTION_SIGNALS,
  type Token,
} from './tokenizer';

// Normalizer
export {
  normalizePaymentAmount,
  normalizeDuration,
  extractAllNumbers,
  type NormalizedNumber,
} from './normalizer';

// Confidence
export {
  evaluateConfidence,
  adjustForAudioQuality,
  adjustForCorrection,
  adjustForContext,
  canWritePayment,
  canWriteStatus,
  canWriteDuration,
  calculateQualityScore,
  shouldAutoProcess,
  type ConfidenceEvaluation,
} from './confidence';

// Extractor
export {
  extractStructuredData,
  type ExtractorResult,
} from './extractor';
