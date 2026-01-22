// =====================================================
// Trades Captain AI - Prompt Types
// Specialized 9-prompt architecture for AI orchestration
// =====================================================

import {
  LeadsCaptainMessage,
  LeadsCaptainRule,
  LeadsCaptainConversation,
  SentimentType,
  ToneOption,
} from './index';

// =====================================================
// SHARED TYPES
// =====================================================

/**
 * Conversation state for tracking progress through the conversation
 */
export type ConversationState =
  | 'initial'
  | 'greeting_sent'
  | 'capturing_need'
  | 'capturing_address'
  | 'capturing_urgency'
  | 'capturing_time'
  | 'capturing_name'
  | 'info_complete'
  | 'awaiting_response'
  | 'handoff_requested'
  | 'emergency_detected'
  | 'completed';

/**
 * Season for emergency classification context
 */
export type Season = 'winter' | 'spring' | 'summer' | 'fall';

/**
 * Emergency severity levels
 */
export type EmergencySeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Emergency categories
 */
export type EmergencyCategory =
  | 'water_damage'
  | 'no_heat'
  | 'no_ac'
  | 'gas_leak'
  | 'electrical'
  | 'sewage'
  | 'carbon_monoxide'
  | 'other';

/**
 * Note types for extracted notes
 */
export type NoteType =
  | 'service_detail'
  | 'scheduling'
  | 'concern'
  | 'follow_up'
  | 'general';

/**
 * Customer sentiment from analysis
 */
export type CustomerSentiment = 'positive' | 'neutral' | 'frustrated' | 'angry';

/**
 * Lead quality rating
 */
export type LeadQuality = 'hot' | 'warm' | 'cold';

/**
 * Estimated job value
 */
export type EstimatedJobValue = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Conversation outcome
 */
export type ConversationOutcome =
  | 'lead_captured'
  | 'human_takeover'
  | 'abandoned'
  | 'completed';

// =====================================================
// PROMPT 1: CONVERSATION AGENT
// Handle live SMS conversations
// =====================================================

/**
 * Extracted customer information
 */
export interface ExtractedInfo {
  serviceNeeded: string | null;
  address: string | null;
  urgency: string | null;
  preferredTime: string | null;
  customerName: string | null;
}

/**
 * Business context for conversation
 */
export interface BusinessContext {
  name: string;
  type: string;
  serviceArea: string;
  tone: ToneOption;
  isOpen: boolean;
  hoursToday: string;
  bookingLink?: string;
  emergencyPhone?: string;
}

/**
 * Simplified message for context
 */
export interface SimpleMessage {
  role: 'customer' | 'business';
  content: string;
  timestamp: string;
}

/**
 * Input for the Conversation Agent (Prompt 1)
 */
export interface ConversationAgentInput {
  message: string;
  conversationHistory: SimpleMessage[]; // Last 10 max
  businessContext: BusinessContext;
  extractedInfo: ExtractedInfo;
  matchedRule: LeadsCaptainRule | null;
  isEmergency: boolean;
  conversationState: ConversationState;
}

/**
 * Flags output from Conversation Agent
 */
export interface ConversationAgentFlags {
  emergencyDetected: boolean;
  emergencyKeywords: string[];
  handoffRequested: boolean;
  handoffReason: string | null;
}

/**
 * Output from the Conversation Agent (Prompt 1)
 */
export interface ConversationAgentOutput {
  replyText: string; // Max 320 chars for SMS
  state: ConversationState;
  extracted: Partial<ExtractedInfo>;
  flags: ConversationAgentFlags;
  checklistCovered: string[];
  internalNotes: string;
}

// =====================================================
// PROMPT 2: EMERGENCY CLASSIFIER
// Confirm emergency severity
// =====================================================

/**
 * Input for the Emergency Classifier (Prompt 2)
 */
export interface EmergencyClassifierInput {
  message: string;
  conversationHistory: SimpleMessage[]; // Last 5
  detectedKeywords: string[];
  businessType: string;
  currentSeason: Season;
}

/**
 * Output from the Emergency Classifier (Prompt 2)
 */
export interface EmergencyClassifierOutput {
  isEmergency: boolean;
  severity: EmergencySeverity;
  category: EmergencyCategory;
  summary: string; // Actionable for owner
  safetyTip: string | null; // e.g., "Turn off main water valve"
  confidence: number; // 0-100
}

// =====================================================
// PROMPT 3: CONVERSATION ANALYZER
// Post-conversation analysis (async)
// =====================================================

/**
 * Input for the Conversation Analyzer (Prompt 3)
 */
