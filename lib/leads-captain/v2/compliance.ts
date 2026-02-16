// =====================================================
// Leads Captain v2.0 TCPA Compliance Handler
// Spec v1.1 Compliant - Opt-out Logging & Opt-back-in Safety
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { COMPLIANCE_KEYWORDS } from '@/types/leads-captain';
import { jobLogger } from '@/lib/logger';

// =====================================================
// Spec v1.1 Constants - LOCKED (cannot be modified by business)
// =====================================================

/** Opt-out keywords per spec Section 10 */
const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'] as const;

/** Opt-in keywords per spec Section 10.2 */
const OPT_IN_KEYWORDS = ['START', 'UNSTOP', 'SUBSCRIBE'] as const;

/** Check if a message contains an opt-out keyword (case-insensitive, partial match) */
function containsOptOutKeyword(message: string): string | null {
  const normalized = message.toUpperCase().trim();
  for (const keyword of OPT_OUT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

/** Check if a message contains an opt-in keyword (case-insensitive, partial match) */
function containsOptInKeyword(message: string): string | null {
  const normalized = message.toUpperCase().trim();
  for (const keyword of OPT_IN_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

export interface ComplianceResult {
  is_compliance_message: boolean;
  compliance_type: 'opt_out' | 'help' | 'opt_in' | null;
  response_required: boolean;
  response_text: string | null;
  should_block_further_processing: boolean;
  /** For opt-in: indicates AI will resume on NEXT message, not this one */
  opt_back_in_pending?: boolean;
  /** The keyword that matched (for audit logging) */
  keyword_matched?: string;
}

/**
 * Check if message is a compliance keyword and handle appropriately
 *
 * Spec v1.1 Updates:
 * - Uses partial match for opt-out keywords (case-insensitive)
 * - Logs all opt-out actions to opt_out_log for TCPA compliance
 * - Opt-back-in has safety delay (AI resumes on NEXT message, not immediately)
 */
export async function handleCompliance(
  message: string,
  customerPhone: string,
  configId: string,
  businessName: string,
  messageSid?: string
): Promise<ComplianceResult> {
  // Spec v1.1: Use partial match for keywords (case-insensitive)
  const optOutKeyword = containsOptOutKeyword(message);
  const optInKeyword = containsOptInKeyword(message);

  // Check OPT_OUT keywords (with partial match per spec)
  if (optOutKeyword) {
    await handleOptOut(customerPhone, configId, optOutKeyword, messageSid);
    return {
      is_compliance_message: true,
      compliance_type: 'opt_out',
      response_required: true,
      response_text: `You've been unsubscribed from ${businessName} messages. Reply START to resubscribe. Have a great day!`,
      should_block_further_processing: true,
      keyword_matched: optOutKeyword,
    };
  }

  // Check HELP keywords (exact match is fine for HELP)
  const normalizedMessage = message.trim().toUpperCase();
  if ((COMPLIANCE_KEYWORDS.HELP as readonly string[]).includes(normalizedMessage)) {
    return {
      is_compliance_message: true,
      compliance_type: 'help',
      response_required: true,
      response_text: `${businessName} messaging service. Reply STOP to opt out. For support, visit tradescaptain.com/help`,
      should_block_further_processing: true,
    };
  }

  // Check OPT_IN keywords (with partial match per spec)
  // Spec v1.1: Opt-back-in safety - AI resumes on NEXT message, not this one
  if (optInKeyword) {
    const result = await handleOptIn(customerPhone, configId, optInKeyword, messageSid);
    return {
      is_compliance_message: true,
      compliance_type: 'opt_in',
      response_required: true,
      response_text: `You're resubscribed to ${businessName} messages! We'll text you when you miss a call.`,
      should_block_further_processing: true, // Block THIS message - AI resumes on NEXT
      opt_back_in_pending: result.optBackInPending,
      keyword_matched: optInKeyword,
    };
  }

  return {
    is_compliance_message: false,
    compliance_type: null,
    response_required: false,
    response_text: null,
    should_block_further_processing: false,
  };
}

/**
 * Handle opt-out request
 *
 * Spec v1.1 Updates:
 * - Logs to opt_out_log table for TCPA compliance audit
 * - Updates conversation state to OPTED_OUT
 */
async function handleOptOut(
  customerPhone: string,
  configId: string,
  keyword: string,
  messageSid?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get business_id from config
  const { data: config } = await supabase
    .from('leads_captain_config')
    .select('business_id')
    .eq('id', configId)
    .single();

  if (!config) return;

  // Add to suppression list
  await supabase.from('sms_suppression_list').upsert(
    {
      business_id: config.business_id,
      phone_number: customerPhone,
      reason: 'opt_out',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,phone_number' }
  );

  // Get customer_id if exists
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', config.business_id)
    .eq('phone', customerPhone)
    .single();

  // TCPA COMPLIANCE: Log opt-out to audit table
  await supabase.from('opt_out_log').insert({
    business_id: config.business_id,
    phone_number: customerPhone,
    action: 'opt_out',
    keyword_used: keyword,
    message_sid: messageSid || null,
    customer_id: customer?.id || null,
  });

  // Mark any open v2 conversations as opted out with new state
  await supabase
    .from('leads_captain_conversations_v2')
    .update({
      opted_out: true,
      status: 'closed',
      conversation_state: 'OPTED_OUT',
      state_changed_at: new Date().toISOString(),
      state_change_reason: `Customer opted out via keyword: ${keyword}`,
      closed_at: new Date().toISOString(),
    })
    .eq('config_id', configId)
    .eq('customer_phone', customerPhone)
    .in('status', ['active', 'human_takeover']);

  // Log to state transition log
  const { data: conversations } = await supabase
    .from('leads_captain_conversations_v2')
    .select('id, conversation_state')
    .eq('config_id', configId)
    .eq('customer_phone', customerPhone)
    .eq('conversation_state', 'OPTED_OUT');

  for (const conv of conversations || []) {
    await supabase.from('conversation_state_log').insert({
      conversation_id: conv.id,
      from_state: null, // Unknown previous state
      to_state: 'OPTED_OUT',
      reason: `Customer sent opt-out keyword: ${keyword}`,
      triggered_by: 'customer',
    });
  }

  // Log audit (existing audit log)
  await supabase.from('leads_captain_audit_log').insert({
    config_id: configId,
    action: 'opt_out',
    actor: 'system',
    details: { phone: customerPhone, keyword, message_sid: messageSid },
  });

  jobLogger.info({
    msg: 'Customer opted out',
    businessId: config.business_id,
    phone: customerPhone,
    keyword,
  });
}

/**
 * Handle opt-in request
 *
 * Spec v1.1 Updates:
 * - Logs to opt_out_log table for TCPA compliance audit
 * - Sets opt_back_in_pending flag - AI resumes on NEXT message, not immediately
 *   This is a SAFETY REQUIREMENT per spec Section 10.2
 */
async function handleOptIn(
  customerPhone: string,
  configId: string,
  keyword: string,
  messageSid?: string
): Promise<{ optBackInPending: boolean }> {
  const supabase = createAdminClient();

  // Get business_id from config
  const { data: config } = await supabase
    .from('leads_captain_config')
    .select('business_id')
    .eq('id', configId)
    .single();

  if (!config) return { optBackInPending: false };

  // Remove from suppression list
  await supabase
    .from('sms_suppression_list')
    .update({ is_active: false })
    .eq('business_id', config.business_id)
    .eq('phone_number', customerPhone);

  // Get customer_id if exists
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', config.business_id)
    .eq('phone', customerPhone)
    .single();

  // TCPA COMPLIANCE: Log opt-back-in to audit table
  await supabase.from('opt_out_log').insert({
    business_id: config.business_id,
    phone_number: customerPhone,
    action: 'opt_back_in',
    keyword_used: keyword,
    message_sid: messageSid || null,
    customer_id: customer?.id || null,
  });

  // Update any conversations - set opt_back_in_pending
  // AI will resume on NEXT message, not this START message
  await supabase
    .from('leads_captain_conversations_v2')
    .update({
      opted_out: false,
      opt_back_in_pending: true, // SAFETY: AI resumes on NEXT message
    })
    .eq('config_id', configId)
    .eq('customer_phone', customerPhone);

  // Log audit (existing audit log)
  await supabase.from('leads_captain_audit_log').insert({
    config_id: configId,
    action: 'opt_in',
    actor: 'system',
    details: {
      phone: customerPhone,
      keyword,
      message_sid: messageSid,
      opt_back_in_pending: true,
    },
  });

  jobLogger.info({
    msg: 'Customer opted back in (pending - AI resumes on next message)',
    businessId: config.business_id,
    phone: customerPhone,
    keyword,
  });

  return { optBackInPending: true };
}

/**
 * Check if a phone number is opted out
 */
export async function isOptedOut(
  businessId: string,
  customerPhone: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('sms_suppression_list')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone_number', customerPhone)
    .eq('is_active', true)
    .single();

  return !!data;
}

/**
 * Check if conversation has pending opt-back-in
 * (AI should resume on THIS message if true)
 */
export async function checkOptBackInPending(
  conversationId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('leads_captain_conversations_v2')
    .select('opt_back_in_pending')
    .eq('id', conversationId)
    .single();

  return data?.opt_back_in_pending || false;
}

/**
 * Clear opt-back-in pending flag and transition to QUALIFYING
 * Called when processing a message after opt-back-in
 */
export async function processOptBackInResume(
  conversationId: string
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  // Clear pending flag and transition to QUALIFYING
  const { error } = await supabase
    .from('leads_captain_conversations_v2')
    .update({
      opt_back_in_pending: false,
      conversation_state: 'QUALIFYING',
      state_changed_at: new Date().toISOString(),
      state_change_reason: 'Customer resumed conversation after opt-back-in',
    })
    .eq('id', conversationId);

  if (error) {
    jobLogger.error({
      msg: 'Failed to process opt-back-in resume',
      conversationId,
      error: error.message,
    });
    return { success: false };
  }

  // Log state transition
  await supabase.from('conversation_state_log').insert({
    conversation_id: conversationId,
    from_state: 'OPTED_OUT',
    to_state: 'QUALIFYING',
    reason: 'Customer resumed conversation after opt-back-in',
    triggered_by: 'customer',
  });

  return { success: true };
}

/**
 * Send a compliance response via Twilio
 */
export async function sendComplianceResponse(
  to: string,
  from: string,
  message: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    // Dynamic import to avoid issues if twilio not configured
    const { twilioClient } = await import('@/lib/twilio/client');

    const result = await twilioClient.messages.create({
      to,
      from,
      body: message,
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    jobLogger.error({
      msg: 'Failed to send compliance response',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check message for spam indicators
 */
export function isLikelySpam(message: string): boolean {
  const spamPatterns = [
    /\bseo\b/i,
    /\bmarketing services\b/i,
    /\bboost your\b/i,
    /\bgrow your business\b/i,
    /\blead generation\b/i,
    /\bfree consultation\b/i,
    /\bclick here\b/i,
    /\bact now\b/i,
    /\blimited time\b/i,
    /bit\.ly/i,
    /tinyurl/i,
  ];

  return spamPatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitize message for safe processing
 * Removes potential injection attempts and normalizes content
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 1600); // Max SMS length (multiple segments)
}
