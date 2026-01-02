// =====================================================
// LEADS CAPTAIN AI SMS SERVICE (v6.4.2)
// Missed call text-back with AI lead capture
// Formerly known as NeverMiss
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { twilioClient } from '@/lib/twilio/client';

// Re-export from submodules
export * from './types';
export * from './conversation-engine';
export * from './conversation-service';
export * from './notifications';

// =====================================================
// COMPLIANCE KEYWORDS (TCPA/CTIA)
// =====================================================

const STOP_KEYWORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'];
const HELP_KEYWORDS = ['help', 'info'];
const START_KEYWORDS = ['start', 'yes', 'unstop'];

/**
 * Handle compliance keywords (STOP/HELP/START)
 * Must be processed BEFORE AI or any other handling
 */
export async function handleComplianceKeywords(
  body: string,
  from: string,
  businessId: string,
  businessName: string
): Promise<{ handled: boolean; response?: string }> {
  const normalizedBody = body.trim().toLowerCase();
  const supabase = createAdminClient();

  // Check STOP
  if (STOP_KEYWORDS.includes(normalizedBody)) {
    // Add to suppression list
    await supabase.from('sms_suppression_list').upsert({
      business_id: businessId,
      phone_number: from,
      reason: 'opt_out',
      is_active: true,
      created_at: new Date().toISOString(),
    }, { onConflict: 'business_id,phone_number' });

    // Mark any open conversations as opted out
    await supabase
      .from('sms_conversations')
      .update({ status: 'opted_out' })
      .eq('business_id', businessId)
      .eq('phone', from)
      .eq('status', 'active');

    return {
      handled: true,
      response: "You've been unsubscribed from messages. Reply START to resubscribe.",
    };
  }

  // Check HELP
  if (HELP_KEYWORDS.includes(normalizedBody)) {
    return {
      handled: true,
      response: `${businessName} messaging. Reply STOP to opt out. Support: support@tradescaptain.com`,
    };
  }

  // Check START
  if (START_KEYWORDS.includes(normalizedBody)) {
    // Remove from suppression list
    await supabase
      .from('sms_suppression_list')
      .update({ is_active: false })
      .eq('business_id', businessId)
      .eq('phone_number', from);

    return {
      handled: true,
      response: "You're resubscribed! We'll text you when you miss a call.",
    };
  }

  return { handled: false };
}

/**
 * Check if phone is on suppression list
 */
export async function isPhoneSuppressed(
  businessId: string,
  phone: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('sms_suppression_list')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone_number', phone)
    .eq('is_active', true)
    .single();

  return !!data;
}

// =====================================================
// ABUSE DETECTION
// =====================================================

const ABUSE_RULES = {
  max_per_hour: 20,
  max_per_minute: 5,
  violence_patterns: [
    /\b(kill|die|shoot|bomb|attack|murder|threat)\b/i,
  ],
  harassment_patterns: [
    /\b(fuck you|piece of shit|stupid bitch)\b/i,
  ],
};

interface AbuseCheckResult {
  isAbusive: boolean;
  violations: string[];
  suspicions: string[];
  shouldBlock: boolean;
}

/**
 * Check message for abuse patterns
 */
export async function checkForAbuse(
  conversationId: string,
  message: string
): Promise<AbuseCheckResult> {
  const supabase = createAdminClient();
  const violations: string[] = [];
  const suspicions: string[] = [];

  // Rate limit check - messages in last hour
  const { count: hourCount } = await supabase
    .from('sms_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if ((hourCount || 0) > ABUSE_RULES.max_per_hour) {
    violations.push('rate_limit_hour');
  }

  // Messages in last minute
  const { count: minuteCount } = await supabase
    .from('sms_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString());

  if ((minuteCount || 0) > ABUSE_RULES.max_per_minute) {
    violations.push('rate_limit_minute');
  }

  // Violence check (immediate block)
  if (ABUSE_RULES.violence_patterns.some(p => p.test(message))) {
    violations.push('violence_threat');
  }

  // Harassment check
  if (ABUSE_RULES.harassment_patterns.some(p => p.test(message))) {
    violations.push('harassment');
  }

  // Emoji-only check
  if (isEmojiOnly(message)) {
    suspicions.push('emoji_only');
  }

  // URL check (suspicious, not blocking alone)
  if (/https?:\/\//i.test(message)) {
    suspicions.push('contains_url');
  }

  // Determine if should block
  const shouldBlock =
    violations.includes('violence_threat') ||
    violations.includes('harassment') ||
    violations.length >= 2 ||
    (violations.length >= 1 && suspicions.length >= 2);

  return {
    isAbusive: violations.length > 0,
    violations,
    suspicions,
    shouldBlock,
  };
}

function isEmojiOnly(message: string): boolean {
  if (!message || message.trim().length === 0) return false;

  // Remove known emoji ranges and whitespace
  const withoutEmojis = message
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/\s/g, '');

  return withoutEmojis.length === 0 && message.trim().length > 0 && message.trim().length < 20;
}