export interface ConversationAnalyzerInput {
  fullConversation: LeadsCaptainMessage[];
  extractedInfo: ExtractedInfo;
  outcome: ConversationOutcome;
  duration: number; // minutes
  messageCount: number;
}

/**
 * Output from the Conversation Analyzer (Prompt 3)
 */
export interface ConversationAnalyzerOutput {
  summary: string; // 2-3 sentences
  customerSentiment: CustomerSentiment;
  leadQuality: LeadQuality;
  serviceCategory: string;
  estimatedJobValue: EstimatedJobValue;
  followUpRecommendation: string;
  aiPerformanceNotes: string[];
}

// =====================================================
// PROMPT 4: NOTE EXTRACTOR
// Extract actionable notes from conversation
// =====================================================

/**
 * Input for the Note Extractor (Prompt 4)
 */
export interface NoteExtractorInput {
  conversationHistory: SimpleMessage[];
  existingNotes: string[];
}

/**
 * Single extracted note
 */
export interface ExtractedNote {
  type: NoteType;
  content: string;
  confidence: number; // 0-1
}

/**
 * Key details extracted from conversation
 */
export interface KeyDetails {
  specificIssue: string | null;
  previousWork: string | null;
  constraints: string | null; // "must be after 5pm", "has dogs"
}

/**
 * Output from the Note Extractor (Prompt 4)
 */
export interface NoteExtractorOutput {
  notes: ExtractedNote[];
  keyDetails: KeyDetails;
}

// =====================================================
// PROMPT 6: RULE MATCHER (Non-LLM)
// Pure TypeScript rule matching
// =====================================================

/**
 * Input for the Rule Matcher (Prompt 6)
 */
export interface RuleMatcherInput {
  message: string;
  conversationContext: {
    isFirstMessage: boolean;
    messageCount: number;
    customerName: string | null;
    currentIntent: string | null;
    sentiment: SentimentType | null;
    isBusinessHours: boolean;
    isQuietHours: boolean;
  };
  rules: LeadsCaptainRule[];
  intents: Array<{
    code: string;
    enabled: boolean;
  }>;
}

/**
 * Output from the Rule Matcher (Prompt 6)
 */
export interface RuleMatcherOutput {
  matchedRule: LeadsCaptainRule | null;
  matchReason: string;
  detectedIntent: string;
  intentConfidence: number;
  emergencyKeywords: string[];
  allRulesEvaluated: Array<{
    ruleId: string;
    ruleName: string;
    matched: boolean;
    reason: string;
  }>;
}

// =====================================================
// ORCHESTRATOR TYPES
// =====================================================

/**
 * Result of prompt execution
 */
export interface PromptResult<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  model?: string;
  tokensUsed: number;
  latencyMs: number;
}

/**
 * Options for prompt execution
 */
export interface PromptExecutionOptions {
  maxRetries?: number;
  timeoutMs?: number;
  fallbackModel?: string;
}

/**
 * Context built for the conversation agent
 */
export interface OrchestratorContext {
  conversation: LeadsCaptainConversation;
  recentMessages: SimpleMessage[];
  businessContext: BusinessContext;
  extractedInfo: ExtractedInfo;
  matchedRule: LeadsCaptainRule | null;
  ruleMatchResult: RuleMatcherOutput;
  isEmergency: boolean;
  conversationState: ConversationState;
}

/**
 * Full orchestration result
 */
export interface OrchestrationResult {
  // Response to send
  responseText: string | null;
  shouldSend: boolean;
  requiresApproval: boolean;

  // Prompt results
  ruleMatchResult: RuleMatcherOutput;
  conversationAgentResult: PromptResult<ConversationAgentOutput> | null;
  emergencyClassifierResult: PromptResult<EmergencyClassifierOutput> | null;

  // Actions to take
  isEmergency: boolean;
  emergencyDetails: EmergencyClassifierOutput | null;
  shouldEscalate: boolean;
  shouldNotify: boolean;
  notificationReason: string | null;

  // Handoff summary (Phase 2 - Prompt 7)
  handoffSummary: HandoffSummarizerOutput | null;

  // State updates
  newConversationState: ConversationState;
  extractedInfo: Partial<ExtractedInfo>;
  conversationUpdates: Partial<LeadsCaptainConversation>;

  // Audit
  explanation: string;
  processingTimeMs: number;
}

// =====================================================
// DATABASE TYPES (for migration tables)
// =====================================================

/**
 * Conversation analysis record (Prompt 3 results)
 */
export interface LeadsCaptainConversationAnalysis {
  id: string;
  conversation_id: string;
  config_id: string;

  summary: string;
  customer_sentiment: CustomerSentiment | null;
  lead_quality: LeadQuality | null;
  service_category: string | null;
  estimated_job_value: EstimatedJobValue | null;
  follow_up_recommendation: string | null;
  ai_performance_notes: string[];

