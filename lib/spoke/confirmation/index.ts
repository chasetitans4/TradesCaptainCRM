// =====================================================
// SPOKE - CONFIRMATION MODULE EXPORTS
//
// Confirmation SMS and edit flow
// =====================================================

// Template builder
export {
  buildConfirmationMessage,
  buildPartialConfirmation,
  buildDraftNotification,
  buildPaymentFollowUp,
  parsedToConfirmation,
  type ConfirmationData,
  type ConfirmationTemplate,
} from './template-builder';

// Message compressor
export {
  compressMessage,
  smartTruncate,
  truncateNotes,
  formatCurrencyCompact,
  formatDurationCompact,
  formatNameCompact,
  type CompressionResult,
} from './compressor';

// Edit handler
export {
  isEditable,
  startEditSession,
  generateEditSummary,
  parseEditReply,
  applyEdit,
  handleEditKeyword,
  handleEditCorrection,
  hasActiveEditSession,
  type EditSession,
  type EditResult,
} from './edit-handler';
