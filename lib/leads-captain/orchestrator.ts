// =====================================================
// Trades Captain AI - Orchestrator
// Routes messages through appropriate prompts
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  LeadsCaptainConfig,
  LeadsCaptainConversation,
  LeadsCaptainRule,
  LeadsCaptainMessage,
} from '@/types/leads-captain';
import {
  OrchestrationResult,
  ConversationAgentInput,
  ConversationAgentOutput,
  EmergencyClassifierOutput,
  ExtractedInfo,
  ConversationState,
  SimpleMessage,
  BusinessContext,
} from '@/types/leads-captain/prompt-types';
import {
  executeRuleMatcher,
  executeConversationAgent,
  executeEmergencyClassifier,
  quickEmergencyCheck,
  detectSentiment,
  extractEmergencyKeywords,
  summarizeForHandoff,
} from './prompts';
import { HandoffSummarizerOutput } from '@/types/leads-captain/prompt-types';
import { buildContext, BuildContextOptions } from './context-builder';

// =====================================================
// ORCHESTRATION OPTIONS
// =====================================================

export interface OrchestrationOptions {
  config: LeadsCaptainConfig;
  conversation: LeadsCaptainConversation;
  rules: LeadsCaptainRule[];
  recentMessages: LeadsCaptainMessage[];
  currentMessage: string;
  isFirstMessage: boolean;
  isBusinessHours: boolean;
  isQuietHours: boolean;
}

// =====================================================
// MAIN ORCHESTRATION FUNCTION
// =====================================================

/**
 * Orchestrate the processing of an inbound message
 *
 * Flow:
 * 1. Rule Matcher (non-LLM) - Match rules to message
 * 2. Context Builder - Build optimized context
 * 3. Conversation Agent - Generate response
 * 4. Emergency Classifier - If emergency flagged
 * 5. Return orchestration result
 */
