// =====================================================
// Trades Captain AI - Context Builder
// Build optimized context for prompt execution
// =====================================================

import {
  LeadsCaptainConfig,
  LeadsCaptainConversation,
  LeadsCaptainRule,
  LeadsCaptainMessage,
} from '@/types/leads-captain';
import {
  BusinessContext,
  SimpleMessage,
  ExtractedInfo,
  ConversationState,
  OrchestratorContext,
} from '@/types/leads-captain/prompt-types';

// =====================================================
// BUILD CONTEXT OPTIONS
// =====================================================

export interface BuildContextOptions {
  config: LeadsCaptainConfig;
  conversation: LeadsCaptainConversation;
  recentMessages: LeadsCaptainMessage[];
  currentMessage: string;
  isFirstMessage: boolean;
  isBusinessHours: boolean;
  isQuietHours: boolean;
  matchedRule: LeadsCaptainRule | null;
  detectedIntent: string;
  emergencyKeywords: string[];
}

// =====================================================
// MAIN CONTEXT BUILDER
// =====================================================

/**
 * Build optimized context for the conversation agent
 * Limits data to what's needed, reduces token usage
 */
export function buildContext(options: BuildContextOptions): OrchestratorContext {
  const {
    config,
    conversation,
    recentMessages,
    currentMessage,
    isFirstMessage,
    isBusinessHours,
    isQuietHours,
    matchedRule,
    detectedIntent,
    emergencyKeywords,
  } = options;

  // Build business context
  const businessContext = buildBusinessContext(config, isBusinessHours);

  // Convert messages to simple format (reduces tokens)
  const simpleMessages = convertToSimpleMessages(recentMessages, 10);

  // Extract info from conversation memory and messages
  const extractedInfo = buildExtractedInfo(conversation, recentMessages);

  // Determine conversation state
  const conversationState = determineConversationState(
    conversation,
    extractedInfo,
    isFirstMessage,
    detectedIntent
  );

  return {
    conversation,
    recentMessages: simpleMessages,
    businessContext,
    extractedInfo,
    matchedRule,
    ruleMatchResult: {
      matchedRule,
      matchReason: matchedRule ? `Rule "${matchedRule.name}" matched` : 'No rule matched',
      detectedIntent,
      intentConfidence: 0, // Would be filled by actual detection
      emergencyKeywords,
      allRulesEvaluated: [],
    },
    isEmergency: emergencyKeywords.length > 0,
    conversationState,
  };
}

// =====================================================
// BUSINESS CONTEXT
// =====================================================

/**
 * Build business context for the prompt
 */
