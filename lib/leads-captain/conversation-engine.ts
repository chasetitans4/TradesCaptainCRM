// Leads Captain AI Conversation Engine
// Based on AI Conversation Specification v1.4

import Anthropic from '@anthropic-ai/sdk';
import {
  BusinessSettings,
  Conversation,
  ConversationMessage,
  ConversationState,
  AIResponse,
  ExtractedInfo,
  UrgencyLevel,
  TERMINAL_STATES,
  SAFETY_KEYWORDS,
  NEGATION_WORDS,
  CONTEXTUAL_EMERGENCY_KEYWORDS,
  URGENCY_DOWNGRADE_PHRASES,
  QUOTE_KEYWORDS,
  STOP_KEYWORDS,
  HELP_KEYWORDS,
  START_KEYWORDS,
} from './types';

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return anthropicClient;
}
// Constants
const AI_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_RETRIES = 3;
const NEGATION_WINDOW = 20; // characters before keyword to check for negation

/**
 * Check if a message is a compliance keyword (STOP/HELP/START)
 * Returns the keyword type or null if not a compliance keyword
 */
export function checkComplianceKeyword(message: string): 'stop' | 'help' | 'start' | null {
  const normalized = message.trim().toUpperCase();

  if (STOP_KEYWORDS.includes(normalized)) {
    return 'stop';
  }
  if (HELP_KEYWORDS.includes(normalized)) {
    return 'help';
  }
  if (START_KEYWORDS.includes(normalized)) {
    return 'start';
  }

  return null;
}

/**
 * Generate compliance response for STOP/HELP/START keywords
 */
export function generateComplianceResponse(
  keywordType: 'stop' | 'help' | 'start',
  settings: BusinessSettings
): string {
  switch (keywordType) {
    case 'stop':
      return "You have been unsubscribed and will not receive further messages. Reply START to resubscribe.";
    case 'help':
      return `${settings.businessName} Leads Captain. Msg&data rates may apply. Reply STOP to unsubscribe.`;
    case 'start':
      return "You have been resubscribed and will receive messages again. Reply STOP to unsubscribe.";
  }
}

/**
 * Check if it's currently after business hours
 */
export function isAfterHours(settings: BusinessSettings): boolean {
  const now = new Date();

  // Get current time in business timezone
  const timeInTz = now.toLocaleString('en-US', {
    timeZone: settings.timezone || 'America/Phoenix',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [hours, minutes] = timeInTz.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  // Get current day of week (0 = Sunday)
  const dayInTz = now.toLocaleString('en-US', {
    timeZone: settings.timezone || 'America/Phoenix',
    weekday: 'short'
  });
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const dayOfWeek = dayMap[dayInTz];

  // Check if it's a business day
  if (!settings.businessDays.includes(dayOfWeek)) {
    return true;
  }

  // Parse business hours
  const [startH, startM] = settings.businessHoursStart.split(':').map(Number);
  const [endH, endM] = settings.businessHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Check if current time is outside business hours
  return currentMinutes < startMinutes || currentMinutes >= endMinutes;
}

/**
 * Detect urgency level from message content
 * Implements the negation-aware safety keyword detection from spec
 */
export function detectUrgency(message: string, settings: BusinessSettings): {
  level: UrgencyLevel;
  reason: string | null;
  isSafetyKeyword: boolean;
} {
  const lowerMessage = message.toLowerCase();

  // Check for safety keywords first (always emergency unless negated)
  for (const keyword of SAFETY_KEYWORDS) {
    const keywordIndex = lowerMessage.indexOf(keyword);
    if (keywordIndex !== -1) {
      // Check for negation within the negation window before the keyword
      const windowStart = Math.max(0, keywordIndex - NEGATION_WINDOW);
      const beforeKeyword = lowerMessage.substring(windowStart, keywordIndex);

      const hasNegation = NEGATION_WORDS.some(neg => beforeKeyword.includes(neg));

      if (hasNegation) {
        // Safety keyword was negated - treat as medium (still noteworthy)
        return {
          level: 'medium',
          reason: `Mentioned ${keyword} (negated)`,
          isSafetyKeyword: false
        };
      }

      // Safety keyword without negation - EMERGENCY
      return {
        level: 'emergency',
        reason: keyword,
        isSafetyKeyword: true
      };
    }
  }

  // Check for custom emergency keywords from settings
  for (const keyword of settings.emergencyKeywords || []) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      // Check for negation
      const keywordIndex = lowerMessage.indexOf(keyword.toLowerCase());
      const windowStart = Math.max(0, keywordIndex - NEGATION_WINDOW);
      const beforeKeyword = lowerMessage.substring(windowStart, keywordIndex);

      const hasNegation = NEGATION_WORDS.some(neg => beforeKeyword.includes(neg));

      if (!hasNegation) {
        return {
          level: 'emergency',
          reason: keyword,
          isSafetyKeyword: true
        };
      }
    }
  }

  // Check for quote/estimate keywords (low urgency)
  for (const keyword of QUOTE_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return {
        level: 'low',
        reason: 'Requesting quote/estimate',
        isSafetyKeyword: false
      };
    }
  }

  // Check for general urgency downgrade phrases
  const hasDowngrade = URGENCY_DOWNGRADE_PHRASES.some(phrase =>
    lowerMessage.includes(phrase)
  );

  if (hasDowngrade) {
    return {
      level: 'medium',
      reason: 'Customer indicated not urgent',
      isSafetyKeyword: false
    };
  }

  // Check for contextual emergency keywords (seasonal)
  for (const keyword of CONTEXTUAL_EMERGENCY_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      // These are contextual - we'll let the AI determine final urgency
      // but flag them as potentially high
      return {
        level: 'high',
        reason: keyword,
        isSafetyKeyword: false
      };
    }
  }

  // Check for urgency indicators
  const highUrgencyIndicators = [
    'asap', 'urgent', 'emergency', 'immediately', 'right now',
    'water everywhere', 'backing up', 'overflowing', 'won\'t stop',
    'dangerous', 'hazard', 'hurry', 'please help'
  ];

  for (const indicator of highUrgencyIndicators) {
    if (lowerMessage.includes(indicator)) {
      return {
        level: 'high',
        reason: indicator,
        isSafetyKeyword: false
      };
    }
  }

  // Default to medium if no specific indicators
  return {
    level: 'medium',
    reason: null,
    isSafetyKeyword: false
  };
}

