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

// Re-export types from main leads-captain types
export * from '@/types/leads-captain';

// Re-export prompt types (excluding ConversationState to avoid conflict)
// The main types file has the lifecycle ConversationState (INITIATED, QUALIFYING, etc.)
// prompt-types has the agent ConversationState (initial, greeting_sent, etc.)
export {
  // Shared types
  type Season,
  type EmergencySeverity,
  type EmergencyCategory,
  type NoteType,
  type CustomerSentiment,
  type LeadQuality,
  type EstimatedJobValue,
  type ConversationOutcome,
  // Prompt 1
  type ExtractedInfo,
  type BusinessContext,
  type SimpleMessage,
  type ConversationAgentInput,
  type ConversationAgentFlags,
  type ConversationAgentOutput,
  // Prompt 2
  type EmergencyClassifierInput,
  type EmergencyClassifierOutput,
  // Prompt 3
  type ConversationAnalyzerInput,
  type ConversationAnalyzerOutput,
  // Prompt 4
  type NoteExtractorInput,
  type ExtractedNote,
  type KeyDetails,
  type NoteExtractorOutput,
  // Prompt 6
  type RuleMatcherInput,
  type RuleMatcherOutput,
  // Orchestrator
  type PromptResult,
  type PromptExecutionOptions,
  type OrchestratorContext,
  type OrchestrationResult,
  // Database types
  type LeadsCaptainConversationAnalysis,
  type LeadsCaptainExtractedNote,
  // Prompt configs
  type PromptSystemConfig,
  type AIModelConfig,
  // Async processing
  type ConversationAnalysisJob,
  type AsyncProcessingBatchResult,
  // Prompt 5
  type ConversationSummary,
  type AIInsightsInput,
  type BusinessInsight,
  type InsightsKeyMetrics,
  type AIInsightsOutput,
  // Prompt 7
  type HandoffSummarizerInput,
  type HandoffSummarizerOutput,
  // Prompt 9
  type SandboxTestScenario,
  type SandboxTestInput,
  type SandboxTestMessage,
  type SandboxTestAnalysis,
  type SandboxTestOutput,
  // Database types Phase 2
  type LeadsCaptainInsightsRecord,
  type LeadsCaptainHandoffRecord,
  type LeadsCaptainSandboxTestRecord,
  // Prompt 8
  type PhotoCategory,
  type PhotoUrgency,
  type PhotoAnalyzerInput,
  type DetectedIssue,
  type EquipmentIdentification,
  type PhotoAnalyzerOutput,
  type PhotoAnalysisResult,
  type LeadsCaptainPhotoAnalysisRecord,
} from '@/types/leads-captain/prompt-types';

// Export prompt-types ConversationState with alias to avoid conflict
export { type ConversationState as AgentConversationState } from '@/types/leads-captain/prompt-types';
