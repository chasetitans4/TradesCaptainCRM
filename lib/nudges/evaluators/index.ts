/**
 * Nudge Evaluators Registry
 *
 * Registers all nudge evaluators with the nudge engine.
 * Import this module to enable all evaluators.
 */

import { registerEvaluator } from '../nudge-engine';

// Import evaluators
import { quietCustomerEvaluator, generateCheckinTemplate } from './quiet-customer';
import {
  promiseDueEvaluator,
  FOLLOWUP_KEYWORDS,
  detectFollowupKeywords,
  suggestDueDate,
  type PromiseReminder,
} from './promise-due';
import {
  agreementStatusEvaluator,
  getAgreementStatusDisplay,
  type MaintenanceAgreement,
} from './agreement-status';
import {
  whileImHereEvaluator,
  getWhileImHereSuggestions,
  formatSuggestionIcon,
  formatSuggestionSourceLabel,
  type WhileImHereSuggestion,
  type SuggestionSource,
} from './while-im-here';

/**
 * Register all evaluators
 */
export function registerAllEvaluators(): void {
  registerEvaluator(quietCustomerEvaluator);
  registerEvaluator(promiseDueEvaluator);
  registerEvaluator(agreementStatusEvaluator);
  registerEvaluator(whileImHereEvaluator);
}

// Auto-register on import
registerAllEvaluators();

// Re-export evaluators for direct use
export {
  // Quiet Customer
  quietCustomerEvaluator,
  generateCheckinTemplate,

  // Promise Keeper
  promiseDueEvaluator,
  FOLLOWUP_KEYWORDS,
  detectFollowupKeywords,
  suggestDueDate,
  type PromiseReminder,

  // Agreement Status
  agreementStatusEvaluator,
  getAgreementStatusDisplay,
  type MaintenanceAgreement,

  // While I'm Here
  whileImHereEvaluator,
  getWhileImHereSuggestions,
  formatSuggestionIcon,
  formatSuggestionSourceLabel,
  type WhileImHereSuggestion,
  type SuggestionSource,
};
