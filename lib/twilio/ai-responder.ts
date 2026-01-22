import 'openai/shims/node';
// =====================================================
// AI SMS AUTO-RESPONDER (OpenAI GPT-4o-mini)
// Simplified: OpenAI only, no Anthropic fallback needed
// =====================================================

import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { sendSMS, flagForHumanAttention, formatPhoneDisplay } from './sms';
import { aiLogger } from '@/lib/logger';
import { sendPushNotification } from '@/lib/notifications/push';
import { businessCache } from '@/lib/cache';

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
 * Check if customer has paused AI responses via portal
 */
async function isCustomerAIPaused(
  customerId: string | null,
  businessId: string
): Promise<boolean> {
  if (!customerId) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('customer_portal_access')
    .select('ai_paused')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .single();

  return data?.ai_paused ?? false;
}

/**
 * Check if AI should respond based on quiet hours and customer preferences
 */
export async function shouldAutoRespond(
  businessId: string,
  conversationId: string
): Promise<{ canRespond: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // Get business settings (use cache to reduce DB calls)
  const business = await businessCache.getOrSet(
    `ai_settings:${businessId}`,
    async () => {
      const { data } = await supabase
        .from('businesses')
        .select('ai_sms_enabled, ai_sms_quiet_start, ai_sms_quiet_end, timezone')
        .eq('id', businessId)
        .single();
      return data;
    },
    300 // 5 minutes TTL
  );

  if (!business) {
    return { canRespond: false, reason: 'Business not found' };
  }

  // Check if AI SMS is enabled
  if (!business.ai_sms_enabled) {
    return { canRespond: false, reason: 'AI SMS disabled' };
  }

  // Get conversation data ONCE (previously queried twice)
  const { data: conversation } = await supabase
    .from('sms_conversations')
    .select('customer_id, last_customer_message_at, is_customer_initiated')
    .eq('id', conversationId)
    .single();

  // Check if customer has paused AI via portal
  if (conversation?.customer_id) {
    const isPaused = await isCustomerAIPaused(conversation.customer_id, businessId);
    if (isPaused) {
      // Flag for human attention since customer wants manual responses
      await supabase
        .from('sms_conversations')
        .update({ needs_human_attention: true })
        .eq('id', conversationId);

      return { canRespond: false, reason: 'customer_paused_ai' };
    }
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
    // Use already-fetched conversation data (removed duplicate query)
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
 * Get business context for AI response (cached for 5 minutes)
 */
async function getBusinessContext(businessId: string): Promise<BusinessContext | null> {
  // Use cache to reduce database queries - business settings rarely change
  return businessCache.getOrSet(
    `ai_context:${businessId}`,
    async () => {
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
    },
    300 // 5 minutes TTL
  );
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

  try {
    // Using gpt-4o-mini for cost efficiency (~95% cheaper than gpt-4o)
    // SMS responses don't require the full capability of gpt-4o
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });
    const content = response.choices[0]?.message?.content;
    if (content && content.trim().length > 0) return content;
  } catch (error) {
    aiLogger.error({
      msg: 'OpenAI error in AI responder',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      conversationId,
      businessId: business.id,
    });
  }

  // Fallback message when OpenAI fails
  return "I'm sorry, I couldn't process your message. Please call us directly.";
}

async function extractStructuredData(
  message: string,
  conversationId: string,
  business: BusinessContext
): Promise<Record<string, any> | null> {
  const history = await getConversationHistory(conversationId, 6);
  const systemPrompt = `Extract fields from the customer message about ${business.name}. Return a JSON object with keys: name, address, issue, preferred_time, urgency, email, contact_method. Use null for missing values. Do not include explanations.`;
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
    max_tokens: 200,
    temperature: 0,
  });
  const content = response.choices[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return null;
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
    const extracted = await extractStructuredData(message, conversationId, business);

    await sendSMS({
      to: customerPhone,
      body: response,
      businessId,
      conversationId,
      isAIResponse: true,
      metadata: extracted ? { structured: extracted } : undefined,
    });

    return { responded: true, response };
  } catch (error) {
    aiLogger.error({
      msg: 'Error generating AI response',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      conversationId,
      businessId,
    });
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

  const supabase = createAdminClient();
  try {
    const { data: users } = await supabase
      .from('users')
      .select(`id, role, status, preferences:notification_preferences(message_notifications)`)
      .eq('business_id', business.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    for (const user of users || []) {
      const prefs = Array.isArray(user.preferences) ? user.preferences[0] : user.preferences;
      if (prefs?.message_notifications !== false) {
        await sendPushNotification({
          userId: user.id,
          businessId: business.id,
          title: 'SMS Handoff Requested',
          body: `Customer requested a human. Conversation ${conversationId}.`,
          actionType: 'open_messages',
          actionData: { conversationId },
        });
      }
    }
  } catch {}
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

  const supabase = createAdminClient();
  try {
    const { data: users } = await supabase
      .from('users')
      .select(`id, role, status, preferences:notification_preferences(message_notifications)`)
      .eq('business_id', business.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    for (const user of users || []) {
      const prefs = Array.isArray(user.preferences) ? user.preferences[0] : user.preferences;
      if (prefs?.message_notifications !== false) {
        await sendPushNotification({
          userId: user.id,
          businessId: business.id,
          title: 'AI Reached Limit',
          body: `Conversation requires human response. Conversation ${conversationId}.`,
          actionType: 'open_messages',
          actionData: { conversationId },
        });
      }
    }
  } catch {}
}