/**
 * Build the system prompt for the AI
 */
function buildSystemPrompt(settings: BusinessSettings, isAfterHrs: boolean): string {
  const servicesStr = settings.servicesOffered?.join(', ') || 'general services';
  const emergencyKeywordsStr = [
    ...SAFETY_KEYWORDS,
    ...(settings.emergencyKeywords || [])
  ].join(', ');

  return `You are the AI assistant for ${settings.businessName}, owned by ${settings.ownerName}. You handle text conversations with customers who called but didn't reach anyone.

YOUR ROLE:
- Speak AS the business (use "I" not "the owner" or "we")
- Apologize for missing the call and gather information
- Capture: what they need, their address, urgency level, and preferred timing
- DO NOT give quotes, prices, or make scheduling commitments
- Set the expectation that ${settings.ownerName} will call them back

TONE: ${settings.tone}
- professional: Formal, courteous, businesslike
- friendly: Warm, conversational, personable
- casual: Relaxed, informal, like texting a friend

BUSINESS CONTEXT:
- Services offered: ${servicesStr}
- Service area: ${settings.serviceArea}
- Business hours: ${settings.businessHoursStart} - ${settings.businessHoursEnd}
- Currently after hours: ${isAfterHrs ? 'YES' : 'NO'}

CONVERSATION RULES:
1. Keep messages SHORT (1-3 sentences max)
2. Ask ONE question at a time
3. Never promise specific times or prices
4. If emergency keywords detected (${emergencyKeywordsStr}), flag immediately
5. If customer asks for quote, say "${settings.ownerName} will call to discuss pricing"
6. If after hours, acknowledge and set morning callback expectation
7. End conversations gracefully after capturing needed info
8. Max ${settings.maxMessages} messages before suggesting they call back

INFORMATION TO CAPTURE (in order):
1. Service needed (required)
2. Address (required)
3. Urgency — infer from keywords or ask (required)
4. Preferred time (nice to have)
5. Customer name (nice to have)

EMERGENCY HANDLING:
If customer mentions emergency keywords:
→ Immediately notify owner (even after hours)
→ Tell customer: "I'm notifying ${settings.ownerName} immediately"
→ Offer helpful tip if applicable (e.g., "turn off main water valve")

THINGS YOU MUST NEVER DO:
- Give price quotes or estimates
- Schedule appointments (unless I tell you calendar is enabled)
- Promise specific callback times like "within 30 minutes"
- Make guarantees about service availability
- Argue or be defensive
- Continue conversation past ${settings.maxMessages} messages
- Send more than 2 messages without a customer response

${settings.customPrompt ? `ADDITIONAL INSTRUCTIONS:\n${settings.customPrompt}` : ''}

OUTPUT FORMAT:
Respond with ONLY a JSON object (no markdown, no code blocks) containing:
1. "reply_text": The exact SMS to send (1-3 sentences, max 320 chars)
2. "state": The conversation state after this message
3. "extracted": Any information captured from this exchange
4. "actions": What the system should do
5. "confidence": Your confidence in extracted values (0.0-1.0)

Valid states: greeting_sent, capturing_need, capturing_address, capturing_urgency, capturing_time, confirming, offering_slots, awaiting_booking_confirm, handoff, completed, awaiting_owner, lead_captured

Example response:
{
  "reply_text": "Got it — water heater issue. What's the address?",
  "state": "capturing_address",
  "extracted": {
    "service_needed": "water heater not working",
    "address": null,
    "urgency": "medium",
    "urgency_reason": null,
    "preferred_time": null,
    "customer_name": null,
    "additional_notes": null
  },
  "actions": {
    "notify_owner": false,
    "notify_urgency": null,
    "offer_slots": false,
    "end_conversation": false,
    "handoff_reason": null,
    "create_job": false,
    "flag_wrong_number": false,
    "flag_hostile": false
  },
  "confidence": {
    "service_needed": 0.95,
    "urgency": 0.6
  }
}`;
}

