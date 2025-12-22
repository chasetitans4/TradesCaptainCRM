// =====================================================
// AI SMS AUTO-RESPONDER (OpenAI GPT-4)
// =====================================================

import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { sendSMS, flagForHumanAttention, formatPhoneDisplay } from './sms';

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. AI SMS features are disabled.');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Max AI responses before handoff to human
const MAX_AI_RESPONSES = 10;

// Trigger phrases for human handoff
const HUMAN_HANDOFF_TRIGGERS = [
  'talk to a person',
  'speak to someone',
  'real person',
  'human',
  'representative',
  'manager',
  'owner',
  'speak with',
  'talk with',
  'actual person',
  'not a bot',
  'real human',
];

interface BusinessContext {
  id: string;
  name: string;
  owner_name: string;
  trade_type: string | null;
  phone: string;
  twilio_phone_number: string;
  business_hours: any;
  ai_sms_knowledge_base: string | null;
  ai_sms_tone: string;
  timezone: string;
}

/**
 * Check if message is requesting human handoff
 */
export function isHumanHandoffRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return HUMAN_HANDOFF_TRIGGERS.some((trigger) => lower.includes(trigger));
}

/**
 * Check if AI should respond based on quiet hours
 */
export async function shouldAutoRespond(
  businessId: string,
  conversationId: string
): Promise<{ canRespond: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // Get business settings
  const { data: business } = await supabase
    .from('businesses')
    .select('ai_sms_enabled, ai_sms_quiet_start, ai_sms_quiet_end, timezone')
    .eq('id', businessId)
    .single();

  if (!business) {
    return { canRespond: false, reason: 'Business not found' };
  }

  // Check if AI SMS is enabled
  if (!business.ai_sms_enabled) {
    return { canRespond: false, reason: 'AI SMS disabled' };
  }

  // Check quiet hours
  const now = new Date();
  const timezone = business.timezone || 'America/Chicago';
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const currentHour = localTime.getHours();
  const currentMinute = localTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const [quietStartHour, quietStartMin] = (business.ai_sms_quiet_start || '20:00').split(':').map(Number);
  const [quietEndHour, quietEndMin] = (business.ai_sms_quiet_end || '08:00').split(':').map(Number);
  const quietStartMinutes = quietStartHour * 60 + quietStartMin;
  const quietEndMinutes = quietEndHour * 60 + quietEndMin;

  // Check if in quiet hours
  let inQuietHours = false;
  if (quietStartMinutes > quietEndMinutes) {
    // Quiet hours span midnight (e.g., 20:00 - 08:00)
    inQuietHours = currentTimeMinutes >= quietStartMinutes || currentTimeMinutes < quietEndMinutes;
  } else {
    // Quiet hours don't span midnight
    inQuietHours = currentTimeMinutes >= quietStartMinutes && currentTimeMinutes < quietEndMinutes;
  }

  if (inQuietHours) {
    // Check if customer initiated recently (2-hour exception)
    const { data: conversation } = await supabase
      .from('sms_conversations')
      .select('last_customer_message_at, is_customer_initiated')
      .eq('id', conversationId)
      .single();

    if (conversation?.is_customer_initiated) {
      const lastMessage = new Date(conversation.last_customer_message_at);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      if (lastMessage > twoHoursAgo) {
        // Customer initiated within 2 hours - can respond
        return { canRespond: true };
      }
    }

    return { canRespond: false, reason: 'quiet_hours' };
  }

  return { canRespond: true };
}

/**
 * Get business context for AI response
 */
async function getBusinessContext(businessId: string): Promise<BusinessContext | null> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      owner_name,
      trade_type,
      phone,
      twilio_phone_number,
      business_hours,
      ai_sms_knowledge_base,
      ai_sms_tone,
      timezone
    `)
    .eq('id', businessId)
    .single();

  return business;
}

/**
 * Get conversation history for context
 */
async function getConversationHistory(
  conversationId: string,
  limit: number = 10
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from('sms_messages')
    .select('direction, body')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!messages) return [];

  // Reverse to get chronological order and map to OpenAI format
  return messages.reverse().map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: msg.body,
  }));
}

/**
 * Generate AI response using GPT-4
 */
export async function generateAIResponse(
  message: string,
  conversationId: string,
  business: BusinessContext
): Promise<string> {
  const history = await getConversationHistory(conversationId);

  const businessHoursText = business.business_hours
    ? formatBusinessHours(business.business_hours)
    : 'Monday-Friday 8am-5pm';

  const systemPrompt = `You are an AI assistant for ${business.name}, a ${business.trade_type || 'service'} company.