/**
 * Block a conversation for abuse
 */
export async function blockForAbuse(
  conversationId: string,
  businessId: string,
  phone: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  // Mark conversation as blocked
  await supabase
    .from('sms_conversations')
    .update({
      status: 'blocked',
      metadata: { blocked_reason: reason, blocked_at: new Date().toISOString() },
    })
    .eq('id', conversationId);

  // Add to suppression list
  await supabase.from('sms_suppression_list').upsert({
    business_id: businessId,
    phone_number: phone,
    reason: 'spam',
    is_active: true,
    created_at: new Date().toISOString(),
  }, { onConflict: 'business_id,phone_number' });
}

// =====================================================
// URGENCY DETECTION
// =====================================================

const SAFETY_KEYWORDS = [
  'gas smell', 'gas leak', 'smell gas', 'smells like gas',
  'flooding', 'flooded', 'burst pipe', 'pipe burst',
  'sparking', 'electrical fire', 'smoke', 'burning smell',
  'sewage', 'sewage backup', 'raw sewage',
  'carbon monoxide', 'co detector',
];

const NEGATION_WORDS = ['no', 'not', "don't", "doesn't", "isn't", "wasn't", 'without', 'never'];

interface UrgencyResult {
  level: 'emergency' | 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Detect urgency level from message content
 * Uses negation detection to avoid false positives
 */
export function detectUrgency(message: string): UrgencyResult {
  const lowerMessage = message.toLowerCase();

  // Check safety keywords with negation window
  for (const keyword of SAFETY_KEYWORDS) {
    const keywordIndex = lowerMessage.indexOf(keyword);

    if (keywordIndex !== -1) {
      // Check 30 chars before keyword for negation
      const prefix = lowerMessage.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      const hasNegation = NEGATION_WORDS.some(neg => prefix.includes(neg));

      if (hasNegation) {
        return { level: 'medium', reason: `mentioned ${keyword} (negated)` };
      } else {
        return { level: 'emergency', reason: keyword };
      }
    }
  }

  // Check contextual emergency (no heat/AC)
  if (/no (heat|heating|hot water)/i.test(lowerMessage)) {
    if (/not urgent|no rush|can wait|no hurry/i.test(lowerMessage)) {
      return { level: 'medium', reason: 'no heat (customer says not urgent)' };
    }
    if (isWinterMonth()) {
      return { level: 'emergency', reason: 'no heat in winter' };
    }
    return { level: 'high', reason: 'no heat' };
  }

  if (/no (ac|air conditioning|cooling)/i.test(lowerMessage)) {
    if (/not urgent|no rush|can wait/i.test(lowerMessage)) {
      return { level: 'medium', reason: 'no AC (customer says not urgent)' };
    }
    if (isSummerMonth()) {
      return { level: 'emergency', reason: 'no AC in summer' };
    }
    return { level: 'high', reason: 'no AC' };
  }

  // General urgency language
  if (/urgent|asap|emergency|right away|immediately/i.test(lowerMessage)) {
    return { level: 'high', reason: 'customer expressed urgency' };
  }

  // General negation caps at medium
  if (/not urgent|no rush|can wait|no hurry|whenever|flexible/i.test(lowerMessage)) {
    return { level: 'medium', reason: 'customer says not urgent' };
  }

  // Quote/estimate = low
  if (/quote|estimate|price|cost|how much/i.test(lowerMessage)) {
    return { level: 'low', reason: 'quote request' };
  }

  return { level: 'medium', reason: 'standard request' };
}

function isWinterMonth(): boolean {
  const month = new Date().getMonth();
  return month >= 10 || month <= 2; // Nov, Dec, Jan, Feb, Mar
}

function isSummerMonth(): boolean {
  const month = new Date().getMonth();
  return month >= 5 && month <= 8; // June, July, Aug, Sep
}

// =====================================================
// SMS USAGE TRACKING
// =====================================================

/**
 * Increment SMS usage and check soft caps
 * Uses plan_leads_captain_features table for SMS limits
 */
export async function incrementSMSUsage(
  businessId: string,
  type: 'sent' | 'received'
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get SMS limit from plan_leads_captain_features table
  const smsLimit = await getSMSLimit(businessId);
  const field = type === 'sent' ? 'sms_sent' : 'sms_received';

  // Upsert usage record
  await supabase.rpc('upsert_sms_usage', {
    p_business_id: businessId,
    p_period_start: periodStart.toISOString(),
    p_period_end: periodEnd.toISOString(),
    p_field: field,
    p_sms_limit: smsLimit || 700, // Default to 700 if not found
  });

  // Check soft caps (in background, don't block)
  checkSoftCaps(businessId).catch(err => {
    console.error('Error checking soft caps:', err);
  });
}

async function checkSoftCaps(businessId: string): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usage } = await supabase
    .from('sms_usage')
    .select('*')
    .eq('business_id', businessId)
    .eq('period_start', periodStart.toISOString())
    .single();

  if (!usage) return;

  const totalUsed = (usage.sms_sent || 0) + (usage.sms_received || 0);
  const percentUsed = totalUsed / usage.sms_limit;

  // Queue soft cap notification emails (handled by background job)
  if (percentUsed >= 0.8 && !usage.notified_80_percent) {
    await supabase
      .from('sms_usage')
      .update({ notified_80_percent: true })
      .eq('id', usage.id);
    // TODO: Queue email notification
  }

  if (percentUsed >= 1.0 && !usage.notified_100_percent) {
    await supabase
      .from('sms_usage')
      .update({ notified_100_percent: true })
      .eq('id', usage.id);
    // TODO: Queue email notification
  }

  if (percentUsed >= 1.5 && !usage.notified_150_percent) {
    await supabase
      .from('sms_usage')
      .update({ notified_150_percent: true })
      .eq('id', usage.id);
    // TODO: Trigger personal outreach
  }
}

