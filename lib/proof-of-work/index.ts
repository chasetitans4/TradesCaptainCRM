// =====================================================
// PROOF OF WORK (TM) LIBRARY
//
// Homeowner-facing trust verification system
// GPS-verified timestamps, verified photos, system-generated timelines
//
// EXPLICIT LOCKS (Non-Negotiable):
//   1. Finalization delay MUST read from business.pow_finalization_delay_minutes
//      (never hard-coded in service code)
//   2. PDF export is NOT in v1 scope (Phase 2+ only)
// =====================================================

// Generator - Main PoW creation and management
export {
  createProofOfWork,
  updateProofOfWork,
  completeProofOfWork,
  finalizeProofOfWork,
  getProofOfWorkByToken,
  getProofOfWorkByShortCode,
  getProofOfWorkByJobId,
  getBusinessPowSettings,
  recordView,
  recordShare,
} from './generator';

// Photo Verification
export {
  verifyPhoto,
  verifyJobPhotos,
  getVerifiedPhotosForPow,
  findDuplicatePhotos,
  generatePerceptualHash,
} from './photo-verification';

// Timeline
export {
  buildTimeline,
  getTimeline,
  addSentEvent,
  formatTimelineForDisplay,
} from './timeline';

// QR Code Generation
export {
  generateQrCodePng,
  generateQrCodeSvg,
  generateQrCodes,
  generateQrCodeForDisplay,
  getQrCodeOptions,
} from './qr-code';

// Summary Templates
export {
  selectSummaryTemplate,
  getTemplatesForTrade,
  getTemplatedTrades,
  getTemplateById,
  normalizeTradeName,
  getDefaultSummaryText,
} from './summary-templates';

// Delivery
export {
  deliverProofOfWork,
  getPendingDeliveries,
  processPendingDeliveries,
} from './delivery';

// Re-export all types
export * from '@/types/proof-of-work';
