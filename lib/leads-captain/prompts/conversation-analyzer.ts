// =====================================================
// Trades Captain AI - Prompt 3: Conversation Analyzer
// Post-conversation analysis (async processing)
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  ConversationAnalyzerInput,
  ConversationAnalyzerOutput,
  PromptResult,
  CustomerSentiment,
  LeadQuality,
  EstimatedJobValue,
} from '@/types/leads-captain/prompt-types';
import { LeadsCaptainMessage } from '@/types/leads-captain';
import {
  callClaude,
  callOpenAI,
  withRetry,
  withTimeout,
  parseJSONResponse,
  successResult,
  errorResult,
  MODEL_CONFIGS,
  logPromptExecution,
} from './base-prompt';

// =====================================================
// SYSTEM PROMPT TEMPLATE
// =====================================================

function buildConversationAnalyzerSystemPrompt(): string {
  return `You are an expert conversation analyzer for a home services business. Your job is to analyze completed SMS conversations and extract insights.

ANALYSIS OBJECTIVES:
1. Summarize what happened in the conversation (2-3 sentences)
2. Assess customer sentiment throughout the conversation
3. Rate the lead quality based on engagement and intent
4. Identify the service category they need
5. Estimate the potential job value
6. Recommend follow-up actions
7. Note any issues with how the AI handled the conversation

SENTIMENT CLASSIFICATION:
- positive: Customer seemed happy, engaged, appreciative
- neutral: Customer was matter-of-fact, neither pleased nor displeased
- frustrated: Customer showed signs of frustration (delays, repetition, confusion)
- angry: Customer expressed anger, dissatisfaction, or threats

LEAD QUALITY:
- hot: Ready to book, clear need, responsive, provided contact info
- warm: Interested but shopping around, or needs more info before deciding
- cold: Just inquiring, no urgency, price shopping only, or abandoned conversation

ESTIMATED JOB VALUE (based on typical trades work):
- high: Major installations, replacements, multi-day jobs ($2000+)
- medium: Standard repairs, maintenance, half-day jobs ($500-2000)
- low: Minor repairs, diagnostics, quick fixes (under $500)
- unknown: Not enough information to estimate

AI PERFORMANCE NOTES:
- Note any awkward or incorrect responses from the AI
- Identify missed opportunities to capture information
- Flag responses that may have confused or frustrated the customer
- Suggest improvements for future similar conversations

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence summary of what happened",
  "customerSentiment": "positive" | "neutral" | "frustrated" | "angry",
  "leadQuality": "hot" | "warm" | "cold",
  "serviceCategory": "what service they need",
  "estimatedJobValue": "high" | "medium" | "low" | "unknown",
  "followUpRecommendation": "specific action to take",
  "aiPerformanceNotes": ["array of observations about AI handling"]
}`;
}

// =====================================================
// PROMPT EXECUTION
// =====================================================

/**
 * Execute the Conversation Analyzer prompt
 * Called asynchronously after a conversation ends
 */