// =====================================================
// PLAN FEATURE CHECKING (v5.9 - Uses plan_leads_captain_features table)
// =====================================================

interface PlanFeatures {
  includes_leads_captain: boolean;
  sms_included: number;
  can_book_calendar: boolean;
  includes_crm: boolean;
  includes_calendar: boolean;
}

/**
 * Get plan features from single source of truth table
 */
export async function getPlanFeatures(planType: string): Promise<PlanFeatures | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('plan_leads_captain_features')
    .select('*')
    .eq('plan_type', planType)
    .single();

  return data;
}

/**
 * Check if business has Leads Captain AI SMS enabled
 * Uses plan_leads_captain_features table as single source of truth
 */
export async function hasLeadsCaptainAccess(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('plan_type, ai_sms_enabled')
    .eq('id', businessId)
    .single();

  if (!business) return false;

  // Check plan_leads_captain_features table (single source of truth)
  const features = await getPlanFeatures(business.plan_type || '');

  // Must have Leads Captain in plan AND ai_sms_enabled flag
  return (features?.includes_leads_captain ?? false) && business.ai_sms_enabled;
}

// Backward compatibility alias
export const hasNeverMissAccess = hasLeadsCaptainAccess;

/**
 * Check if business can book calendar via Leads Captain
 * Uses plan_leads_captain_features table as single source of truth
 */
export async function canBookCalendar(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('plan_type')
    .eq('id', businessId)
    .single();

  if (!business) return false;

  // Check plan_leads_captain_features table
  const features = await getPlanFeatures(business.plan_type || '');

  return features?.can_book_calendar ?? false;
}

/**
 * Get SMS limit for business based on plan
 */
export async function getSMSLimit(businessId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('plan_type')
    .eq('id', businessId)
    .single();

  if (!business) return 0;

  const features = await getPlanFeatures(business.plan_type || '');

  return features?.sms_included ?? 0;
}

// =====================================================
// QUIET HOURS CHECK
// =====================================================

/**
 * Check if current time is within quiet hours for a business
 */
export async function isQuietHours(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('timezone, quiet_hours_start, quiet_hours_end')
    .eq('id', businessId)
    .single();

  if (!business?.quiet_hours_start || !business?.quiet_hours_end) {
    return false;
  }

  const tz = business.timezone || 'America/New_York';
  const now = new Date();

  // Get current time in business timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTime = formatter.format(now);

  const quietStart = business.quiet_hours_start;
  const quietEnd = business.quiet_hours_end;

  // Handle overnight quiet hours (e.g., 21:00 - 07:00)
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }

  return currentTime >= quietStart && currentTime < quietEnd;
}

// =====================================================
// EXPORTS
// =====================================================

