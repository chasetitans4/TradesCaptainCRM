// =====================================================
// Trades Captain AI - Prompt Modules
// Specialized 9-prompt architecture (Phase 1 & 2)
// =====================================================

// Base utilities
export {
  // AI clients
  getAnthropic,
  getOpenAI,

  // Retry and timeout utilities
  withRetry,
  withTimeout,
  sleep,

  // JSON parsing
  parseJSONResponse,

  // API helpers
  callClaude,
  callOpenAI,

  // Result helpers
  successResult,
  errorResult,

  // Text utilities
  truncateText,
  normalizeText,
  extractEmergencyKeywords,
  getCurrentSeason,

  // Configuration
  MODEL_CONFIGS,
  DEFAULT_PROMPT_OPTIONS,

  // Logging
  logPromptExecution,
} from './base-prompt';

// Prompt 1: Conversation Agent
export {
  executeConversationAgent,
  detectHandoffRequest,
  inferUrgency,
} from './conversation-agent';

// Prompt 2: Emergency Classifier
export {
  executeEmergencyClassifier,
  quickEmergencyCheck,
} from './emergency-classifier';

// Prompt 3: Conversation Analyzer
export {
  executeConversationAnalyzer,
  analyzeConversationBatch,
} from './conversation-analyzer';

// Prompt 4: Note Extractor
export {
  executeNoteExtractor,
  quickExtractNotes,
} from './note-extractor';

// Prompt 6: Rule Matcher (Non-LLM)
export {
  executeRuleMatcher,
  detectSentiment,
} from './rule-matcher';

// =====================================================
// PHASE 2 PROMPTS (Pro Tier)
// =====================================================

// Prompt 5: AI Insights Generator
export {
  executeAIInsightsGenerator,
  generateInsightsForBusiness,
  buildConversationSummary,
} from './ai-insights-generator';

// Prompt 7: Handoff Summarizer
export {
  executeHandoffSummarizer,
  summarizeForHandoff,
} from './handoff-summarizer';

// Prompt 9: Sandbox Test Agent
export {
  executeFullSandboxTest,
  testSingleResponse,
} from './sandbox-test-agent';

// =====================================================
// PHASE 3 PROMPTS (Advanced Tier)
// =====================================================

// Prompt 8: Photo Analyzer
export {
  executePhotoAnalyzer,
  analyzePhotoSet,
  quickPhotoAnalysisFromContext,
} from './photo-analyzer';

// Re-export types
export type {
  // Shared types
  ConversationState,
  Season,
  EmergencySeverity,
  EmergencyCategory,
  NoteType,
  CustomerSentiment,
  LeadQuality,
  EstimatedJobValue,
  ConversationOutcome,

  // Prompt 1 types
  ExtractedInfo,
  BusinessContext,
  SimpleMessage,
  ConversationAgentInput,
  ConversationAgentFlags,
  ConversationAgentOutput,

  // Prompt 2 types
  EmergencyClassifierInput,
  EmergencyClassifierOutput,

  // Prompt 3 types
  ConversationAnalyzerInput,
  ConversationAnalyzerOutput,

  // Prompt 4 types
  NoteExtractorInput,
  NoteExtractorOutput,
  ExtractedNote,
  KeyDetails,

  // Prompt 6 types
  RuleMatcherInput,
  RuleMatcherOutput,

  // Orchestrator types
  PromptResult,
  PromptExecutionOptions,
  OrchestratorContext,
  OrchestrationResult,

  // Database types
  LeadsCaptainConversationAnalysis,
  LeadsCaptainExtractedNote,

  // Config types
  PromptSystemConfig,
  AIModelConfig,

  // Async processing types
  ConversationAnalysisJob,
  AsyncProcessingBatchResult,

  // Phase 2 types - Prompt 5 (AI Insights)
  ConversationSummary,
  AIInsightsInput,
  AIInsightsOutput,
  BusinessInsight,
  InsightsKeyMetrics,

  // Phase 2 types - Prompt 7 (Handoff Summarizer)
  HandoffSummarizerInput,
  HandoffSummarizerOutput,

  // Phase 2 types - Prompt 9 (Sandbox Test)
  SandboxTestScenario,
  SandboxTestInput,
  SandboxTestMessage,
  SandboxTestAnalysis,
  SandboxTestOutput,

  // Phase 2 database types
  LeadsCaptainInsightsRecord,
  LeadsCaptainHandoffRecord,
  LeadsCaptainSandboxTestRecord,

  // Phase 3 types - Prompt 8 (Photo Analyzer)
  PhotoCategory,
  PhotoUrgency,
  PhotoAnalyzerInput,
  PhotoAnalyzerOutput,
  DetectedIssue,
  EquipmentIdentification,
  PhotoAnalysisResult,

  // Phase 3 database types
  LeadsCaptainPhotoAnalysisRecord,
} from '@/types/leads-captain/prompt-types';
