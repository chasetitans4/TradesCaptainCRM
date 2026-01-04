// =====================================================
// Leads Captain v2.0 AI Guardrails
// Constrained AI for fallback responses only
// =====================================================

import Anthropic from '@anthropic-ai/sdk';
import {
  LeadsCaptainConfig,
  LeadsCaptainConversation,
  LeadsCaptainPriceItem,
  AIGenerationOptions,
  AIResponseResult,
  IntentClassificationResult,
  ToneOption,
  CreativityLevel,
  LeadsCaptainMessage,
} from '@/types/leads-captain';
import { jobLogger } from '@/lib/logger';

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

// Temperature mapping for creativity levels
const CREATIVITY_TEMPERATURES: Record<CreativityLevel, number> = {
  none: 0,
  low: 0.3,
  medium: 0.5,
  high: 0.7,
};

/**
 * Generate an AI response with heavy guardrails
 * Only used when no rule matches
 */
export async function generateAIResponse(
  message: string,
  classification: IntentClassificationResult,
  config: LeadsCaptainConfig,
  conversation: LeadsCaptainConversation | null,
  conversationHistory: LeadsCaptainMessage[],
  options: AIGenerationOptions
): Promise<AIResponseResult> {
  const systemPrompt = buildSystemPrompt(config, classification, options);
  const conversationMessages = buildConversationMessages(conversationHistory, message);

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300, // Limit response length
      temperature: CREATIVITY_TEMPERATURES[options.creativity_level],
      system: systemPrompt,
      messages: conversationMessages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    let responseText = content.text;
    const guardrailsApplied: string[] = [];

    // Apply guardrails
    const guardrailResult = applyGuardrails(responseText, config, options, classification);
    responseText = guardrailResult.text;
    guardrailsApplied.push(...guardrailResult.applied);

    // Calculate a confidence score based on intent match and response quality
    const confidence = calculateConfidence(classification, responseText);

    return {
      content: responseText,
      confidence,
      model: 'claude-3-5-sonnet-20241022',
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
      guardrails_applied: guardrailsApplied,
    };
  } catch (error) {
    jobLogger.error({
      msg: 'AI generation error',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
    });
    throw error;
  }
}

/**
 * Build the constrained system prompt
 */
