// =====================================================
// REPUTATION MANAGER - MAIN EXPORTS
//
// Convert completed jobs into verified public reputation
// Consumes Proof of Work artifacts (READ-ONLY reference)
// =====================================================

// Services
export {
  getReputationSettings,
  createReputationRequest,
  getRequestByToken,
  getRequestById,
  updateRequestStatus,
  getPendingRequests,
  getBusinessRequests,
} from './services/request-manager';

export {
  submitFeedback,
  trackReviewClick,
  logRecoveryAction,
  updateRecoveryStatus,
  assignRecovery,
} from './services/sentiment-router';

// Re-export types for convenience
export type {
  ReputationRequestStatus,
  ReputationDeliveryChannel,
  TCPAConsentMethod,
  SentimentCategory,
  RecoveryStatus,
  RecoveryActionType,
  ReviewPlatform,
  PowLinkPosition,
  ReputationRequest,
  ReputationFeedback,
  ReputationSettings,
  ReviewPlatformConfig,
  ReputationRecoveryLog,
  CreateReputationRequestInput,
  SubmitFeedbackInput,
  UpdateRecoveryInput,
  ReputationRequestWithDetails,
  ReputationDashboardStats,
  ReputationTrendPoint,
  TemplateContext,
} from '@/types/reputation';

export {
  DEFAULT_REPUTATION_SETTINGS,
  DEFAULT_REVIEW_PLATFORMS,
  REQUEST_STATUS_LABELS,
  SENTIMENT_CONFIG,
  RECOVERY_STATUS_LABELS,
  REVIEW_PLATFORM_CONFIG,
  categorizeSentiment,
  canSendRequest,
  canSendReminder,
} from '@/types/reputation';