/**
 * Format conversation history for the AI
 */
function formatConversationHistory(messages: ConversationMessage[]): string {
  return messages.map(msg => {
    const role = msg.role === 'assistant' ? 'AI' : 'CUSTOMER';
    return `${role}: ${msg.content}`;
  }).join('\n');
}

/**
 * Parse AI response JSON safely
 */
function parseAIResponse(responseText: string): AIResponse | null {
  try {
    // Remove any markdown code blocks if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.reply_text || !parsed.state) {
      console.error('AI response missing required fields:', parsed);
      return null;
    }

    return parsed as AIResponse;
  } catch (error) {
    console.error('Failed to parse AI response:', error, responseText);
    return null;
  }
}

/**
 * Generate AI response for a customer message
 */
export async function generateAIResponse(
  conversation: Conversation,
  customerMessage: string,
  settings: BusinessSettings
): Promise<{
  response: AIResponse;
  success: boolean;
  error?: string;
}> {
  const isAfterHrs = isAfterHours(settings);

  // Pre-check urgency from the message
  const urgencyCheck = detectUrgency(customerMessage, settings);

  // Build the conversation context
  const systemPrompt = buildSystemPrompt(settings, isAfterHrs);

  // Format history
  const history = formatConversationHistory(conversation.messages);

  // Build the user message with context
  let contextInfo = '';
  if (urgencyCheck.isSafetyKeyword) {
    contextInfo = `\n[SYSTEM NOTE: EMERGENCY keyword "${urgencyCheck.reason}" detected. Prioritize immediate owner notification.]`;
  }

  const userPrompt = `CONVERSATION HISTORY:
${history}

CUSTOMER: ${customerMessage}${contextInfo}

Current state: ${conversation.state}
Message count: ${conversation.messageCount}
${conversation.extracted.serviceNeeded ? `Service captured: ${conversation.extracted.serviceNeeded}` : ''}
${conversation.extracted.address ? `Address captured: ${conversation.extracted.address}` : ''}
${conversation.extracted.urgency ? `Urgency detected: ${conversation.extracted.urgency}` : ''}

Respond with ONLY a JSON object.`;

  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = await getAnthropic().messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
        ],
      });

      // Extract text content
      const textContent = message.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in AI response');
      }

      const parsed = parseAIResponse(textContent.text);
      if (!parsed) {
        throw new Error('Failed to parse AI response');
      }

      // Override urgency if we detected a safety keyword
      if (urgencyCheck.isSafetyKeyword && urgencyCheck.level === 'emergency') {
        parsed.extracted.urgency = 'emergency';
        parsed.extracted.urgency_reason = urgencyCheck.reason;
        parsed.actions.notify_owner = true;
        parsed.actions.notify_urgency = 'emergency';
      }

      return {
        response: parsed,
        success: true
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`AI response attempt ${attempt + 1} failed:`, lastError);

      // Wait before retry with exponential backoff
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed - return fallback response
  return {
    response: {
      reply_text: `Got it! I'll have ${settings.ownerName} call you back shortly.`,
      state: 'awaiting_owner',
      extracted: {
        service_needed: customerMessage.length > 100 ? customerMessage.substring(0, 100) : customerMessage,
        address: null,
        urgency: urgencyCheck.level,
        urgency_reason: urgencyCheck.reason,
        preferred_time: null,
        customer_name: null,
        additional_notes: null
      },
      actions: {
        notify_owner: true,
        notify_urgency: urgencyCheck.level === 'emergency' ? 'emergency' : null,
        offer_slots: false,
        end_conversation: true,
        handoff_reason: 'AI fallback - all retries failed'
      },
      confidence: {}
    },
    success: false,
    error: lastError
  };
}

