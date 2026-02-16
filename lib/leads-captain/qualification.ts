// =====================================================
// Leads Captain Qualification Service
// Spec v1.1 Compliant - Qualification Data Collection
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  QualificationData,
  QualificationStatus,
  LeadUrgency,
  REQUIRED_QUALIFICATION_FIELDS,
  isQualificationComplete,
} from '@/types/leads-captain';

/**
 * Qualification question templates
 * These are used when AI needs to ask for missing data
 */
const QUALIFICATION_QUESTIONS: Record<keyof QualificationData, string[]> = {
  name: [
    "Hi! I'm here to help. What's your name?",
    "Thanks for reaching out! Can I get your name?",
    "Hello! To help you better, may I have your name?",
  ],
  service_needed: [
    "What service can we help you with today?",
    "What type of service are you looking for?",
    "How can we assist you? What service do you need?",
  ],
  urgency: [
    "Is this urgent, or can it wait a bit? Just so we know how quickly to get someone to you.",
    "How soon do you need this taken care of?",
    "On a scale from 'when you get a chance' to 'emergency', where does this fall?",
  ],
  address: [
    "What's the address for the service?",
    "Where would you like us to come?",
    "Can you share the service address?",
  ],
  availability: [
    "When works best for you?",
    "What times are you usually available?",
    "Do you have a preferred day or time for the appointment?",
  ],
  photos_offered: [
    "Would you like to send a photo of the issue? It can help us give a better estimate.",
    "A photo would be helpful if you have one - feel free to send it!",
  ],
};

/**
 * Keywords that indicate urgency levels
 */
const URGENCY_KEYWORDS: Record<LeadUrgency, string[]> = {
  emergency: [
    'emergency',
    'urgent',
    'asap',
    'right now',
    'immediately',
    'flooding',
    'leak',
    'no heat',
    'no ac',
    'no power',
    'gas smell',
    'dangerous',
    'fire',
    'burst',
    'broken',
    'not working at all',
  ],
  urgent: [
    'soon',
    'today',
    'tonight',
    'this morning',
    'this afternoon',
    'as soon as possible',
    'really need',
    'important',
    'quickly',
  ],
  soon: [
    'this week',
    'few days',
    'couple days',
    'next few days',
    'when you can',
    'at your convenience',
    'soon',
  ],
  routine: [
    'whenever',
    'no rush',
    'not urgent',
    'when available',
    'take your time',
    'maintenance',
    'checkup',
    'inspection',
  ],
};

/**
 * Check qualification status for a conversation
 *
 * @param conversationId - The conversation to check
 * @returns QualificationStatus with completion info and next question
 */
export async function checkQualificationStatus(
  conversationId: string
): Promise<QualificationStatus> {
  const supabase = createAdminClient();

  const { data: conversation, error } = await supabase
    .from('leads_captain_conversations_v2')
    .select('qualification_data, config_id')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    jobLogger.error({
      msg: 'Failed to fetch conversation for qualification check',
      conversationId,
      error: error?.message,
    });
    return {
      isComplete: false,
      missingRequired: [...REQUIRED_QUALIFICATION_FIELDS],
      nextQuestion: getNextQualificationQuestion('name'),
      data: {},
    };
  }

  const data = (conversation.qualification_data || {}) as QualificationData;
  const missingRequired = getMissingRequiredFields(data);
  const isComplete = missingRequired.length === 0;

  return {
    isComplete,
    missingRequired,
    nextQuestion: missingRequired.length > 0 ? getNextQualificationQuestion(missingRequired[0]) : null,
    data,
  };
}

/**
 * Get missing required fields from qualification data
 */
export function getMissingRequiredFields(data: QualificationData): (keyof QualificationData)[] {
  return REQUIRED_QUALIFICATION_FIELDS.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  );
}

/**
 * Get the next qualification question for a missing field
 *
 * @param field - The field to ask about
 * @param businessName - Optional business name for personalization
 * @param serviceCategories - Optional service categories for context
 */