export {
  STOP_KEYWORDS,
  HELP_KEYWORDS,
  START_KEYWORDS,
  SAFETY_KEYWORDS,
};

// =====================================================
// MAIN LEADS CAPTAIN CONVERSATION HANDLER
// =====================================================

import {
  generateAIResponse,
  generateGreeting,
  mergeExtractedInfo,
  isAfterHours,
  hasRequiredFields,
  hasExceededMaxMessages,
  hasTooManyUnansweredMessages,
} from './conversation-engine';

import {
  getBusinessSettings,
  findBusinessByPhone,
  findOrCreateConversation,
  saveMessage,
  updateConversation,
  createCapturedLead,
  logWebhookEvent,
  markEventProcessed,
  findCustomerByPhone,
  createJobFromLead,
} from './conversation-service';

import {
  notifyOwner,
  queueNotificationForMorning,
} from './notifications';

import type {
  ConversationMessage,
  TwilioInboundSmsPayload,
  TwilioMissedCallPayload,
} from './types';

/**
 * Handle a missed call - initiate Leads Captain conversation
 */
export async function handleMissedCall(
  payload: TwilioMissedCallPayload
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const { CallSid, From, To } = payload;

    // Find business by phone number
    const businessId = await findBusinessByPhone(To);
    if (!businessId) {
      return { success: false, error: 'Business not found for phone number' };
    }

    // Log webhook event for idempotency
    const { isNew } = await logWebhookEvent(
      businessId,
      CallSid,
      'missed_call',
      payload.CallStatus,
      undefined,
      undefined,
      payload as unknown as Record<string, unknown>
    );

    if (!isNew) {
      return { success: false, error: 'Event already processed' };
    }

    // Get business settings
    const settings = await getBusinessSettings(businessId);
    if (!settings) {
      return { success: false, error: 'Leads Captain settings not found' };
    }

    // Check if phone is suppressed
    const supabase = createAdminClient();
    const { data: suppressed } = await supabase
      .from('sms_suppression_list')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone_number', From)
      .eq('is_active', true)
      .single();

    if (suppressed) {
      return { success: false, error: 'Phone is suppressed' };
    }

    // Find or create conversation
    const { conversation, isNew: isNewConversation } = await findOrCreateConversation(
      businessId,
      From,
      To,
      settings
    );

    // If existing conversation, don't send a new greeting
    if (!isNewConversation && conversation.messages.length > 0) {
      await markEventProcessed(CallSid, 'missed_call', payload.CallStatus, 'existing_conversation');
      return { success: true, conversationId: conversation.id };
    }

    // Generate greeting
    const isAfterHrs = isAfterHours(settings);
    const greeting = generateGreeting(settings, isAfterHrs);

    // Send SMS via Twilio
    const message = await twilioClient.messages.create({
      body: greeting,
      to: From,
      from: To,
      statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/webhooks/twilio/status`
    });

    // Save the greeting message
    const savedMessage = await saveMessage(
      conversation,
      {
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        status: 'queued'
      },
      message.sid,
      To,
      From
    );

    // Update conversation state
    await updateConversation(conversation.id, {
      state: 'greeting_sent',
      messageCount: 1
    });

    // Track SMS usage
    await incrementSMSUsage(businessId, 'sent');

    await markEventProcessed(CallSid, 'missed_call', payload.CallStatus, 'greeting_sent');

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    console.error('Error handling missed call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle incoming SMS in Leads Captain conversation
 */
export async function handleLeadsCaptainInboundSMS(
  payload: TwilioInboundSmsPayload,
  businessId: string
): Promise<{ success: boolean; replySent: boolean; error?: string }> {
  try {
    const { MessageSid, From, To, Body } = payload;

    // Get business settings
    const settings = await getBusinessSettings(businessId);
    if (!settings) {
      return { success: false, replySent: false, error: 'Leads Captain settings not found' };
    }

    // Find or create conversation
    const { conversation } = await findOrCreateConversation(
      businessId,
      From,
      To,
      settings
    );

    // Look up existing customer
    const existingCustomer = await findCustomerByPhone(businessId, From);
    if (existingCustomer && !conversation.customerId) {
      conversation.customerId = existingCustomer.id;
      if (!conversation.extracted.customerName) {
        conversation.extracted.customerName = existingCustomer.name;
      }
    }

    // Save the incoming message
    const savedInboundMessage = await saveMessage(
      conversation,
      {
        role: 'customer',
        content: Body,
        timestamp: new Date()
      },
      MessageSid,
      From,
      To
    );

    // Add to conversation messages for context
    conversation.messages.push(savedInboundMessage);
    conversation.messageCount++;
    conversation.aiMessagesSinceResponse = 0;
    conversation.lastCustomerMessageAt = new Date();

    // Check if we've exceeded max messages
    if (hasExceededMaxMessages(conversation, settings.maxMessages)) {
      const maxReply = `I want to make sure I get you the help you need. It might be easier for ${settings.ownerName} to call you directly — expect to hear from them soon!`;

      // Send the max messages reply
      const maxMessage = await twilioClient.messages.create({
        body: maxReply,
        to: From,
        from: To,
        statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/webhooks/twilio/status`
      });

      await saveMessage(
        conversation,
        {
          role: 'assistant',
          content: maxReply,
          timestamp: new Date(),
          status: 'queued'
        },
        maxMessage.sid,
        To,
        From
      );

      // Update conversation and create lead
      await updateConversation(conversation.id, {
        state: 'completed',
        messageCount: conversation.messageCount + 1,
        lastCustomerMessageAt: conversation.lastCustomerMessageAt,
        completedAt: new Date()
      });

      // Create captured lead and notify owner
      const lead = await createCapturedLead(conversation, settings);
      await notifyOwner(lead, settings);

      await incrementSMSUsage(businessId, 'sent');

      return { success: true, replySent: true };
    }

    // Generate AI response
    const { response: aiResponse, success: aiSuccess, error: aiError } = await generateAIResponse(
      conversation,
      Body,
      settings
    );

    // Merge extracted info
    const mergedExtracted = mergeExtractedInfo(conversation.extracted, aiResponse.extracted);

    // Send SMS reply via Twilio
    const replyMessage = await twilioClient.messages.create({
      body: aiResponse.reply_text,
      to: From,
      from: To,
      statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/webhooks/twilio/status`
    });

    // Save the AI response
    await saveMessage(
      conversation,
      {
        role: 'assistant',
        content: aiResponse.reply_text,
        timestamp: new Date(),
        status: 'queued'
      },
      replyMessage.sid,
      To,
      From
    );

    // Track SMS usage
    await incrementSMSUsage(businessId, 'sent');

    // Determine if we should notify owner
    let shouldNotify = aiResponse.actions.notify_owner;
    const isEmergency = aiResponse.actions.notify_urgency === 'emergency';

    // Check if we have required fields captured (service + address)
    const hasRequired = hasRequiredFields(mergedExtracted);

    // Determine final state
    let finalState = aiResponse.state;
    if (hasRequired && !shouldNotify && aiResponse.actions.end_conversation) {
      finalState = 'lead_captured';
      shouldNotify = true;
    }

    // Update conversation
    await updateConversation(conversation.id, {
      state: finalState,
      extracted: mergedExtracted,
      messageCount: conversation.messageCount + 1,
      lastCustomerMessageAt: conversation.lastCustomerMessageAt,
      isEmergency: isEmergency || conversation.isEmergency,
      completedAt: aiResponse.actions.end_conversation ? new Date() : undefined
    });

    // Notify owner if needed
    if (shouldNotify && !conversation.ownerNotified) {
      // Update extracted in conversation for lead creation
      conversation.extracted = mergedExtracted;
      conversation.messages.push({
        id: 'temp',
        role: 'assistant',
        content: aiResponse.reply_text,
        timestamp: new Date()
      });

      const lead = await createCapturedLead(conversation, settings);

      // Check if after hours and non-emergency
      const isAfterHrs = isAfterHours(settings);
      if (isAfterHrs && !isEmergency && !settings.afterHoursNotify) {
        // Queue for morning
        await queueNotificationForMorning(lead, settings);
      } else {
        // Notify immediately
        const notifyResult = await notifyOwner(lead, settings);
        lead.ownerNotificationMethod = notifyResult.sent;
      }

      // Create job if CRM integration enabled
      if (settings.autoCreateJobs) {
        const jobId = await createJobFromLead(lead, settings);
        if (jobId) {
          await updateConversation(conversation.id, {
            extracted: { ...mergedExtracted }
          });
        }
      }

      // Mark as notified
      await updateConversation(conversation.id, {
        ownerNotified: true,
        ownerNotifiedAt: new Date()
      });
    }

    return { success: true, replySent: true };
  } catch (error) {
    console.error('Error handling Leads Captain inbound SMS:', error);
    return {
      success: false,
      replySent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Backward compatibility alias
export const handleNeverMissInboundSMS = handleLeadsCaptainInboundSMS;