Your role is to:
- Answer customer questions about services and availability
- Collect information for service requests (name, address, issue description)
- Schedule callbacks with the business owner
- Be helpful but never make promises about pricing or specific appointments

Business Information:
${business.ai_sms_knowledge_base || 'No specific information provided.'}

Business Hours: ${businessHoursText}

Guidelines:
- Keep responses concise (under 160 characters when possible for single SMS)
- Be ${business.ai_sms_tone || 'professional'} in tone
- If you can't help, offer to have someone call them back
- Never pretend to be human - if asked, acknowledge you're an AI assistant
- For emergencies, provide the business phone number for direct call: ${formatPhoneDisplay(business.twilio_phone_number)}

Current time: ${new Date().toLocaleString('en-US', { timeZone: business.timezone || 'America/Chicago' })}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I'm sorry, I couldn't process your message. Please call us directly.";
}

function formatBusinessHours(hours: any): string {
  if (typeof hours === 'string') return hours;

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const formatted: string[] = [];

  for (const day of days) {
    if (hours[day]) {
      formatted.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours[day].start}-${hours[day].end}`);
    }
  }

  return formatted.join(', ') || 'Contact us for hours';
}

/**
 * Handle incoming message and generate AI response if appropriate
 */
export async function handleIncomingWithAI(
  message: string,
  conversationId: string,
  businessId: string,
  customerPhone: string
): Promise<{ responded: boolean; response?: string; reason?: string }> {
  const supabase = createAdminClient();

  // Get business context
  const business = await getBusinessContext(businessId);
  if (!business) {
    return { responded: false, reason: 'Business not found' };
  }

  // Check for human handoff request
  if (isHumanHandoffRequest(message)) {
    await handleHumanHandoff(conversationId, business, customerPhone);
    return { responded: true, reason: 'human_handoff' };
  }

  // Check AI response limit
  const { data: conversation } = await supabase
    .from('sms_conversations')
    .select('ai_response_count')
    .eq('id', conversationId)
    .single();

  if (conversation && conversation.ai_response_count >= MAX_AI_RESPONSES) {
    await handleConversationLimitReached(conversationId, business, customerPhone);
    return { responded: true, reason: 'limit_reached' };
  }

  // Check if we should respond (quiet hours, etc.)
  const canRespondResult = await shouldAutoRespond(businessId, conversationId);
  if (!canRespondResult.canRespond) {
    return { responded: false, reason: canRespondResult.reason };
  }

  // Generate and send AI response
  try {
    const response = await generateAIResponse(message, conversationId, business);

    await sendSMS({
      to: customerPhone,
      body: response,
      businessId,
      conversationId,
      isAIResponse: true,
    });

    return { responded: true, response };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return { responded: false, reason: 'ai_error' };
  }
}

/**
 * Handle human handoff request
 */
async function handleHumanHandoff(
  conversationId: string,
  business: BusinessContext,
  customerPhone: string
): Promise<void> {
  const response = `Absolutely! I'm connecting you with ${business.owner_name}. They'll respond shortly. If it's urgent, you can call us directly at ${formatPhoneDisplay(business.twilio_phone_number)}.`;

  await sendSMS({
    to: customerPhone,
    body: response,
    businessId: business.id,
    conversationId,
    isAIResponse: true,
  });

  await flagForHumanAttention(conversationId, 'customer_requested');

  // TODO: Send push notification to owner/admins
}

/**
 * Handle conversation AI limit reached
 */
async function handleConversationLimitReached(
  conversationId: string,
  business: BusinessContext,
  customerPhone: string
): Promise<void> {
  const response = `I've shared your information with ${business.owner_name} and they'll reach out to you shortly. For immediate assistance, call us at ${formatPhoneDisplay(business.twilio_phone_number)}.`;

  await sendSMS({
    to: customerPhone,
    body: response,
    businessId: business.id,
    conversationId,
    isAIResponse: true,
  });

  await flagForHumanAttention(conversationId, 'ai_limit_reached');

  // TODO: Send push notification to owner/admins
}
