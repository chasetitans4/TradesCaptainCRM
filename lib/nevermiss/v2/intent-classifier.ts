// =====================================================
// NeverMiss v2.0 Intent Classifier
// Uses OpenAI GPT-4o-mini for fast intent classification
// =====================================================

import 'openai/shims/node';
import OpenAI from 'openai';
import {
  IntentClassificationResult,
  SentimentType,
  ExtractedEntities,
  NevermissIntent,
  COMPLIANCE_KEYWORDS,
} from '@/types/nevermiss';

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export interface ClassifierOptions {
  enabled_intents: NevermissIntent[];
  business_context?: string;
  detect_language?: boolean;
}

/**
 * Classify the intent of an incoming message
 * Uses GPT-4o-mini for fast, cost-effective classification
 */
export async function classifyIntent(
  message: string,
  options: ClassifierOptions
): Promise<IntentClassificationResult> {
  // First check for compliance keywords (no AI needed)
  const complianceCheck = checkComplianceKeywords(message);
  if (complianceCheck) {
    return complianceCheck;
  }

  // Build the list of enabled intents for classification
  const intentList = options.enabled_intents
    .filter(i => i.enabled)
    .map(i => ({
      code: i.intent_code,
      label: i.intent_label,
      examples: i.example_phrases || [],
    }));

  // If no intents enabled, return general
  if (intentList.length === 0) {
    return {
      intent: 'general',
      confidence: 50,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  try {
    const client = getOpenAIClient();
    if (!client) {
      return fallbackClassification(message, intentList);
    }
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: buildClassifierPrompt(intentList, options.business_context),
        },
        {
          role: 'user',
          content: message,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from classifier');
    }

    const result = JSON.parse(content) as ClassificationResponse;

    return {
      intent: result.intent || 'general',
      confidence: Math.min(100, Math.max(0, result.confidence || 50)),
      sentiment: validateSentiment(result.sentiment),
      language: result.language || 'en',
      entities: result.entities || {},
      is_compliance: false,
    };
  } catch (error) {
    console.error('[NeverMiss v2] Intent classification error:', error);

    // Fallback to simple keyword matching
    return fallbackClassification(message, intentList);
  }
}

interface ClassificationResponse {
  intent: string;
  confidence: number;
  sentiment: string;
  language: string;
  entities: ExtractedEntities;
}

/**
 * Build the system prompt for the classifier
 */
function buildClassifierPrompt(
  intents: Array<{ code: string; label: string; examples: string[] }>,
  businessContext?: string
): string {
  const intentDescriptions = intents
    .map(i => {
      const examples = i.examples.length > 0 ? ` (e.g., "${i.examples.slice(0, 2).join('", "')}")` : '';
      return `- "${i.code}": ${i.label}${examples}`;
    })
    .join('\n');

  return `You are a message intent classifier for a home services business${businessContext ? ` (${businessContext})` : ''}.

Analyze the customer message and respond with JSON in this exact format:
{
  "intent": "intent_code",
  "confidence": 0-100,
  "sentiment": "positive|neutral|negative|angry",
  "language": "en|es|etc",
  "entities": {
    "name": "extracted name if present",
    "service": "service type if mentioned",
    "time": "time reference if mentioned",
    "date": "date reference if mentioned",
    "address": "address if mentioned",
    "phone": "phone if mentioned",
    "email": "email if mentioned"
  }
}

Available intents:
${intentDescriptions}

Rules:
1. Choose the MOST specific intent that matches
2. Confidence should reflect how certain you are (50=unsure, 90+=very confident)
3. If message mentions legal action, lawyers, or threats, sentiment MUST be "angry"
4. If message mentions emergency keywords (burst pipe, flooding, gas leak, fire), intent should be "emergency"
5. Extract any named entities mentioned in the message
6. Only include entities that are actually present
7. If the message is unclear or could be multiple intents, choose the most likely and lower confidence`;
}

/**
 * Check for TCPA compliance keywords (no AI needed)
 */
function checkComplianceKeywords(message: string): IntentClassificationResult | null {
  const normalized = message.trim().toUpperCase();

  if ((COMPLIANCE_KEYWORDS.OPT_OUT as readonly string[]).includes(normalized)) {
    return {
      intent: 'opt_out',
      confidence: 100,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: true,
      compliance_type: 'opt_out',
    };
  }

  if ((COMPLIANCE_KEYWORDS.HELP as readonly string[]).includes(normalized)) {
    return {
      intent: 'help',
      confidence: 100,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: true,
      compliance_type: 'help',
    };
  }

  if ((COMPLIANCE_KEYWORDS.OPT_IN as readonly string[]).includes(normalized)) {
    return {
      intent: 'opt_in',
      confidence: 100,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: true,
      compliance_type: 'opt_in',
    };
  }

  return null;
}

/**
 * Validate sentiment string
 */
function validateSentiment(sentiment?: string): SentimentType {
  const valid: SentimentType[] = ['positive', 'neutral', 'negative', 'angry'];
  if (sentiment && valid.includes(sentiment as SentimentType)) {
    return sentiment as SentimentType;
  }
  return 'neutral';
}

/**
 * Fallback classification using keyword matching
 * Used when OpenAI is unavailable
 */
function fallbackClassification(
  message: string,
  intents: Array<{ code: string; label: string; examples: string[] }>
): IntentClassificationResult {
  const lowerMessage = message.toLowerCase();

  // Try to directly match provided intent examples or codes
  const directIntent = (() => {
    for (const i of intents) {
      const examples = Array.isArray(i.examples) ? i.examples : [];
      if (examples.some(ex => lowerMessage.includes(String(ex).toLowerCase()))) {
        return i.code;
      }
      if (lowerMessage.includes(String(i.code).toLowerCase())) {
        return i.code;
      }
    }
    return null;
  })();

  if (directIntent) {
    const angryHints = ['complaint', 'refund', 'bbb', 'lawyer', 'attorney', 'sue', 'report'];
    const isAngry = angryHints.some(h => lowerMessage.includes(h));
    return {
      intent: directIntent,
      confidence: 70,
      sentiment: isAngry ? 'angry' : 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Emergency keywords - highest priority
  const emergencyKeywords = ['emergency', 'urgent', 'burst', 'flooding', 'gas leak', 'fire', 'smoke', 'sparking'];
  if (emergencyKeywords.some(k => lowerMessage.includes(k))) {
    return {
      intent: 'emergency',
      confidence: 80,
      sentiment: 'negative',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Angry keywords
  const angryKeywords = ['terrible', 'awful', 'horrible', 'sue', 'lawyer', 'attorney', 'bbb', 'report', 'refund'];
  const hasAngryKeywords = angryKeywords.some(k => lowerMessage.includes(k));

  // Pricing keywords
  const pricingKeywords = ['price', 'cost', 'how much', 'charge', 'quote', 'estimate', 'rate'];
  if (pricingKeywords.some(k => lowerMessage.includes(k))) {
    return {
      intent: 'pricing',
      confidence: 70,
      sentiment: hasAngryKeywords ? 'angry' : 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Schedule keywords
  const scheduleKeywords = ['schedule', 'book', 'appointment', 'available', 'when can'];
  if (scheduleKeywords.some(k => lowerMessage.includes(k))) {
    return {
      intent: 'schedule',
      confidence: 70,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Complaint/refund
  if (hasAngryKeywords) {
    if (lowerMessage.includes('refund') || lowerMessage.includes('money back')) {
      return {
        intent: 'refund',
        confidence: 75,
        sentiment: 'angry',
        language: 'en',
        entities: {},
        is_compliance: false,
      };
    }
    return {
      intent: 'complaint',
      confidence: 70,
      sentiment: 'angry',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Wrong number
  if (lowerMessage.includes('wrong number') || lowerMessage.includes('sorry, wrong')) {
    return {
      intent: 'wrong_number',
      confidence: 85,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Bot check
  if (lowerMessage.includes('are you a bot') || lowerMessage.includes('real person') || lowerMessage.includes('talking to ai')) {
    return {
      intent: 'bot_check',
      confidence: 85,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    };
  }

  // Default: new lead
  return {
    intent: 'new_lead',
    confidence: 50,
    sentiment: 'neutral',
    language: 'en',
    entities: {},
    is_compliance: false,
  };
}

/**
 * Extract customer name from message if present
 */
export function extractCustomerName(message: string): string | null {
  // Common patterns for name introduction
  const patterns = [
    /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+)(?:\s+here|\s+calling|\s+texting)/i,
    /(?:^|\s)(?:hi|hey|hello),?\s*(?:i'm|this is|my name is)\s+([A-Z][a-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Detect urgency level from message
 */
export function detectUrgency(message: string): 'emergency' | 'high' | 'medium' | 'low' {
  const lowerMessage = message.toLowerCase();

  // Emergency indicators
  const emergencyKeywords = ['emergency', 'urgent', 'asap', 'burst', 'flooding', 'gas leak', 'fire', 'smoke', 'sparking', 'no heat', 'no ac', 'no water'];
  if (emergencyKeywords.some(k => lowerMessage.includes(k))) {
    return 'emergency';
  }

  // High urgency
  const highKeywords = ['today', 'tonight', 'right now', 'immediately', 'as soon as possible'];
  if (highKeywords.some(k => lowerMessage.includes(k))) {
    return 'high';
  }

  // Low urgency indicators
  const lowKeywords = ['no rush', 'whenever', 'not urgent', 'when you can', 'no hurry', 'quote', 'estimate'];
  if (lowKeywords.some(k => lowerMessage.includes(k))) {
    return 'low';
  }

  return 'medium';
}
