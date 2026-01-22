// =====================================================
// Prompt 7: Human Handoff Summarizer
// Generates concise summary when conversation is
// handed off to a human operator
// Event-triggered (on handoff request)
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  HandoffSummarizerInput,
  HandoffSummarizerOutput,
  SimpleMessage,
  PromptResult,
} from '@/types/leads-captain/prompt-types';
import { callClaude, parseJSONResponse, withTimeout } from './base-prompt';

// =====================================================
// SYSTEM PROMPT
// =====================================================

const HANDOFF_SYSTEM_PROMPT = `You are a conversation summarizer for a service business. Your job is to create a quick, actionable summary when a conversation is handed off from AI to a human operator.

The human operator needs to:
1. Quickly understand the situation
2. Know what the customer wants
3. Understand the customer's mood
4. Know what has already been discussed
5. Be prepared with any relevant details

OUTPUT FORMAT:
{
  "quickSummary": "1-2 sentence overview of the situation",
  "customerMood": "calm|concerned|frustrated|angry|urgent",
  "handoffReason": "Why the conversation needs human attention",
  "customerWants": ["Primary request", "Secondary request if any"],
  "alreadyDiscussed": ["Topic 1 that was covered", "Topic 2"],
  "notYetDiscussed": ["Information still needed"],
  "suggestedOpening": "Suggested first message for the human",
  "urgencyLevel": "low|medium|high|critical",
  "warningFlags": ["Any concerns the human should know about"]
}

GUIDELINES:
- Be concise - operators are busy
- Lead with the most important info
- Mention if customer seems upset or in a hurry
- Note any promises the AI made
- Flag anything unusual or concerning
- The suggested opening should acknowledge the handoff naturally

OUTPUT: JSON only`;

// =====================================================
// USER PROMPT BUILDER
// =====================================================

function buildHandoffUserPrompt(input: HandoffSummarizerInput): string {
  const messages = input.conversationHistory
    .map(msg => `${msg.role === 'customer' ? 'CUSTOMER' : 'BUSINESS'}: ${msg.content}`)
    .join('\n');

  return `Summarize this conversation for handoff to a human operator.

CONVERSATION:
${messages}

HANDOFF TRIGGER: ${input.handoffTrigger}
${input.customerName ? `CUSTOMER NAME: ${input.customerName}` : ''}
${input.detectedIntent ? `DETECTED INTENT: ${input.detectedIntent}` : ''}
${input.isEmergency ? `⚠️ FLAGGED AS EMERGENCY` : ''}

Create a summary that helps the human operator take over smoothly.`;
}

// =====================================================
// MAIN EXECUTION
// =====================================================