export function getNextQualificationQuestion(
  field: keyof QualificationData,
  businessName?: string,
  serviceCategories?: string[]
): string {
  const questions = QUALIFICATION_QUESTIONS[field];
  if (!questions || questions.length === 0) {
    return `Could you tell me about your ${String(field).replace(/_/g, ' ')}?`;
  }

  // Pick a random question for variety
  const question = questions[Math.floor(Math.random() * questions.length)];

  // Add service category context if available
  if (field === 'service_needed' && serviceCategories && serviceCategories.length > 0) {
    const categories = serviceCategories.slice(0, 5).join(', ');
    return `${question} We offer: ${categories}.`;
  }

  return question;
}

/**
 * Update qualification data for a conversation
 *
 * @param conversationId - The conversation to update
 * @param updates - Partial qualification data to merge
 */
export async function updateQualificationData(
  conversationId: string,
  updates: Partial<QualificationData>
): Promise<{
  success: boolean;
  isComplete: boolean;
  data: QualificationData;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Get current data
  const { data: conversation, error: fetchError } = await supabase
    .from('leads_captain_conversations_v2')
    .select('qualification_data, urgency')
    .eq('id', conversationId)
    .single();

  if (fetchError || !conversation) {
    return {
      success: false,
      isComplete: false,
      data: {},
      error: `Conversation not found: ${conversationId}`,
    };
  }

  const currentData = (conversation.qualification_data || {}) as QualificationData;
  const mergedData: QualificationData = {
    ...currentData,
    ...updates,
  };

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    qualification_data: mergedData,
  };

  // If urgency was updated, also update the urgency column
  if (updates.urgency) {
    updatePayload.urgency = updates.urgency;
  }

  // Check if now complete
  const isComplete = isQualificationComplete(mergedData);
  if (isComplete) {
    updatePayload.qualification_complete = true;
  }

  const { error: updateError } = await supabase
    .from('leads_captain_conversations_v2')
    .update(updatePayload)
    .eq('id', conversationId);

  if (updateError) {
    return {
      success: false,
      isComplete: false,
      data: currentData,
      error: updateError.message,
    };
  }

  return {
    success: true,
    isComplete,
    data: mergedData,
  };
}

/**
 * Extract qualification data from a customer message
 *
 * @param message - The customer's message
 * @param existingData - Existing qualification data
 * @returns Extracted data updates
 */
export function extractQualificationData(
  message: string,
  existingData: QualificationData = {}
): Partial<QualificationData> {
  const extracted: Partial<QualificationData> = {};
  const normalizedMessage = message.toLowerCase();

  // Extract name if not already known
  if (!existingData.name) {
    const name = extractName(message);
    if (name) {
      extracted.name = name;
    }
  }

  // Extract urgency from keywords
  if (!existingData.urgency) {
    const urgency = detectUrgency(normalizedMessage);
    if (urgency) {
      extracted.urgency = urgency;
    }
  }

  // Detect if customer is offering photos
  if (!existingData.photos_offered) {
    const photosOffered = detectPhotoOffer(normalizedMessage);
    if (photosOffered !== null) {
      extracted.photos_offered = photosOffered;
    }
  }

  return extracted;
}

/**
 * Extract name from message using common patterns
 */
