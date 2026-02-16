/**
 * Voice Module Exports
 *
 * AI Voice Receptionist v2.0 with Delta Adjustments
 */

// Call handler (main entry point)
export {
  handleIncomingCall,
  updateCallEvent,
  endCall,
  handleEmergencyDetection,
  triggerEmergencyEscalation,
  handleVoicemailEscape,
  type IncomingCallParams,
  type CallHandlerResult,
  type AvailabilityCheck,
} from './call-handler';

// Configuration resolver (Delta 2: Multi-location hierarchy)
export {
  resolveVoiceConfig,
  getVoiceSettings,
  getLocationOverride,
  isOverrideableField,
  isGlobalOnlyField,
  getResolvedFieldValue,
  upsertVoiceSettings,
  upsertLocationOverride,
  deleteLocationOverride,
} from './config-resolver';

// Confidence handling (Delta 4: Silence-over-guessing)
export {
  evaluateConfidence,
  evaluateEmergencyConfidence,
  evaluateServiceConfidence,
  evaluateIntentConfidence,
  getConfidenceActionMessage,
  shouldHandOffToHuman,
  shouldAskClarification,
  combineConfidenceResults,
} from './confidence';

// Escalation (Delta 1: Emergency-only voice)
export {
  buildEscalationPlan,
  executeEscalationStep,
  acknowledgeEscalation,
  getPendingEscalations,
  isEscalationAcknowledged,
} from './escalation';

// Emergency rules
export {
  getEmergencyRules,
  getEmergencyRule,
  createEmergencyRule,
  updateEmergencyRule,
  deleteEmergencyRule,
  addEmergencyPhrase,
  removeEmergencyPhrase,
  getDefaultEmergencyCategories,
  initializeDefaultEmergencyRules,
} from './emergency-rules';

// Escalation executor (notifications + outbound calls)
export {
  executeEscalation,
  getEscalationTarget,
  getEscalationContext,
  runEscalationLadder,
} from './escalation-executor';