export async function orchestrateMessage(
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  const startTime = Date.now();

  const {
    config,
    conversation,
    rules,
    recentMessages,
    currentMessage,
    isFirstMessage,
    isBusinessHours,
    isQuietHours,
  } = options;

  // =====================================================
  // STEP 1: Rule Matching (Non-LLM)
  // =====================================================

  const ruleMatchResult = executeRuleMatcher({
    message: currentMessage,
    conversationContext: {
      isFirstMessage,
      messageCount: conversation.message_count,
      customerName: conversation.customer_name,
      currentIntent: conversation.current_intent,
      sentiment: conversation.sentiment,
      isBusinessHours,
      isQuietHours,
    },
    rules,
    intents: [], // Would load from config
  });

  jobLogger.debug({
    msg: 'Rule matching completed',
    matchedRule: ruleMatchResult.matchedRule?.name || null,
    detectedIntent: ruleMatchResult.detectedIntent,
    emergencyKeywords: ruleMatchResult.emergencyKeywords,
  });

  // =====================================================
  // STEP 2: Build Context
  // =====================================================

  const contextOptions: BuildContextOptions = {
    config,
    conversation,
    recentMessages,
    currentMessage,
    isFirstMessage,
    isBusinessHours,
    isQuietHours,
    matchedRule: ruleMatchResult.matchedRule,
    detectedIntent: ruleMatchResult.detectedIntent,
    emergencyKeywords: ruleMatchResult.emergencyKeywords,
  };

  const context = buildContext(contextOptions);

  // =====================================================
  // STEP 3: Check for template-only response from rule
  // =====================================================

  // If rule matched and has a specific template/action, handle it
  if (ruleMatchResult.matchedRule) {
    const rule = ruleMatchResult.matchedRule;

    // Check if rule says "do not respond"
    if (rule.actions?.do_not_respond) {
      return createNoResponseResult(
        ruleMatchResult,
        context,
        `Rule "${rule.name}" specifies no response`,
        startTime
      );
    }

    // Check if rule escalates to human immediately
    if (rule.actions?.escalate_to_human) {
      return createEscalationResult(
        ruleMatchResult,
        context,
        `Rule "${rule.name}" escalates to human`,
        startTime
      );
    }
  }

  // =====================================================
  // STEP 4: Execute Conversation Agent
  // =====================================================

  // Prepare input for conversation agent
  const conversationAgentInput: ConversationAgentInput = {
    message: currentMessage,
    conversationHistory: context.recentMessages,
    businessContext: context.businessContext,
    extractedInfo: context.extractedInfo,
    matchedRule: ruleMatchResult.matchedRule,
    isEmergency: ruleMatchResult.emergencyKeywords.length > 0,
    conversationState: context.conversationState,
  };

  const conversationAgentResult = await executeConversationAgent(conversationAgentInput);

  // Handle conversation agent failure
  if (!conversationAgentResult.success || !conversationAgentResult.data) {
    return createErrorResult(
      ruleMatchResult,
      context,
      conversationAgentResult.error || 'Conversation agent failed',
      startTime
    );
  }

  const agentOutput = conversationAgentResult.data;

  // =====================================================
  // STEP 5: Emergency Classification (if flagged)
  // =====================================================

  let emergencyResult: EmergencyClassifierOutput | null = null;
  let isConfirmedEmergency = false;

  // Check if emergency was flagged by agent or detected in message
  const needsEmergencyCheck =
    agentOutput.flags.emergencyDetected ||
    ruleMatchResult.emergencyKeywords.length > 0;

  if (needsEmergencyCheck) {
    const emergencyClassifierResult = await executeEmergencyClassifier({
      message: currentMessage,
      conversationHistory: context.recentMessages.slice(-5),
      detectedKeywords: [
        ...ruleMatchResult.emergencyKeywords,
        ...agentOutput.flags.emergencyKeywords,
      ],
      businessType: config.business_type || 'general',
      currentSeason: getCurrentSeason(),
    });

    if (emergencyClassifierResult.success && emergencyClassifierResult.data) {
      emergencyResult = emergencyClassifierResult.data;
      isConfirmedEmergency = emergencyResult.isEmergency;

      jobLogger.info({
        msg: 'Emergency classification completed',
        isEmergency: isConfirmedEmergency,
        severity: emergencyResult.severity,
        category: emergencyResult.category,
      });
    }
  }

  // =====================================================
  // STEP 6: Generate Handoff Summary (if needed)
  // =====================================================

  let handoffSummary: HandoffSummarizerOutput | null = null;

  if (agentOutput.flags.handoffRequested) {
    try {
      handoffSummary = await summarizeForHandoff(
        context.recentMessages,
        {
          handoffTrigger: agentOutput.flags.handoffReason || 'Customer requested human assistance',
          customerName: conversation.customer_name || undefined,
          detectedIntent: ruleMatchResult.detectedIntent,
          isEmergency: isConfirmedEmergency,
        }
      );

      jobLogger.info({
        msg: 'Handoff summary generated',
        urgencyLevel: handoffSummary.urgencyLevel,
        customerMood: handoffSummary.customerMood,
      });
    } catch (error) {
      jobLogger.warn({
        msg: 'Failed to generate handoff summary',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // =====================================================
  // STEP 7: Build Final Result
  // =====================================================

  // Determine if we should notify
  const shouldNotify = isConfirmedEmergency ||
    agentOutput.flags.handoffRequested ||
    isFirstMessage;

  const notificationReason = isConfirmedEmergency
    ? `Emergency: ${emergencyResult?.category}`
    : agentOutput.flags.handoffRequested
      ? `Handoff requested: ${agentOutput.flags.handoffReason}`
      : isFirstMessage
        ? 'New conversation'
        : null;

  // Merge extracted info
  const mergedExtractedInfo: Partial<ExtractedInfo> = {
    ...context.extractedInfo,
    ...agentOutput.extracted,
  };

  // Determine conversation updates
  const conversationUpdates: Partial<LeadsCaptainConversation> = {
    current_intent: ruleMatchResult.detectedIntent,
    sentiment: detectSentiment(currentMessage),
    customer_name: mergedExtractedInfo.customerName || conversation.customer_name,
    last_customer_message_at: new Date().toISOString(),
    message_count: conversation.message_count + 1,
  };

  // Update emergency flag
  if (isConfirmedEmergency) {
    conversationUpdates.is_emergency = true;
  }

  // Update handoff flag
  if (agentOutput.flags.handoffRequested) {
    conversationUpdates.requires_human = true;
    conversationUpdates.status = 'human_takeover';
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    // Response
    responseText: agentOutput.replyText,
    shouldSend: true,
    requiresApproval: shouldRequireApproval(config, conversationAgentResult, isFirstMessage),

    // Prompt results
    ruleMatchResult,
    conversationAgentResult,
    emergencyClassifierResult: emergencyResult
      ? {
          success: true,
          data: emergencyResult,
          error: null,
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 0,
          latencyMs: 0,
        }
      : null,

    // Actions
    isEmergency: isConfirmedEmergency,
    emergencyDetails: emergencyResult,
    shouldEscalate: agentOutput.flags.handoffRequested,
    shouldNotify,
    notificationReason,

    // Handoff summary
    handoffSummary,

    // State updates
    newConversationState: agentOutput.state,
    extractedInfo: mergedExtractedInfo,
    conversationUpdates,

    // Audit
    explanation: buildExplanation(ruleMatchResult, agentOutput, emergencyResult),
    processingTimeMs,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Create a result for when no response should be sent
 */
function createNoResponseResult(
  ruleMatchResult: ReturnType<typeof executeRuleMatcher>,
  context: ReturnType<typeof buildContext>,
  explanation: string,
  startTime: number
): OrchestrationResult {
  return {
    responseText: null,
    shouldSend: false,
    requiresApproval: false,
    ruleMatchResult,
    conversationAgentResult: null,
    emergencyClassifierResult: null,
    isEmergency: false,
    emergencyDetails: null,
    shouldEscalate: false,
    shouldNotify: false,
    notificationReason: null,
    handoffSummary: null,
    newConversationState: context.conversationState,
    extractedInfo: {},
    conversationUpdates: {},
    explanation,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Create a result for immediate escalation
 */
function createEscalationResult(
  ruleMatchResult: ReturnType<typeof executeRuleMatcher>,
  context: ReturnType<typeof buildContext>,
  explanation: string,
  startTime: number
): OrchestrationResult {
  return {
    responseText: null,
    shouldSend: false,
    requiresApproval: false,
    ruleMatchResult,
    conversationAgentResult: null,
    emergencyClassifierResult: null,
    isEmergency: false,
    emergencyDetails: null,
    shouldEscalate: true,
    shouldNotify: true,
    notificationReason: 'Rule triggered escalation',
    handoffSummary: null,
    newConversationState: 'handoff_requested',
    extractedInfo: {},
    conversationUpdates: {
      requires_human: true,
      status: 'human_takeover',
    },
    explanation,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Create a result for errors
 */
function createErrorResult(
  ruleMatchResult: ReturnType<typeof executeRuleMatcher>,
  context: ReturnType<typeof buildContext>,
  error: string,
  startTime: number
): OrchestrationResult {
  jobLogger.error({
    msg: 'Orchestration error',
    error,
  });

  return {
    responseText: null,
    shouldSend: false,
    requiresApproval: false,
    ruleMatchResult,
    conversationAgentResult: null,
    emergencyClassifierResult: null,
    isEmergency: false,
    emergencyDetails: null,
    shouldEscalate: false,
    shouldNotify: false,
    notificationReason: null,
    handoffSummary: null,
    newConversationState: context.conversationState,
    extractedInfo: {},
    conversationUpdates: {},
    explanation: `Error: ${error}`,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Build explanation string for audit
 */
function buildExplanation(
  ruleMatchResult: ReturnType<typeof executeRuleMatcher>,
  agentOutput: ConversationAgentOutput,
  emergencyResult: EmergencyClassifierOutput | null
): string {
  const parts: string[] = [];

  // Rule match
  if (ruleMatchResult.matchedRule) {
    parts.push(`Rule matched: "${ruleMatchResult.matchedRule.name}"`);
  } else {
    parts.push('No rule matched');
  }

  // Intent
  parts.push(`Intent: ${ruleMatchResult.detectedIntent} (${ruleMatchResult.intentConfidence}%)`);

  // State transition
  parts.push(`State: ${agentOutput.state}`);

  // Emergency
  if (emergencyResult) {
    parts.push(`Emergency: ${emergencyResult.isEmergency ? 'YES' : 'NO'} (${emergencyResult.severity})`);
  }

  // Handoff
  if (agentOutput.flags.handoffRequested) {
    parts.push(`Handoff: ${agentOutput.flags.handoffReason}`);
  }

  return parts.join(' | ');
}

/**
 * Determine if response requires approval
 */
function shouldRequireApproval(
  config: LeadsCaptainConfig,
  agentResult: { data: ConversationAgentOutput | null },
  isFirstMessage: boolean
): boolean {
  switch (config.require_approval) {
    case 'all':
      return true;
    case 'first_message':
      return isFirstMessage;
    case 'low_confidence':
      // Would check confidence from result
      return false;
    case 'never':
    default:
      return false;
  }
}

/**
 * Get current season
 */
function getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}