export async function executeHandoffSummarizer(
  input: HandoffSummarizerInput
): Promise<PromptResult<HandoffSummarizerOutput>> {
  const startTime = Date.now();

  try {
    // For very short conversations, use quick summary
    if (input.conversationHistory.length <= 2) {
      return {
        success: true,
        data: generateQuickHandoffSummary(input),
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    const userPrompt = buildHandoffUserPrompt(input);

    // Use short timeout - handoffs need to be quick
    const response = await withTimeout(
      callClaude({
        systemPrompt: HANDOFF_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 800,
        temperature: 0.2,
      }),
      15000 // 15 second timeout
    );

    const parsed = parseJSONResponse<HandoffSummarizerOutput>(response.content);

    if (!parsed) {
      return {
        success: true,
        data: generateQuickHandoffSummary(input),
        tokensUsed: response.tokensUsed,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: parsed,
      tokensUsed: response.tokensUsed,
      latencyMs: Date.now() - startTime,
    };

  } catch (error) {
    jobLogger.error({
      msg: 'Handoff summarizer failed',
      error: error instanceof Error ? error.message : String(error),
    });

    // Always return something - handoffs can't fail silently
    return {
      success: true,
      data: generateQuickHandoffSummary(input),
      error: error instanceof Error ? error.message : 'Unknown error',
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }
}

// =====================================================
// QUICK SUMMARY (Non-LLM Fallback)
// =====================================================

function generateQuickHandoffSummary(input: HandoffSummarizerInput): HandoffSummarizerOutput {
  const messages = input.conversationHistory;
  const customerMessages = messages.filter(m => m.role === 'customer');
  const lastCustomerMessage = customerMessages[customerMessages.length - 1]?.content || '';

  // Detect mood from keywords
  const mood = detectCustomerMood(customerMessages);

  // Detect urgency
  const urgencyLevel = input.isEmergency ? 'critical' :
    mood === 'angry' || mood === 'frustrated' ? 'high' :
    mood === 'urgent' ? 'high' :
    'medium';

  // Extract what customer wants from their messages
  const customerWants = extractCustomerWants(customerMessages);

  // Build warning flags
  const warningFlags: string[] = [];
  if (input.isEmergency) warningFlags.push('Flagged as emergency');
  if (mood === 'angry') warningFlags.push('Customer appears upset');
  if (mood === 'frustrated') warningFlags.push('Customer showing frustration');

  // Generate suggested opening
  const suggestedOpening = generateSuggestedOpening(input, mood);

  return {
    quickSummary: `Customer ${input.customerName ? `(${input.customerName}) ` : ''}requested human assistance. ${input.detectedIntent ? `Topic: ${input.detectedIntent}.` : ''} ${customerWants[0] ? `Wants: ${customerWants[0]}.` : ''}`,
    customerMood: mood,
    handoffReason: input.handoffTrigger,
    customerWants,
    alreadyDiscussed: extractTopicsDiscussed(messages),
    notYetDiscussed: determineNotDiscussed(messages, input.detectedIntent),
    suggestedOpening,
    urgencyLevel,
    warningFlags,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function detectCustomerMood(
  customerMessages: SimpleMessage[]
): 'calm' | 'concerned' | 'frustrated' | 'angry' | 'urgent' {
  const allText = customerMessages.map(m => m.content.toLowerCase()).join(' ');

  // Check for angry signals
  const angryPatterns = [
    /\b(pissed|furious|ridiculous|unacceptable|terrible|worst|horrible)\b/,
    /!{2,}/,
    /\bwhat the\b/,
    /\bthis is bs\b/i,
  ];
  if (angryPatterns.some(p => p.test(allText))) return 'angry';

  // Check for frustration
  const frustratedPatterns = [
    /\b(frustrated|annoyed|disappointed|upset|tired of|fed up)\b/,
    /\balready (told|said|explained)\b/,
    /\bhow many times\b/,
    /\bstill (waiting|haven't|no)\b/,
  ];
  if (frustratedPatterns.some(p => p.test(allText))) return 'frustrated';

  // Check for urgency
  const urgentPatterns = [
    /\b(asap|urgent|emergency|immediately|right now|today)\b/,
    /\b(flooding|leak|no heat|no ac|gas smell)\b/,
    /\bcan't wait\b/,
  ];
  if (urgentPatterns.some(p => p.test(allText))) return 'urgent';

  // Check for concern
  const concernedPatterns = [
    /\b(worried|concerned|unsure|not sure|wondering)\b/,
    /\?{2,}/,
  ];
  if (concernedPatterns.some(p => p.test(allText))) return 'concerned';

  return 'calm';
}

function extractCustomerWants(customerMessages: SimpleMessage[]): string[] {
  const wants: string[] = [];
  const allText = customerMessages.map(m => m.content).join(' ');

  // Look for explicit requests
  const requestPatterns = [
    /(?:i need|i want|looking for|can you|could you|please)\s+(.+?)(?:\.|$|,)/gi,
    /(?:need|want)\s+(?:to|a|an|the)\s+(.+?)(?:\.|$|,)/gi,
  ];

  for (const pattern of requestPatterns) {
    const matches = allText.matchAll(pattern);
    for (const match of matches) {
      const want = match[1].trim();
      if (want.length > 5 && want.length < 100 && !wants.includes(want)) {
        wants.push(want);
      }
    }
  }

  // If no explicit requests found, use last customer message
  if (wants.length === 0 && customerMessages.length > 0) {
    const lastMsg = customerMessages[customerMessages.length - 1].content;
    if (lastMsg.length < 100) {
      wants.push(lastMsg);
    } else {
      wants.push(lastMsg.substring(0, 97) + '...');
    }
  }

  return wants.slice(0, 3);
}

function extractTopicsDiscussed(messages: SimpleMessage[]): string[] {
  const topics: string[] = [];
  const allText = messages.map(m => m.content.toLowerCase()).join(' ');

  // Common service topics
  const topicKeywords: Record<string, string> = {
    'price|cost|quote|estimate|how much': 'Pricing discussed',
    'schedule|appointment|available|when can': 'Scheduling discussed',
    'repair|fix|broken|not working': 'Repair needs discussed',
    'install|new|replace': 'Installation discussed',
    'maintenance|tune-up|service': 'Maintenance discussed',
    'warranty|guarantee': 'Warranty mentioned',
    'address|location|where': 'Location discussed',
  };

  for (const [pattern, topic] of Object.entries(topicKeywords)) {
    if (new RegExp(pattern, 'i').test(allText) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics.slice(0, 5);
}

function determineNotDiscussed(
  messages: SimpleMessage[],
  detectedIntent?: string
): string[] {
  const notDiscussed: string[] = [];
  const allText = messages.map(m => m.content.toLowerCase()).join(' ');

  // Standard info we usually need
  const standardInfo = [
    { pattern: /\d{5}|address|street|location/, missing: 'Service address' },
    { pattern: /name|i'm|my name/, missing: 'Customer name' },
    { pattern: /\d{3}[-.]?\d{3}[-.]?\d{4}|phone|call|number/, missing: 'Contact phone' },
    { pattern: /when|time|date|schedule|available/, missing: 'Preferred timing' },
  ];

  for (const info of standardInfo) {
    if (!info.pattern.test(allText)) {
      notDiscussed.push(info.missing);
    }
  }

  return notDiscussed.slice(0, 4);
}

function generateSuggestedOpening(
  input: HandoffSummarizerInput,
  mood: string
): string {
  const name = input.customerName ? `, ${input.customerName}` : '';

  if (input.isEmergency) {
    return `Hi${name}! I'm taking over personally to help with your emergency. Let me get you sorted out right away.`;
  }

  if (mood === 'angry' || mood === 'frustrated') {
    return `Hi${name}, I apologize for any frustration. I'm personally stepping in to make sure we get this resolved for you.`;
  }

  if (mood === 'urgent') {
    return `Hi${name}! I understand this is urgent - I'm here to help you right now.`;
  }

  // Default
  return `Hi${name}! I'm taking over the conversation personally. How can I help you today?`;
}

// =====================================================
// EXPORT FOR ORCHESTRATOR INTEGRATION
// =====================================================

export async function summarizeForHandoff(
  conversationHistory: SimpleMessage[],
  options: {
    handoffTrigger: string;
    customerName?: string;
    detectedIntent?: string;
    isEmergency?: boolean;
  }
): Promise<HandoffSummarizerOutput> {
  const input: HandoffSummarizerInput = {
    conversationHistory,
    handoffTrigger: options.handoffTrigger,
    customerName: options.customerName,
    detectedIntent: options.detectedIntent,
    isEmergency: options.isEmergency || false,
  };

  const result = await executeHandoffSummarizer(input);

  if (result.success && result.data) {
    return result.data;
  }

  // Return fallback summary
  return generateQuickHandoffSummary(input);
}
