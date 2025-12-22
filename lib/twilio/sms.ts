// =====================================================
// TWILIO SMS OPERATIONS
// =====================================================

import { twilioClient, messagingServiceSid, getWebhookUrl } from './client';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
export function formatPhoneE164(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's 10 digits, add US country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits starting with 1, add plus
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it already has a plus sign, just clean it up
  if (phone.startsWith('+')) {
    return `+${digits}`;
  }

  // Return as-is with plus sign
  return `+${digits}`;
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // Remove leading 1 if present
  const local = digits.startsWith('1') && digits.length === 11
    ? digits.substring(1)
    : digits;

  if (local.length === 10) {
    return `(${local.substring(0, 3)}) ${local.substring(3, 6)}-${local.substring(6)}`;
  }

  return phone;
}

interface SendSMSOptions {
  to: string;
  body: string;
  businessId: string;
  conversationId?: string;
  senderId?: string;
  isAIResponse?: boolean;
}

/**
 * Send an SMS message via Twilio and log to database
 */
export async function sendSMS(options: SendSMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  twilioSid?: string;
  error?: string;
}> {
  const { to, body, businessId, conversationId, senderId, isAIResponse = false } = options;

  const supabase = createAdminClient();

  try {
    // Get business phone number
    const { data: business } = await supabase
      .from('businesses')
      .select('twilio_phone_number')
      .eq('id', businessId)
      .single();

    if (!business?.twilio_phone_number) {
      throw new Error('Business has no phone number configured');
    }

    // Format the destination number
    const toFormatted = formatPhoneE164(to);

    // Send via Twilio
    const twilioMessage = await twilioClient.messages.create({
      to: toFormatted,
      from: business.twilio_phone_number,
      body,
      statusCallback: getWebhookUrl('/api/webhooks/twilio/status'),
      ...(messagingServiceSid ? { messagingServiceSid } : {}),
    });

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await getOrCreateConversation(toFormatted, businessId);
      convId = conversation.id;
    }

    // Log to database
    const { data: message, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        conversation_id: convId,
        direction: 'outbound',
        sender: isAIResponse ? 'ai' : 'staff',
        sender_user_id: senderId || null,
        body,
        status: 'sent',
        twilio_sid: twilioMessage.sid,
        is_ai_response: isAIResponse,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error logging SMS to database:', insertError);
    }

    // Update AI response count if it's an AI response
    if (isAIResponse && convId) {
      await supabase.rpc('increment_ai_response_count', { conv_id: convId });
    }

    return {
      success: true,
      messageId: message?.id,
      twilioSid: twilioMessage.sid,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);

    // Log the failure
    if (conversationId) {
      await supabase
        .from('sms_messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outbound',
          sender: isAIResponse ? 'ai' : 'staff',
          sender_user_id: senderId || null,
          body,
          status: 'failed',
          is_ai_response: isAIResponse,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get or create a conversation for a phone number
 */
export async function getOrCreateConversation(
  phone: string,
  businessId: string
): Promise<{ id: string; customer_id: string | null; isNew: boolean }> {
  const supabase = createAdminClient();
  const formattedPhone = formatPhoneE164(phone);

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('sms_conversations')
    .select('id, customer_id')
    .eq('business_id', businessId)
    .eq('phone', formattedPhone)
    .eq('status', 'active')
    .single();

  if (existing) {
    return { ...existing, isNew: false };
  }

  // Try to find customer by phone
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', formattedPhone)
    .single();

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('sms_conversations')
    .insert({
      business_id: businessId,
      phone: formattedPhone,
      customer_id: customer?.id || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: conversation.id, customer_id: customer?.id || null, isNew: true };
}

/**
 * Mark a conversation as needing human attention
 */
export async function flagForHumanAttention(
  conversationId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('sms_conversations')
    .update({
      needs_human_attention: true,
      human_attention_reason: reason,
      human_attention_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
}

/**
 * Clear human attention flag (when human responds)
 */
export async function clearHumanAttention(conversationId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('sms_conversations')
    .update({
      needs_human_attention: false,
      human_attention_reason: null,
      human_attention_at: null,
      ai_response_count: 0, // Reset counter when human responds
    })
    .eq('id', conversationId);
}

/**
 * Save an incoming message to the database
 */
export async function saveIncomingMessage(
  conversationId: string,
  body: string,
  twilioSid?: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sms_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      sender: 'customer',
      body,
      status: 'received',
      twilio_sid: twilioSid,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  // Update last customer message timestamp
  await supabase
    .from('sms_conversations')
    .update({
      last_customer_message_at: new Date().toISOString(),
      is_customer_initiated: true,
    })
    .eq('id', conversationId);

  return data.id;
}

/**
 * Update message status from Twilio callback
 */
export async function updateMessageStatus(
  twilioSid: string,
  status: 'queued' | 'sent' | 'delivered' | 'failed',
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient();

  const updates: Record<string, any> = { status };
  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  await supabase
    .from('sms_messages')
    .update(updates)
    .eq('twilio_sid', twilioSid);
}
