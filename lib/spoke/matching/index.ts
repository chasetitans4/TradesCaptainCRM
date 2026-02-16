// =====================================================
// SPOKE - MATCHING MODULE EXPORTS
//
// Job matching intelligence for voice updates
// =====================================================

// Customer name matching
export {
  findCustomerMatches,
  resolvePronounToCustomer,
  type CustomerMatch,
  type CustomerMatchResult,
} from './customer-matcher';

// Multi-job detection (Beta: detection only)
export {
  detectMultipleJobs,
  isSimpleUpdate,
  generateMultiJobClarification,
  type MultiJobDetectionResult,
} from './multi-job-detector';

// Signal stack
export {
  calculateMatchSignals,
  getContractorLocation,
  type JobCandidate,
  type SignalResult,
  type JobMatchCandidate,
  type SignalStackResult,
} from './signal-stack';

// Composite scoring
export {
  calculateCompositeMatch,
  quickMatchByName,
  validateJobForMatch,
  type CompositeMatchResult,
} from './composite-scorer';

// Clarification flow
export {
  generateClarificationMessage,
  generateMultiJobClarificationMessage,
  sendClarificationSms,
  processClarificationReply,
  resolveDraft,
  hasPendingClarification,
  generateFollowUpMessage,
  type ClarificationOptions,
  type ClarificationMessage,
  type ClarificationReply,
} from './clarification';
