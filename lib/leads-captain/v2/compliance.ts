// =====================================================
// Leads Captain v2.0 TCPA Compliance Handler
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { COMPLIANCE_KEYWORDS } from '@/types/leads-captain';
import { jobLogger } from '@/lib/logger';

export interface ComplianceResult {
  is_compliance_message: boolean;
  compliance_type: 'opt_out' | 'help' | 'opt_in' | null;
  response_required: boolean;
  response_text: string | null;
  should_block_further_processing: boolean;
}

/**
 * Check if message is a compliance keyword and handle appropriately
 */
export async function handleCompliance(
  message: string,
  customerPhone: string,
  configId: string,
  businessName: string
): Promise<ComplianceResult> {
  const normalizedMessage = message.trim().toUpperCase();

  // Check OPT_OUT keywords
  if ((COMPLIANCE_KEYWORDS.OPT_OUT as readonly string[]).includes(normalizedMessage)) {
    await handleOptOut(customerPhone, configId);
    return {
      is_compliance_message: true,
      compliance_type: 'opt_out',
      response_required: true,
      response_text: `You've been unsubscribed from ${businessName} messages. Reply START to resubscribe. Have a great day!`,
      should_block_further_processing: true,
    };
  }

  // Check HELP keywords
  if ((COMPLIANCE_KEYWORDS.HELP as readonly string[]).includes(normalizedMessage)) {
    return {
      is_compliance_message: true,
      compliance_type: 'help',
      response_required: true,
      response_text: `${businessName} messaging service. Reply STOP to opt out. For support, visit tradescaptain.com/help`,
      should_block_further_processing: true,
    };
  }

  // Check OPT_IN keywords
  if ((COMPLIANCE_KEYWORDS.OPT_IN as readonly string[]).includes(normalizedMessage)) {
    await handleOptIn(customerPhone, configId);
    return {
      is_compliance_message: true,
      compliance_type: 'opt_in',
      response_required: true,
      response_text: `You're resubscribed to ${businessName} messages! We'll text you when you miss a call.`,
      should_block_further_processing: true,
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
 */
async function handleOptOut(customerPhone: string, configId: string): Promise<void> {
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

  // Mark any open v2 conversations as opted out
  await supabase
    .from('leads_captain_conversations_v2')
    .update({ opted_out: true, status: 'closed', closed_at: new Date().toISOString() })
    .eq('config_id', configId)
    .eq('customer_phone', customerPhone)
    .eq('status', 'active');

  // Log audit
  await supabase.from('leads_captain_audit_log').insert({
    config_id: configId,
    action: 'opt_out',
    actor: 'system',
    details: { phone: customerPhone },
  });
}

/**
 * Handle opt-in request
 */
async function handleOptIn(customerPhone: string, configId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get business_id from config
  const { data: config } = await supabase
    .from('leads_captain_config')
    .select('business_id')
    .eq('id', configId)
    .single();

  if (!config) return;

  // Remove from suppression list
  await supabase
    .from('sms_suppression_list')
    .update({ is_active: false })
    .eq('business_id', config.business_id)
    .eq('phone_number', customerPhone);

  // Update any conversations
  await supabase
    .from('leads_captain_conversations_v2')
    .update({ opted_out: false })
    .eq('config_id', configId)
    .eq('customer_phone', customerPhone);

  // Log audit
  await supabase.from('leads_captain_audit_log').insert({
    config_id: configId,
    action: 'opt_in',
    actor: 'system',
    details: { phone: customerPhone },
  });
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
