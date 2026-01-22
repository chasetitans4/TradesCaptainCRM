// =====================================================
// Trades Captain AI - Prompt 1: Conversation Agent
// Handle live SMS conversations in real-time
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  ConversationAgentInput,
  ConversationAgentOutput,
  PromptResult,
  ConversationState,
  ExtractedInfo,
} from '@/types/leads-captain/prompt-types';
import {
  callClaude,
  callOpenAI,
  withRetry,
  withTimeout,
  parseJSONResponse,
  successResult,
  errorResult,
  truncateText,
  MODEL_CONFIGS,
  logPromptExecution,
} from './base-prompt';

// =====================================================
// SYSTEM PROMPT TEMPLATE
// =====================================================

function buildConversationAgentSystemPrompt(input: ConversationAgentInput): string {
  const { businessContext, extractedInfo, matchedRule, isEmergency, conversationState } = input;

  // Build info capture status
  const captureStatus = [
    `- Service needed: ${extractedInfo.serviceNeeded ? `CAPTURED (${extractedInfo.serviceNeeded})` : 'NEEDED'}`,
    `- Address: ${extractedInfo.address ? `CAPTURED (${extractedInfo.address})` : 'NEEDED'}`,
    `- Urgency: ${extractedInfo.urgency ? `CAPTURED (${extractedInfo.urgency})` : 'NEEDED'}`,
    `- Preferred time: ${extractedInfo.preferredTime ? `CAPTURED` : 'OPTIONAL'}`,
    `- Customer name: ${extractedInfo.customerName ? `CAPTURED (${extractedInfo.customerName})` : 'OPTIONAL'}`,
  ].join('\n');

  // Build rule instruction if matched
  const ruleInstruction = matchedRule
    ? `\nMATCHED RULE: "${matchedRule.name}"\nFollow this rule's intent when crafting your response.`
    : '';

  // Emergency handling
  const emergencyInstruction = isEmergency
    ? `\n\nEMERGENCY DETECTED: Be empathetic, provide safety tips if appropriate, and assure them help is on the way.`
    : '';

  return `You are the AI assistant for ${businessContext.name}, a ${businessContext.type} company.
${businessContext.serviceArea ? `Service area: ${businessContext.serviceArea}` : ''}

CURRENT STATE: ${conversationState}
BUSINESS STATUS: ${businessContext.isOpen ? `OPEN (${businessContext.hoursToday})` : 'CLOSED'}

OBJECTIVES (in order of priority):
1. Be helpful, friendly, and professional (tone: ${businessContext.tone})
2. Gather customer info NATURALLY through conversation - don't interrogate
3. Detect emergencies and flag them appropriately
4. Detect requests to speak to a human and flag for handoff
5. Move conversation toward scheduling/resolution

INFORMATION CAPTURE STATUS:
${captureStatus}

CAPTURE PRIORITY:
1. Service needed (REQUIRED) - What do they need help with?
2. Address (REQUIRED for service) - Where is the job?
3. Urgency (REQUIRED) - How soon do they need help?
4. Preferred time (NICE TO HAVE) - When works best?
5. Customer name (NICE TO HAVE) - Only if flows naturally
${ruleInstruction}
${emergencyInstruction}

CONSTRAINTS:
- Response MUST be under 320 characters (SMS limit)
- Ask ONE question at a time
- NEVER diagnose problems or give technical advice
- NEVER quote exact prices (use "typically" or "starting at" with ranges)
- If customer asks for a human, acknowledge and flag handoff
- If uncertain, ask a clarifying question
${businessContext.bookingLink ? `- Booking link available: ${businessContext.bookingLink}` : ''}
${businessContext.emergencyPhone ? `- Emergency line: ${businessContext.emergencyPhone}` : ''}

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "replyText": "Your SMS response under 320 chars",
  "state": "next_conversation_state",
  "extracted": {
    "serviceNeeded": "extracted or null",
    "address": "extracted or null",
    "urgency": "extracted or null",
    "preferredTime": "extracted or null",
    "customerName": "extracted or null"
  },
  "flags": {
    "emergencyDetected": false,
    "emergencyKeywords": [],
    "handoffRequested": false,
    "handoffReason": null
  },
  "checklistCovered": ["list of topics covered"],
  "internalNotes": "any notes for the business owner"
}

Valid states: initial, greeting_sent, capturing_need, capturing_address, capturing_urgency, capturing_time, capturing_name, info_complete, awaiting_response, handoff_requested, emergency_detected, completed`;
}

