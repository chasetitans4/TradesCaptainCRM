// =====================================================
// Leads Captain v2.0 Core Engine
// Rules-first AI SMS response system
// =====================================================

// Main processor
export { processInboundMessage, type ProcessorOptions } from './processor';

// Intent classification
export { classifyIntent, type ClassifierOptions } from './intent-classifier';

// Rule engine
export {
  evaluateRules,
  evaluateCondition,
  executeRuleActions,
  isWithinBusinessHours,
  isWithinQuietHours,
  getNextAvailableTime,
} from './rule-engine';

// Template rendering
export { renderTemplate, extractTemplateVariables } from './template-renderer';

// AI guardrails
export { generateAIResponse, applyGuardrails, buildSystemPrompt } from './guardrails';

// TCPA compliance
export { handleCompliance, isOptedOut, sendComplianceResponse } from './compliance';

// Feature gating
export { canAccessFeature, getFeatureLimits, checkPlanLimit } from './features';

// New orchestrator adapter (feature-flagged)
export { processWithNewOrchestrator } from './orchestrator-adapter';

// Re-export types
export * from '@/types/leads-captain';

// Re-export prompt types
export * from '@/types/leads-captain/prompt-types';