function buildBusinessContext(
  config: LeadsCaptainConfig,
  isBusinessHours: boolean
): BusinessContext {
  // Get today's hours
  const today = new Date();
  const dayKey = getDayKey(today);
  const todayHours = config.business_hours?.[dayKey];

  let hoursToday = 'Hours not available';
  if (todayHours?.enabled && todayHours.open && todayHours.close) {
    hoursToday = `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
  } else if (todayHours && !todayHours.enabled) {
    hoursToday = 'Closed today';
  }

  return {
    name: config.business_name,
    type: config.business_type || 'general services',
    serviceArea: config.service_area || '',
    tone: config.tone,
    isOpen: isBusinessHours,
    hoursToday,
    bookingLink: config.booking_link || undefined,
    emergencyPhone: config.emergency_phone || undefined,
  };
}

/**
 * Get day key from date
 */
function getDayKey(date: Date): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  const days: Array<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = [
    'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
  ];
  return days[date.getDay()];
}

/**
 * Format time string
 */
function formatTime(time: string): string {
  if (!time) return '';

  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  if (minutes === 0) {
    return `${displayHours}${period}`;
  }
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

// =====================================================
// MESSAGE CONVERSION
// =====================================================

/**
 * Convert database messages to simple format
 * Limits to last N messages to reduce tokens
 */
function convertToSimpleMessages(
  messages: LeadsCaptainMessage[],
  limit: number
): SimpleMessage[] {
  // Take most recent messages
  const recentMessages = messages.slice(-limit);

  return recentMessages.map(msg => ({
    role: msg.direction === 'inbound' ? 'customer' : 'business',
    content: msg.content,
    timestamp: msg.created_at,
  }));
}

// =====================================================
// EXTRACTED INFO
// =====================================================

/**
 * Build extracted info from conversation memory and messages
 */
function buildExtractedInfo(
  conversation: LeadsCaptainConversation,
  messages: LeadsCaptainMessage[]
): ExtractedInfo {
  const memory = conversation.customer_memory || {};

  // Start with what we have in memory
  const info: ExtractedInfo = {
    serviceNeeded: null,
    address: memory.address || null,
    urgency: null,
    preferredTime: null,
    customerName: conversation.customer_name || memory.name || null,
  };

  // Look through recent messages for extracted entities
  for (const msg of messages) {
    if (msg.direction === 'inbound' && msg.extracted_entities) {
      const entities = msg.extracted_entities;

      if (entities.service && !info.serviceNeeded) {
        info.serviceNeeded = entities.service;
      }
      if (entities.address && !info.address) {
        info.address = entities.address;
      }
      if (entities.time && !info.preferredTime) {
        info.preferredTime = entities.time;
      }
      if (entities.name && !info.customerName) {
        info.customerName = entities.name;
      }
    }
  }

  // Try to infer service from intent
  if (!info.serviceNeeded && conversation.current_intent) {
    const intentToService: Record<string, string> = {
      'emergency': 'Emergency service',
      'new_lead': 'General inquiry',
      'schedule': 'Scheduling request',
      'pricing': 'Pricing inquiry',
    };
    info.serviceNeeded = intentToService[conversation.current_intent] || null;
  }

  return info;
}

// =====================================================
// CONVERSATION STATE
// =====================================================

/**
 * Determine conversation state based on context
 */
function determineConversationState(
  conversation: LeadsCaptainConversation,
  extractedInfo: ExtractedInfo,
  isFirstMessage: boolean,
  intent: string
): ConversationState {
  // First message
  if (isFirstMessage) {
    return 'initial';
  }

  // Emergency detected
  if (conversation.is_emergency || intent === 'emergency') {
    return 'emergency_detected';
  }

  // Human takeover requested
  if (conversation.requires_human || conversation.status === 'human_takeover') {
    return 'handoff_requested';
  }

  // Determine based on what info we have
  if (!extractedInfo.serviceNeeded) {
    return 'capturing_need';
  }

  if (!extractedInfo.address) {
    return 'capturing_address';
  }

  if (!extractedInfo.urgency) {
    return 'capturing_urgency';
  }

  if (!extractedInfo.preferredTime) {
    return 'capturing_time';
  }

  // All required info captured
  return 'info_complete';
}

// =====================================================
// TOKEN OPTIMIZATION
// =====================================================

/**
 * Estimate token count for context
 */
export function estimateTokenCount(context: OrchestratorContext): number {
  let tokens = 0;

  // Business context (~50-100 tokens)
  tokens += 100;

  // Messages (~20 tokens per message on average)
  tokens += context.recentMessages.length * 20;

  // Extracted info (~30 tokens)
  tokens += 30;

  // Matched rule (~50 tokens if present)
  if (context.matchedRule) {
    tokens += 50;
  }

  return tokens;
}

/**
 * Trim context to fit within token budget
 */
export function trimContextToFit(
  context: OrchestratorContext,
  maxTokens: number
): OrchestratorContext {
  const currentTokens = estimateTokenCount(context);

  if (currentTokens <= maxTokens) {
    return context;
  }

  // Start trimming messages (oldest first)
  const trimmedMessages = [...context.recentMessages];
  while (trimmedMessages.length > 2 && estimateTokenCount({
    ...context,
    recentMessages: trimmedMessages,
  }) > maxTokens) {
    trimmedMessages.shift();
  }

  return {
    ...context,
    recentMessages: trimmedMessages,
  };
}

// =====================================================
// CONTEXT VALIDATION
// =====================================================

/**
 * Validate that context has minimum required fields
 */
export function validateContext(context: OrchestratorContext): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!context.conversation) {
    errors.push('Missing conversation');
  }

  if (!context.businessContext) {
    errors.push('Missing business context');
  }

  if (!context.businessContext?.name) {
    errors.push('Missing business name');
  }

  if (!context.conversationState) {
    errors.push('Missing conversation state');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