export async function executeConversationAnalyzer(
  input: ConversationAnalyzerInput
): Promise<PromptResult<ConversationAnalyzerOutput>> {
  const startTime = Date.now();
  const config = MODEL_CONFIGS.conversation_analyzer;
  let usedModel = config.primary;

  try {
    // Format conversation for analysis
    const conversationText = formatConversationForAnalysis(input.fullConversation);

    const userMessage = `Analyze this completed conversation:

CONVERSATION:
${conversationText}

METADATA:
- Outcome: ${input.outcome}
- Duration: ${input.duration} minutes
- Total messages: ${input.messageCount}
- Information captured: ${formatExtractedInfo(input.extractedInfo)}

Provide your analysis.`;

    const systemPrompt = buildConversationAnalyzerSystemPrompt();

    // Async processing can use longer timeout
    let response: { content: string; tokensUsed: number } | null = null;

    try {
      response = await withTimeout(
        withRetry(
          () => callClaude({
            model: config.primary,
            maxTokens: 800,
            temperature: 0.3,
            systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
          { maxRetries: config.maxRetries }
        ),
        config.timeoutMs,
        'Claude conversation analyzer timed out'
      );
    } catch (primaryError) {
      jobLogger.warn({
        msg: 'Primary model failed for conversation analyzer, falling back',
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // Fallback to OpenAI
      usedModel = config.fallback;
      response = await withTimeout(
        callOpenAI({
          model: config.fallback,
          maxTokens: 800,
          temperature: 0.3,
          systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        config.timeoutMs,
        'OpenAI conversation analyzer timed out'
      );
    }

    // Parse the JSON response
    const parsed = parseJSONResponse<ConversationAnalyzerOutput>(response.content);

    if (!parsed) {
      // Create minimal analysis on parse failure
      const fallbackOutput = createMinimalAnalysis(input);
      const latencyMs = Date.now() - startTime;

      logPromptExecution('conversation_analyzer', input, fallbackOutput, latencyMs, true);
      return successResult(fallbackOutput, usedModel, response.tokensUsed, latencyMs);
    }

    // Validate the response
    const validatedOutput = validateAnalyzerOutput(parsed, input);
    const latencyMs = Date.now() - startTime;

    logPromptExecution('conversation_analyzer', input, validatedOutput, latencyMs, true);
    return successResult(validatedOutput, usedModel, response.tokensUsed, latencyMs);

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    jobLogger.error({
      msg: 'Conversation analyzer failed',
      error: errorMessage,
      latencyMs,
    });

    logPromptExecution('conversation_analyzer', input, null, latencyMs, false);
    return errorResult(errorMessage, usedModel, latencyMs);
  }
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Format conversation messages for analysis
 */
function formatConversationForAnalysis(messages: LeadsCaptainMessage[]): string {
  return messages.map((msg, index) => {
    const speaker = msg.direction === 'inbound' ? 'CUSTOMER' : 'BUSINESS';
    const timestamp = new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const aiIndicator = msg.direction === 'outbound' && msg.ai_used ? ' [AI]' : '';

    return `[${index + 1}] ${timestamp} ${speaker}${aiIndicator}: ${msg.content}`;
  }).join('\n');
}

/**
 * Format extracted info for context
 */
function formatExtractedInfo(info: ConversationAnalyzerInput['extractedInfo']): string {
  const parts: string[] = [];

  if (info.serviceNeeded) parts.push(`Service: ${info.serviceNeeded}`);
  if (info.address) parts.push(`Address: ${info.address}`);
  if (info.urgency) parts.push(`Urgency: ${info.urgency}`);
  if (info.preferredTime) parts.push(`Preferred time: ${info.preferredTime}`);
  if (info.customerName) parts.push(`Name: ${info.customerName}`);

  return parts.length > 0 ? parts.join(', ') : 'No information captured';
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate analyzer output
 */
function validateAnalyzerOutput(
  output: ConversationAnalyzerOutput,
  input: ConversationAnalyzerInput
): ConversationAnalyzerOutput {
  const validSentiments: CustomerSentiment[] = ['positive', 'neutral', 'frustrated', 'angry'];
  const validQualities: LeadQuality[] = ['hot', 'warm', 'cold'];
  const validValues: EstimatedJobValue[] = ['high', 'medium', 'low', 'unknown'];

  return {
    summary: typeof output.summary === 'string' && output.summary.length > 0
      ? output.summary
      : `Conversation with ${input.messageCount} messages, outcome: ${input.outcome}`,
    customerSentiment: validSentiments.includes(output.customerSentiment)
      ? output.customerSentiment
      : inferSentimentFromOutcome(input.outcome),
    leadQuality: validQualities.includes(output.leadQuality)
      ? output.leadQuality
      : inferLeadQuality(input),
    serviceCategory: typeof output.serviceCategory === 'string' && output.serviceCategory.length > 0
      ? output.serviceCategory
      : input.extractedInfo.serviceNeeded || 'Unknown service',
    estimatedJobValue: validValues.includes(output.estimatedJobValue)
      ? output.estimatedJobValue
      : 'unknown',
    followUpRecommendation: typeof output.followUpRecommendation === 'string'
      ? output.followUpRecommendation
      : getDefaultFollowUp(input.outcome),
    aiPerformanceNotes: Array.isArray(output.aiPerformanceNotes)
      ? output.aiPerformanceNotes.filter(n => typeof n === 'string')
      : [],
  };
}

/**
 * Create minimal analysis as fallback
 */
function createMinimalAnalysis(input: ConversationAnalyzerInput): ConversationAnalyzerOutput {
  return {
    summary: `Conversation ended with outcome: ${input.outcome}. Duration: ${input.duration} minutes, ${input.messageCount} messages exchanged.`,
    customerSentiment: inferSentimentFromOutcome(input.outcome),
    leadQuality: inferLeadQuality(input),
    serviceCategory: input.extractedInfo.serviceNeeded || 'Not specified',
    estimatedJobValue: 'unknown',
    followUpRecommendation: getDefaultFollowUp(input.outcome),
    aiPerformanceNotes: ['Analysis performed with minimal data due to parsing failure'],
  };
}

/**
 * Infer sentiment from conversation outcome
 */
function inferSentimentFromOutcome(outcome: ConversationAnalyzerInput['outcome']): CustomerSentiment {
  switch (outcome) {
    case 'lead_captured':
    case 'completed':
      return 'positive';
    case 'human_takeover':
      return 'neutral'; // Could be positive or negative
    case 'abandoned':
      return 'frustrated';
    default:
      return 'neutral';
  }
}

/**
 * Infer lead quality from input data
 */
function inferLeadQuality(input: ConversationAnalyzerInput): LeadQuality {
  const { extractedInfo, outcome, messageCount } = input;

  // If they provided address and service, that's a good sign
  const infoScore = [
    extractedInfo.serviceNeeded,
    extractedInfo.address,
    extractedInfo.urgency,
    extractedInfo.customerName,
  ].filter(Boolean).length;

  if (outcome === 'lead_captured' && infoScore >= 3) return 'hot';
  if (outcome === 'completed' && infoScore >= 2) return 'hot';
  if (outcome === 'human_takeover') return 'warm';
  if (messageCount >= 4 && infoScore >= 1) return 'warm';
  if (outcome === 'abandoned') return 'cold';

  return 'warm';
}

/**
 * Get default follow-up recommendation based on outcome
 */
function getDefaultFollowUp(outcome: ConversationAnalyzerInput['outcome']): string {
  switch (outcome) {
    case 'lead_captured':
      return 'Schedule the job and send confirmation';
    case 'completed':
      return 'Send follow-up to confirm satisfaction';
    case 'human_takeover':
      return 'Review conversation and complete manually';
    case 'abandoned':
      return 'Consider sending a follow-up message in 24 hours';
    default:
      return 'Review conversation and determine next steps';
  }
}

// =====================================================
// BATCH PROCESSING HELPER
// =====================================================

/**
 * Process multiple conversations in a batch
 * Useful for the cron job
 */
export async function analyzeConversationBatch(
  conversations: Array<{
    conversationId: string;
    input: ConversationAnalyzerInput;
  }>,
  options: { concurrency?: number } = {}
): Promise<Map<string, PromptResult<ConversationAnalyzerOutput>>> {
  const results = new Map<string, PromptResult<ConversationAnalyzerOutput>>();
  const concurrency = options.concurrency || 3;

  // Process in batches
  for (let i = 0; i < conversations.length; i += concurrency) {
    const batch = conversations.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async ({ conversationId, input }) => {
        try {
          const result = await executeConversationAnalyzer(input);
          return { conversationId, result };
        } catch (error) {
          return {
            conversationId,
            result: errorResult<ConversationAnalyzerOutput>(
              error instanceof Error ? error.message : 'Unknown error',
              'unknown',
              0
            ),
          };
        }
      })
    );

    for (const { conversationId, result } of batchResults) {
      results.set(conversationId, result);
    }
  }

  return results;
}