function extractName(message: string): string | null {
  // Pattern 1: "I'm [Name]" or "I am [Name]"
  const imPattern = /(?:i'?m|i am|this is|my name is|name'?s?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const imMatch = message.match(imPattern);
  if (imMatch) {
    return imMatch[1].trim();
  }

  // Pattern 2: Just a capitalized name as the whole message (or most of it)
  const words = message.trim().split(/\s+/);
  if (words.length <= 3) {
    const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/;
    const potentialName = words.filter(w => /^[A-Z][a-z]+$/.test(w)).join(' ');
    if (potentialName && namePattern.test(potentialName)) {
      return potentialName;
    }
  }

  // Pattern 3: "- [Name]" or "Thanks, [Name]" signature
  const signaturePattern = /(?:^|\n)[-–—]\s*([A-Z][a-z]+)|(?:thanks|regards|best),?\s+([A-Z][a-z]+)/i;
  const sigMatch = message.match(signaturePattern);
  if (sigMatch) {
    return (sigMatch[1] || sigMatch[2]).trim();
  }

  return null;
}

/**
 * Detect urgency level from message content
 */
export function detectUrgency(message: string): LeadUrgency | null {
  const normalizedMessage = message.toLowerCase();

  // Check for emergency first (highest priority)
  for (const keyword of URGENCY_KEYWORDS.emergency) {
    if (normalizedMessage.includes(keyword)) {
      return 'emergency';
    }
  }

  // Then check urgent
  for (const keyword of URGENCY_KEYWORDS.urgent) {
    if (normalizedMessage.includes(keyword)) {
      return 'urgent';
    }
  }

  // Then soon
  for (const keyword of URGENCY_KEYWORDS.soon) {
    if (normalizedMessage.includes(keyword)) {
      return 'soon';
    }
  }

  // Finally routine
  for (const keyword of URGENCY_KEYWORDS.routine) {
    if (normalizedMessage.includes(keyword)) {
      return 'routine';
    }
  }

  return null;
}

/**
 * Detect if customer is offering or mentioning photos
 */
function detectPhotoOffer(message: string): boolean | null {
  const photoKeywords = [
    'photo',
    'picture',
    'image',
    'pic',
    'send you a',
    'here\'s a',
    'attached',
    'mms',
  ];

  for (const keyword of photoKeywords) {
    if (message.includes(keyword)) {
      return true;
    }
  }

  return null;
}

/**
 * Match service category from message
 *
 * @param message - Customer message
 * @param availableCategories - List of service categories the business offers
 * @returns Matched category or null
 */
export function matchServiceCategory(
  message: string,
  availableCategories: string[]
): string | null {
  const normalizedMessage = message.toLowerCase();

  for (const category of availableCategories) {
    const normalizedCategory = category.toLowerCase();

    // Direct match
    if (normalizedMessage.includes(normalizedCategory)) {
      return category;
    }

    // Word-by-word match for multi-word categories
    const categoryWords = normalizedCategory.split(/\s+/);
    if (categoryWords.length > 1) {
      const allWordsPresent = categoryWords.every(word =>
        normalizedMessage.includes(word)
      );
      if (allWordsPresent) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Validate qualification data against business configuration
 *
 * @param data - The qualification data to validate
 * @param validCategories - List of valid service categories
 * @returns Validation result
 */
export function validateQualificationData(
  data: QualificationData,
  validCategories?: string[]
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields are present and non-empty
  for (const field of REQUIRED_QUALIFICATION_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate urgency is a valid value
  if (data.urgency) {
    const validUrgencies: LeadUrgency[] = ['routine', 'soon', 'urgent', 'emergency'];
    if (!validUrgencies.includes(data.urgency)) {
      errors.push(`Invalid urgency value: ${data.urgency}`);
    }
  }

  // Validate service category if categories are provided
  if (validCategories && validCategories.length > 0 && data.service_needed) {
    const normalizedCategories = validCategories.map(c => c.toLowerCase());
    if (!normalizedCategories.includes(data.service_needed.toLowerCase())) {
      // This is a warning, not an error - the service might be valid but not in our list
      jobLogger.info({
        msg: 'Service category not in configured list',
        service_needed: data.service_needed,
        validCategories,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Build a qualification summary for handoff to human
 */
export function buildQualificationSummary(data: QualificationData): string {
  const parts: string[] = [];

  if (data.name) {
    parts.push(`Customer: ${data.name}`);
  }

  if (data.service_needed) {
    parts.push(`Service: ${data.service_needed}`);
  }

  if (data.urgency) {
    const urgencyLabels: Record<LeadUrgency, string> = {
      emergency: '🚨 EMERGENCY',
      urgent: '⚠️ Urgent',
      soon: '📅 Soon',
      routine: '📋 Routine',
    };
    parts.push(`Urgency: ${urgencyLabels[data.urgency]}`);
  }

  if (data.address) {
    parts.push(`Address: ${data.address}`);
  }

  if (data.availability) {
    parts.push(`Availability: ${data.availability}`);
  }

  if (data.photos_offered) {
    parts.push('📷 Photos available');
  }

  return parts.join('\n');
}
