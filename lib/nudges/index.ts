/**
 * Nudge System
 *
 * Contextual Intelligence Layer nudge system.
 * Surfaces relevant information at the right moment without adding navigation complexity.
 *
 * "Features do not go to screens. Features come to the user."
 */

// Types
export type {
  Nudge,
  NudgeType,
  NudgeSource,
  NudgeEntityType,
  NudgeContext,
  NudgeEvaluator,
  NudgeEvaluatorResult,
  NudgeConfig,
  NudgeDismissal,
  NudgeDisplayConfig,
} from './types';

export {
  DEFAULT_NUDGE_DISPLAY_CONFIG,
  NUDGE_ICONS,
  NUDGE_TYPE_DESCRIPTIONS,
} from './types';

// Engine
export {
  registerEvaluator,
  unregisterEvaluator,
  getRegisteredEvaluators,
  evaluateNudges,
  evaluateNudgesWithTimeout,
  buildCustomerContext,
  buildJobContext,
  buildInvoiceContext,
  registerActionHandler,
  executeNudgeAction,
} from './nudge-engine';

// Dismissal Store
export {
  isNudgeDismissed,
  dismissNudge,
  undismissNudge,
  getActiveDismissals,
  getDismissalsForEntity,
  clearAllDismissals,
  cleanupExpiredDismissals,
  loadDismissalsFromServer,
  handleMaterialConditionChange,
  calculateContextHash,
  hasContextChanged,
  getDismissalKey,
} from './dismissal-store';

// Import evaluators to register them
import './evaluators';

// Re-export evaluator utilities
export {
  // Quiet Customer
  generateCheckinTemplate,

  // Promise Keeper
  FOLLOWUP_KEYWORDS,
  detectFollowupKeywords,
  suggestDueDate,
  type PromiseReminder,

  // Agreement Status
  getAgreementStatusDisplay,
  type MaintenanceAgreement,

  // While I'm Here
  getWhileImHereSuggestions,
  formatSuggestionIcon,
  formatSuggestionSourceLabel,
  type WhileImHereSuggestion,
  type SuggestionSource,
} from './evaluators';