export function buildSystemPrompt(
  config: LeadsCaptainConfig,
  classification: IntentClassificationResult,
  options: AIGenerationOptions
): string {
  const toneInstructions = getToneInstructions(options.tone);
  const pricingInstructions = getPricingInstructions(options.pricing_mode, options.price_list);
  const emojiInstructions = options.use_emojis
    ? 'Use 1-2 appropriate emojis per message, but never in serious/emergency contexts.'
    : 'Do not use emojis.';

  // Build template examples for context
  const templateExamples = options.templates_for_reference
    .slice(0, 3)
    .map(t => `- ${t.name}: "${t.content.slice(0, 100)}${t.content.length > 100 ? '...' : ''}"`)
    .join('\n');

  return `You are an AI assistant for ${config.business_name}${config.business_type ? ` (${config.business_type} services)` : ''}.
${config.owner_name ? `The owner's name is ${config.owner_name}.` : ''}
${config.service_area ? `Service area: ${config.service_area}` : ''}

CRITICAL CONSTRAINTS - YOU MUST FOLLOW THESE:
1. NEVER make specific promises about timing, availability, or pricing unless explicitly provided
2. NEVER schedule appointments - instead, provide booking link or ask them to call
3. NEVER give medical, legal, or safety advice beyond "call 911 for emergencies"
4. NEVER pretend to be a human - if asked directly, admit you're an AI assistant
5. NEVER discuss competitors or make comparative claims
6. NEVER share personal information about the owner or employees
7. Keep responses under ${options.max_length} characters
8. Always be helpful but stay within your knowledge limits

${toneInstructions}

${emojiInstructions}

${pricingInstructions}

The customer's message has been classified as:
- Intent: ${classification.intent}
- Sentiment: ${classification.sentiment}
- Confidence: ${classification.confidence}%

${templateExamples ? `\nHere are example response styles from this business:\n${templateExamples}\n` : ''}

Your goal is to:
1. Acknowledge the customer's need
2. Gather more information if needed OR direct them to the appropriate action
3. ${config.booking_link ? `Provide booking link (${config.booking_link}) when appropriate` : 'Encourage them to call'}
4. Keep the conversation moving toward a resolution

IMPORTANT: You are a FALLBACK when no specific rule matches. Stay conservative and helpful.`;
}

/**
 * Get tone-specific instructions
 */
function getToneInstructions(tone: ToneOption): string {
  switch (tone) {
    case 'casual':
      return `TONE: Be casual and friendly, like texting a friend who happens to be a pro. Use contractions. Keep it light and approachable. Examples: "Hey!", "No problem!", "Gotcha!"`;

    case 'formal':
      return `TONE: Be professional and formal. Use complete sentences. Avoid slang. Address the customer respectfully. Examples: "Thank you for contacting us.", "We appreciate your inquiry.", "We would be happy to assist you."`;

    case 'friendly_professional':
    default:
      return `TONE: Be friendly but professional - warm without being too casual. Use a mix of professional language and approachable phrases. Examples: "Thanks for reaching out!", "Happy to help with that!", "We'll take good care of you."`;
  }
}

/**
 * Get pricing disclosure instructions
 */
function getPricingInstructions(mode: string, priceList: LeadsCaptainPriceItem[]): string {
  switch (mode) {
    case 'never':
      return `PRICING: NEVER discuss specific prices. If asked about cost, say something like "Pricing depends on the specific situation. Let me have someone get back to you with a proper estimate."`;

    case 'ranges':
      if (priceList.length > 0) {
        const ranges = priceList
          .filter(p => p.is_active && (p.price_min || p.price_max))
          .slice(0, 5)
          .map(p => {
            if (p.price_min && p.price_max) {
              return `${p.service_name}: $${p.price_min}-$${p.price_max}`;
            }
            if (p.price_min) return `${p.service_name}: Starting at $${p.price_min}`;
            if (p.price_note) return `${p.service_name}: ${p.price_note}`;
            return null;
          })
          .filter(Boolean);

        if (ranges.length > 0) {
          return `PRICING: You may give general price RANGES only. Available ranges:\n${ranges.join('\n')}\n\nAlways add "but the final price depends on the specific job" or similar qualifier.`;
        }
      }
      return `PRICING: You may give general price ranges if asked, but always qualify with "typically" or "usually" and note that actual pricing depends on the specific job.`;

    case 'specific':
      if (priceList.length > 0) {
        const prices = priceList
          .filter(p => p.is_active)
          .slice(0, 10)
          .map(p => {
            const price = p.price_min ? `$${p.price_min}${p.price_max ? `-$${p.price_max}` : ''}` : 'varies';
            return `${p.service_name}: ${price}${p.price_note ? ` (${p.price_note})` : ''}`;
          });

        return `PRICING: You may share these specific prices:\n${prices.join('\n')}\n\nNote: These are estimates and final pricing may vary based on the specific job.`;
      }
      return `PRICING: No price list available. If asked about pricing, offer to have someone provide a specific quote.`;

    default:
      return `PRICING: Be conservative with pricing. Offer ranges if you know them, otherwise suggest getting a proper quote.`;
  }
}

/**
 * Build conversation history for context
 */
function buildConversationMessages(
  history: LeadsCaptainMessage[],
  currentMessage: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add recent history (last 10 messages)
  const recentHistory = history.slice(-10);

  for (const msg of recentHistory) {
    messages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Add current message
  messages.push({
    role: 'user',
    content: currentMessage,
  });

  return messages;
}

/**
 * Apply guardrails to AI-generated response
 */
export function applyGuardrails(
  text: string,
  config: LeadsCaptainConfig,
  options: AIGenerationOptions,
  classification: IntentClassificationResult
): { text: string; applied: string[] } {
  const applied: string[] = [];
  let result = text;

  // 1. Length check
  if (result.length > options.max_length) {
    result = truncateResponse(result, options.max_length);
    applied.push('length_truncated');
  }

  // 2. Remove any specific time promises
  const timePromises = /\b(will be there|arriving|on my way|be there in|tomorrow at \d|today at \d|next \w+ at \d)/gi;
  if (timePromises.test(result)) {
    result = result.replace(timePromises, (_match) => {
      applied.push('time_promise_removed');
      return 'will reach out to schedule';
    });
  }

  // 3. Ensure no guaranteed pricing without qualifier
  const guaranteedPricing = /\$\d+(\.\d{2})?\s*(flat|exactly|guaranteed|for sure)/gi;
  if (guaranteedPricing.test(result)) {
    applied.push('pricing_qualified');
    result = result.replace(guaranteedPricing, '$& (estimate)');
  }

  // 4. Check for inappropriate content
  const inappropriatePatterns = [
    /\b(competitor|better than|worse than)\b/gi,
    /\b(lawsuit|sue|legal action)\b/gi,
    /\b(stupid|idiot|dumb)\b/gi,
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(result)) {
      jobLogger.warn({ msg: 'AI response inappropriate content flagged' });
      applied.push('flagged_inappropriate');
    }
  }

  // 5. Add booking link if appropriate and not present
  if (
    config.booking_link &&
    !result.includes(config.booking_link) &&
    (classification.intent === 'schedule' || classification.intent === 'availability')
  ) {
    // Don't add if response is already long
    if (result.length + config.booking_link.length + 20 < options.max_length) {
      result += `\n\nBook online: ${config.booking_link}`;
      applied.push('booking_link_added');
    }
  }

  // 6. Emoji control
  if (!options.use_emojis) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    if (emojiRegex.test(result)) {
      result = result.replace(emojiRegex, '').replace(/\s+/g, ' ').trim();
      applied.push('emojis_removed');
    }
  }

  // 7. Tone enforcement for angry customers
  if (classification.sentiment === 'angry') {
    // Ensure response starts with acknowledgment
    const acknowledgments = ['sorry', 'apologize', 'understand', 'hear you', 'frustrating'];
    const hasAcknowledgment = acknowledgments.some(a => result.toLowerCase().includes(a));

    if (!hasAcknowledgment) {
      result = "I'm sorry to hear that. " + result;
      applied.push('empathy_added');
    }
  }

  return { text: result, applied };
}

/**
 * Truncate response at a natural break point
 */
function truncateResponse(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Try to truncate at sentence boundary
  const targetLength = maxLength - 3;
  const sentenceEnd = text.lastIndexOf('. ', targetLength);

  if (sentenceEnd > maxLength * 0.5) {
    return text.slice(0, sentenceEnd + 1);
  }

  // Fall back to word boundary
  const wordEnd = text.lastIndexOf(' ', targetLength);
  if (wordEnd > maxLength * 0.5) {
    return text.slice(0, wordEnd) + '...';
  }

  return text.slice(0, targetLength) + '...';
}

/**
 * Calculate confidence score for AI response
 */
function calculateConfidence(
  classification: IntentClassificationResult,
  response: string
): number {
  let confidence = classification.confidence;

  // Reduce confidence for uncertain intents
  if (classification.confidence < 60) {
    confidence -= 10;
  }

  // Reduce confidence for angry sentiment (risky to respond)
  if (classification.sentiment === 'angry') {
    confidence -= 15;
  }

  // Reduce confidence for very short responses (might be incomplete)
  if (response.length < 50) {
    confidence -= 5;
  }

  // Reduce confidence for very long responses (might be rambling)
  if (response.length > 300) {
    confidence -= 5;
  }

  // Ensure confidence is within bounds
  return Math.min(100, Math.max(0, confidence));
}

/**
 * Determine if AI response requires approval
 */
export function requiresApproval(
  config: LeadsCaptainConfig,
  confidence: number,
  isFirstMessage: boolean,
  classification: IntentClassificationResult
): boolean {
  switch (config.require_approval) {
    case 'all':
      return true;

    case 'first_message':
      return isFirstMessage;

    case 'low_confidence':
      // Require approval if confidence below threshold or sentiment is angry
      return (
        confidence < config.ai_confidence_threshold ||
        classification.sentiment === 'angry' ||
        classification.intent === 'complaint' ||
        classification.intent === 'refund'
      );

    case 'never':
    default:
      return false;
  }
}