  analyzed_at: string;
  model_used: string | null;
  tokens_used: number | null;
}

/**
 * Extracted note record (Prompt 4 results)
 */
export interface LeadsCaptainExtractedNote {
  id: string;
  conversation_id: string;

  note_type: NoteType;
  content: string;
  confidence: number | null;

  created_at: string;
}

// =====================================================
// PROMPT TEMPLATE TYPES
// =====================================================

/**
 * System prompt configuration for each prompt type
 */
export interface PromptSystemConfig {
  promptId: 1 | 2 | 3 | 4;
  name: string;
  model: 'claude-3-5-sonnet-20241022' | 'gpt-4o-mini' | 'gpt-4o';
  maxTokens: number;
  temperature: number;
  systemPromptTemplate: string;
}

/**
 * AI model configuration
 */
export interface AIModelConfig {
  primary: string;
  fallback: string;
  maxRetries: number;
  timeoutMs: number;
}

// =====================================================
// ASYNC PROCESSING TYPES
// =====================================================

/**
 * Job for async conversation analysis
 */
export interface ConversationAnalysisJob {
  conversationId: string;
  configId: string;
  closedAt: string;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Result of async processing batch
 */
export interface AsyncProcessingBatchResult {
  processed: number;
  failed: number;
  skipped: number;
  errors: Array<{
    conversationId: string;
    error: string;
  }>;
}

// =====================================================
// PROMPT 5: AI INSIGHTS GENERATOR (Phase 2)
// Generates business insights from conversation data
// =====================================================

/**
 * Summary of a conversation for insights analysis
 */
export interface ConversationSummary {
  date: string;
  summary: string;
  sentiment: CustomerSentiment;
  leadQuality: LeadQuality;
  serviceCategory: string | null;
  outcome: 'converted' | 'lost' | 'pending' | 'completed';
  keyTopics: string[];
}

/**
 * Input for the AI Insights Generator (Prompt 5)
 */
export interface AIInsightsInput {
  conversationSummaries: ConversationSummary[];
  periodDays: number;
  businessType: string;
  previousInsights?: BusinessInsight[];
}

/**
 * Single business insight
 */
export interface BusinessInsight {
  category: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dataPoints: string[];
  suggestedAction?: string;
}

/**
 * Key metrics from insights analysis
 */
export interface InsightsKeyMetrics {
  avgLeadQuality: LeadQuality;
  avgSentiment: 'positive' | 'neutral' | 'negative';
  topServices: string[];
  topConcerns: string[];
  conversionIndicators: 'improving' | 'stable' | 'declining';
}

/**
 * Output from the AI Insights Generator (Prompt 5)
 */
export interface AIInsightsOutput {
  insights: BusinessInsight[];
  keyMetrics: InsightsKeyMetrics;
  executiveSummary: string;
  generatedAt: string;
  periodDays: number;
  conversationsAnalyzed: number;
}

// =====================================================
// PROMPT 7: HUMAN HANDOFF SUMMARIZER (Phase 2)
// Generates summary when conversation handed to human
// =====================================================

/**
 * Input for the Handoff Summarizer (Prompt 7)
 */
export interface HandoffSummarizerInput {
  conversationHistory: SimpleMessage[];
  handoffTrigger: string; // Why handoff was requested
  customerName?: string;
  detectedIntent?: string;
  isEmergency: boolean;
}

/**
 * Output from the Handoff Summarizer (Prompt 7)
 */
export interface HandoffSummarizerOutput {
  quickSummary: string;
  customerMood: 'calm' | 'concerned' | 'frustrated' | 'angry' | 'urgent';
  handoffReason: string;
  customerWants: string[];
  alreadyDiscussed: string[];
  notYetDiscussed: string[];
  suggestedOpening: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  warningFlags: string[];
}

// =====================================================
// PROMPT 9: SANDBOX TEST AGENT (Phase 2)
// Simulates customer conversations for testing
// =====================================================

/**
 * Test scenario configuration
 */
export interface SandboxTestScenario {
  businessType: string;
  serviceType: string;
  customerPersona: 'friendly' | 'difficult' | 'price_sensitive' | 'urgent' | 'technical' | 'elderly' | 'busy';
  additionalContext?: string;
}

/**
 * Input for the Sandbox Test Agent (Prompt 9)
 */
export interface SandboxTestInput {
  scenario: SandboxTestScenario;
  maxTurns?: number;
  testGoal?: string;
}

/**
 * Single message in sandbox test conversation
 */
export interface SandboxTestMessage {
  role: 'customer' | 'business';
  content: string;
  timestamp: string;
}

/**
 * Analysis of sandbox test results
 */
export interface SandboxTestAnalysis {
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  goalAchieved: boolean;
  responseQuality: 'excellent' | 'good' | 'fair' | 'poor';
  informationGathering: 'excellent' | 'good' | 'fair' | 'poor';
  toneAppropriate: boolean;
}

/**
 * Output from the Sandbox Test Agent (Prompt 9)
 */
export interface SandboxTestOutput {
  conversation: SandboxTestMessage[];
  analysis: SandboxTestAnalysis;
  scenarioCompleted: boolean;
  turnsUsed: number;
  totalTokensUsed: number;
}

// =====================================================
// DATABASE TYPES FOR PHASE 2
// =====================================================

/**
 * Business insights record (Prompt 5 results)
 */
export interface LeadsCaptainInsightsRecord {
  id: string;
  config_id: string;
  period_start: string;
  period_end: string;
  insights: BusinessInsight[];
  key_metrics: InsightsKeyMetrics;
  executive_summary: string;
  conversations_analyzed: number;
  generated_at: string;
  model_used: string | null;
  tokens_used: number | null;
}

/**
 * Handoff summary record (Prompt 7 results)
 */
export interface LeadsCaptainHandoffRecord {
  id: string;
  conversation_id: string;
  quick_summary: string;
  customer_mood: string;
  handoff_reason: string;
  customer_wants: string[];
  already_discussed: string[];
  not_yet_discussed: string[];
  suggested_opening: string;
  urgency_level: string;
  warning_flags: string[];
  created_at: string;
}

/**
 * Sandbox test result record (Prompt 9 results)
 */
export interface LeadsCaptainSandboxTestRecord {
  id: string;
  config_id: string;
  scenario: SandboxTestScenario;
  conversation: SandboxTestMessage[];
  analysis: SandboxTestAnalysis;
  scenario_completed: boolean;
  turns_used: number;
  tokens_used: number;
  created_at: string;
}

// =====================================================
// PROMPT 8: PHOTO ANALYZER (Phase 3)
// Analyzes customer-submitted photos of equipment/issues
// =====================================================

/**
 * Photo analysis category
 */
export type PhotoCategory =
  | 'equipment'
  | 'damage'
  | 'installation'
  | 'before_after'
  | 'issue'
  | 'general';

/**
 * Urgency level from photo analysis
 */
export type PhotoUrgency = 'critical' | 'high' | 'medium' | 'low' | 'none';

/**
 * Input for the Photo Analyzer (Prompt 8)
 */
export interface PhotoAnalyzerInput {
  imageUrl: string;
  imageBase64?: string; // Alternative to URL
  businessType: string;
  contextMessage?: string; // Customer's message with the photo
  previousPhotos?: PhotoAnalysisResult[]; // For comparison (before/after)
}

/**
 * Detected issue in photo
 */
export interface DetectedIssue {
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string; // Where in the image
  confidence: number; // 0-100
}

/**
 * Equipment identification from photo
 */
export interface EquipmentIdentification {
  type: string; // e.g., "HVAC Unit", "Water Heater"
  brand?: string;
  model?: string;
  approximateAge?: string; // e.g., "5-10 years"
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  confidence: number;
}

/**
 * Output from the Photo Analyzer (Prompt 8)
 */
export interface PhotoAnalyzerOutput {
  category: PhotoCategory;
  summary: string; // 2-3 sentence description
  detectedIssues: DetectedIssue[];
  equipment: EquipmentIdentification | null;
  urgency: PhotoUrgency;
  safetyWarnings: string[];
  recommendedActions: string[];
  estimatedServiceType: string | null; // e.g., "repair", "replacement", "maintenance"
  additionalNotes: string;
  confidence: number; // Overall confidence 0-100
}

/**
 * Photo analysis result for storage
 */
export interface PhotoAnalysisResult {
  id: string;
  conversationId?: string;
  imageUrl: string;
  analysis: PhotoAnalyzerOutput;
  analyzedAt: string;
  modelUsed: string;
  tokensUsed: number;
}

/**
 * Database record for photo analysis (Prompt 8 results)
 */
export interface LeadsCaptainPhotoAnalysisRecord {
  id: string;
  conversation_id: string | null;
  config_id: string;
  image_url: string;
  category: PhotoCategory;
  summary: string;
  detected_issues: DetectedIssue[];
  equipment: EquipmentIdentification | null;
  urgency: PhotoUrgency;
  safety_warnings: string[];
  recommended_actions: string[];
  estimated_service_type: string | null;
  confidence: number;
  analyzed_at: string;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}