/**
 * Generate the initial greeting message
 */
export function generateGreeting(settings: BusinessSettings, isAfterHrs: boolean): string {
  if (settings.greetingMessage) {
    // Use custom greeting if provided
    let greeting = settings.greetingMessage;

    // Replace placeholders
    greeting = greeting.replace('{business_name}', settings.businessName);
    greeting = greeting.replace('{owner_name}', settings.ownerName);

    return greeting;
  }

  // Generate default greeting based on style and time
  if (isAfterHrs) {
    if (settings.greetingStyle === 'direct') {
      return `Hi, this is ${settings.businessName}. I'm done for the day but wanted to make sure I got back to you. What do you need help with?`;
    }
    // Apologetic style (default)
    return `Hey! Sorry I missed your call. I'm done for the day but wanted to make sure I got back to you. What do you need help with?`;
  }

  // During business hours
  if (settings.greetingStyle === 'direct') {
    return `Hi, this is ${settings.businessName}. I'm with a customer right now. What can I help you with?`;
  }
  // Apologetic style (default)
  return `Hey! Sorry I missed your call — I'm with a customer right now. What can I help you with?`;
}

/**
 * Check if conversation has required fields captured (service + address)
 */
export function hasRequiredFields(extracted: ExtractedInfo): boolean {
  return !!(extracted.serviceNeeded && extracted.address);
}

/**
 * Determine if conversation should be marked as lead_captured
 */
export function shouldMarkAsLeadCaptured(
  state: ConversationState,
  extracted: ExtractedInfo
): boolean {
  // Already in a terminal state
  if (TERMINAL_STATES.includes(state)) {
    return false;
  }

  // Check if we have the required fields
  return hasRequiredFields(extracted);
}

/**
 * Check if we've sent too many messages without a response
 */
export function hasTooManyUnansweredMessages(
  conversation: Conversation,
  maxUnanswered: number = 2
): boolean {
  return conversation.aiMessagesSinceResponse >= maxUnanswered;
}

/**
 * Check if conversation has exceeded max message limit
 */
export function hasExceededMaxMessages(
  conversation: Conversation,
  maxMessages: number
): boolean {
  return conversation.messageCount >= maxMessages;
}

/**
 * Merge extracted info from AI response with existing extracted info
 */
export function mergeExtractedInfo(
  existing: ExtractedInfo,
  newInfo: AIResponse['extracted']
): ExtractedInfo {
  return {
    serviceNeeded: newInfo.service_needed || existing.serviceNeeded,
    address: newInfo.address || existing.address,
    urgency: newInfo.urgency || existing.urgency,
    urgencyReason: newInfo.urgency_reason || existing.urgencyReason,
    preferredTime: newInfo.preferred_time || existing.preferredTime,
    customerName: newInfo.customer_name || existing.customerName,
    additionalNotes: newInfo.additional_notes || existing.additionalNotes,
  };
}

/**
 * Create initial empty extracted info
 */
export function createEmptyExtractedInfo(): ExtractedInfo {
  return {
    serviceNeeded: null,
    address: null,
    urgency: null,
    urgencyReason: null,
    preferredTime: null,
    customerName: null,
    additionalNotes: null,
  };
}