// =====================================================
// PROMPT EXECUTION
// =====================================================

/**
 * Execute the Conversation Agent prompt
 * This is the main real-time prompt that handles every inbound message
 */
export async function executeConversationAgent(
  input: ConversationAgentInput
): Promise<PromptResult<ConversationAgentOutput>> {
  const startTime = Date.now();
  const config = MODEL_CONFIGS.conversation_agent;
  let usedModel = config.primary;

  try {
    // Build messages from conversation history
    const messages = input.conversationHistory.map(msg => ({
      role: msg.role === 'customer' ? 'user' : 'assistant' as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add current message
    messages.push({
      role: 'user' as const,
      content: input.message,
    });

    const systemPrompt = buildConversationAgentSystemPrompt(input);

    // Try primary model (Claude) with timeout
    let response: { content: string; tokensUsed: number } | null = null;

    try {
      response = await withTimeout(
        withRetry(
          () => callClaude({
            model: config.primary,
            maxTokens: 512,
            temperature: 0.3,
            systemPrompt,
            messages,
          }),
          { maxRetries: 1 } // Only 1 retry for real-time
        ),
        config.timeoutMs,
        'Claude conversation agent timed out'
      );
    } catch (primaryError) {
      jobLogger.warn({
        msg: 'Primary model failed, falling back',
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // Fallback to OpenAI
      usedModel = config.fallback;
      response = await withTimeout(
        callOpenAI({
          model: config.fallback,
          maxTokens: 512,
          temperature: 0.3,
          systemPrompt,
          messages,
        }),
        config.timeoutMs,
        'OpenAI conversation agent timed out'
      );
    }

    // Parse the JSON response
    const parsed = parseJSONResponse<ConversationAgentOutput>(response.content);

    if (!parsed) {
      // If parsing fails, create a safe fallback response
      const fallbackOutput = createFallbackResponse(input, response.content);
      const latencyMs = Date.now() - startTime;

      logPromptExecution('conversation_agent', input, fallbackOutput, latencyMs, true);
      return successResult(fallbackOutput, usedModel, response.tokensUsed, latencyMs);
    }

    // Validate and sanitize the response
    const validatedOutput = validateAndSanitize(parsed, input);
    const latencyMs = Date.now() - startTime;

    logPromptExecution('conversation_agent', input, validatedOutput, latencyMs, true);
    return successResult(validatedOutput, usedModel, response.tokensUsed, latencyMs);

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    jobLogger.error({
      msg: 'Conversation agent failed',
      error: errorMessage,
      latencyMs,
    });

    logPromptExecution('conversation_agent', input, null, latencyMs, false);
    return errorResult(errorMessage, usedModel, latencyMs);
  }
}

// =====================================================
// VALIDATION & SANITIZATION
// =====================================================

/**
 * Validate and sanitize the AI response
 */
function validateAndSanitize(
  output: ConversationAgentOutput,
  input: ConversationAgentInput
): ConversationAgentOutput {
  // Ensure reply is within SMS limit
  let replyText = output.replyText || '';
  if (replyText.length > 320) {
    replyText = truncateText(replyText, 320);
  }

  // Validate state
  const validStates: ConversationState[] = [
    'initial', 'greeting_sent', 'capturing_need', 'capturing_address',
    'capturing_urgency', 'capturing_time', 'capturing_name', 'info_complete',
    'awaiting_response', 'handoff_requested', 'emergency_detected', 'completed'
  ];
  const state = validStates.includes(output.state) ? output.state : input.conversationState;

  // Merge extracted info (don't overwrite with null)
  const extracted: Partial<ExtractedInfo> = {};
  if (output.extracted) {
    if (output.extracted.serviceNeeded) extracted.serviceNeeded = output.extracted.serviceNeeded;
    if (output.extracted.address) extracted.address = output.extracted.address;
    if (output.extracted.urgency) extracted.urgency = output.extracted.urgency;
    if (output.extracted.preferredTime) extracted.preferredTime = output.extracted.preferredTime;
    if (output.extracted.customerName) extracted.customerName = output.extracted.customerName;
  }

  // Validate flags
  const flags = {
    emergencyDetected: output.flags?.emergencyDetected || false,
    emergencyKeywords: Array.isArray(output.flags?.emergencyKeywords) ? output.flags.emergencyKeywords : [],
    handoffRequested: output.flags?.handoffRequested || false,
    handoffReason: output.flags?.handoffReason || null,
  };

  return {
    replyText,
    state,
    extracted,
    flags,
    checklistCovered: Array.isArray(output.checklistCovered) ? output.checklistCovered : [],
    internalNotes: typeof output.internalNotes === 'string' ? output.internalNotes : '',
  };
}

/**
 * Create a fallback response when parsing fails
 */
function createFallbackResponse(
  input: ConversationAgentInput,
  rawResponse: string
): ConversationAgentOutput {
  // Try to extract just the text response
  let replyText = rawResponse;

  // Remove any JSON-like content
  replyText = replyText.replace(/\{[\s\S]*\}/g, '').trim();

  // If still too long or empty, use a generic response
  if (replyText.length > 320 || replyText.length === 0) {
    replyText = input.businessContext.isOpen
      ? `Thanks for reaching out to ${input.businessContext.name}! How can we help you today?`
      : `Thanks for contacting ${input.businessContext.name}. We're currently closed but will get back to you as soon as we open. How can we help?`;
  }

  return {
    replyText: truncateText(replyText, 320),
    state: input.conversationState === 'initial' ? 'greeting_sent' : input.conversationState,
    extracted: {},
    flags: {
      emergencyDetected: false,
      emergencyKeywords: [],
      handoffRequested: false,
      handoffReason: null,
    },
    checklistCovered: [],
    internalNotes: 'Fallback response used due to parsing failure',
  };
}

// =====================================================
// HANDOFF DETECTION
// =====================================================

/**
 * Detect if the customer is requesting to speak to a human
 */
export function detectHandoffRequest(message: string): {
  requested: boolean;
  reason: string | null;
} {
  const lowerMessage = message.toLowerCase();

  const handoffPatterns = [
    { pattern: /\b(speak|talk)\s+(to|with)\s+(a\s+)?(human|person|someone|real\s+person|representative|rep)\b/i, reason: 'Requested human contact' },
    { pattern: /\b(get\s+me\s+a\s+)(human|person|manager)\b/i, reason: 'Requested human contact' },
    { pattern: /\b(transfer|connect)\s+(me\s+)?(to\s+)?(a\s+)?(human|person|someone)\b/i, reason: 'Requested transfer' },
    { pattern: /\b(stop|quit|enough)\s+(bot|ai|automated)/i, reason: 'Frustrated with AI' },
    { pattern: /\bi\s+(need|want)\s+(a\s+)?(human|real\s+person|actual\s+person)/i, reason: 'Requested human contact' },
    { pattern: /\bis\s+(this|there)\s+(a\s+)?(real\s+person|human)/i, reason: 'Questioning if human' },
    { pattern: /\bcan\s+i\s+(speak|talk)\s+(to|with)\s+(the\s+)?(owner|manager|boss)/i, reason: 'Requested manager' },
  ];

  for (const { pattern, reason } of handoffPatterns) {
    if (pattern.test(lowerMessage)) {
      return { requested: true, reason };
    }
  }

  return { requested: false, reason: null };
}

// =====================================================
// URGENCY DETECTION
// =====================================================

/**
 * Infer urgency from message content
 */
export function inferUrgency(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  // Critical urgency
  const criticalPatterns = [
    /\b(emergency|urgent|asap|right\s*now|immediately)\b/i,
    /\b(flood|flooding|gas\s*leak|no\s*(heat|ac|water))\b/i,
  ];

  for (const pattern of criticalPatterns) {
    if (pattern.test(lowerMessage)) {
      return 'emergency';
    }
  }

  // High urgency
  const highPatterns = [
    /\b(today|tonight|this\s*(morning|afternoon|evening))\b/i,
    /\b(as\s*soon\s*as\s*possible|whenever\s*possible)\b/i,
  ];

  for (const pattern of highPatterns) {
    if (pattern.test(lowerMessage)) {
      return 'today';
    }
  }

  // Medium urgency
  const mediumPatterns = [
    /\b(tomorrow|next\s*day)\b/i,
    /\b(this\s*week)\b/i,
  ];

  for (const pattern of mediumPatterns) {
    if (pattern.test(lowerMessage)) {
      return 'this_week';
    }
  }

  // Flexible
  const flexiblePatterns = [
    /\b(whenever|flexible|no\s*rush|when(ever)?\s*you\s*(can|have\s*time))\b/i,
    /\b(next\s*week|sometime)\b/i,
  ];

  for (const pattern of flexiblePatterns) {
    if (pattern.test(lowerMessage)) {
      return 'flexible';
    }
  }

  return null;
}
