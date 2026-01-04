// =====================================================
// OUTREACH MODULE - SMS
// Sending and receiving SMS messages
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  OutreachMessage,
  OutreachConversation,
  OutreachContact,
  MessageDirection,
  MessageSenderType,
} from '@/types/outreach';
import {
  isSafeToContact,
  containsOptOutKeyword,
  extractOptOutKeyword,
  recordOptOut,
  normalizePhone,
  isWithinSendWindow,
  detectTimezoneFromPhone,
} from './compliance';

// =====================================================
// SEND OUTREACH MESSAGE
// =====================================================

export interface SendMessageInput {
  contact_id: string;
  message_text: string;
  sender_type?: MessageSenderType;
  sender_id?: string;
  skip_compliance_check?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  message?: OutreachMessage;
  error?: string;
  blocked_reason?: string;
}

/**
 * Send an outreach SMS message to a contact
 */
export async function sendOutreachMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const supabase = await createClient();

  // Get contact
  const { data: contact } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', input.contact_id)
    .single();

  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  // Compliance checks (unless skipped for system messages)
  if (!input.skip_compliance_check) {
    const safetyCheck = await isSafeToContact(contact.phone);

    if (!safetyCheck.safe) {
      return {
        success: false,
        error: 'Cannot send message to this contact',
        blocked_reason: safetyCheck.reason,
      };
    }

    // Check send window
    const timezone = contact.timezone || (await detectTimezoneFromPhone(contact.phone)).timezone;

    if (!isWithinSendWindow(new Date(), timezone)) {
      // Queue for later or return warning
      return {
        success: false,
        error: 'Outside of send window',
        blocked_reason: 'outside_send_window',
      };
    }
  }

  // Get or create conversation
  let conversation = await getActiveConversation(input.contact_id);

  if (!conversation) {
    const { data: newConversation, error } = await supabase
      .from('outreach_conversations')
      .insert({
        contact_id: input.contact_id,
        campaign_id: contact.campaign_id,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: 'Failed to create conversation' };
    }

    conversation = newConversation;
  }

  if (!conversation) {
    return { success: false, error: 'Failed to get or create conversation' };
  }

  // Create message record
  const { data: message, error: messageError } = await supabase
    .from('outreach_messages')
    .insert({
      conversation_id: conversation.id,
      contact_id: input.contact_id,
      direction: 'outbound' as MessageDirection,
      message_text: input.message_text,
      sender_type: input.sender_type || 'ai',
      sender_id: input.sender_id,
      status: 'queued',
      consent_verified: true,
      opt_out_checked: true,
      within_send_window: true,
    })
    .select()
    .single();

  if (messageError) {
    return { success: false, error: 'Failed to create message record' };
  }

  // Send via Twilio
  // TODO: Integrate with existing Twilio service
  // For now, mark as sent
  const { data: updatedMessage } = await supabase
    .from('outreach_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      // twilio_sid: twilioResponse.sid
    })
    .eq('id', message.id)
    .select()
    .single();

  // Update contact stats
  await supabase
    .from('outreach_contacts')
    .update({
      messages_sent: (contact.messages_sent || 0) + 1,
      last_message_at: new Date().toISOString(),
      first_message_at: contact.first_message_at || new Date().toISOString(),
      status: contact.status === 'pending' ? 'contacted' : contact.status,
    })
    .eq('id', input.contact_id);

  // Update conversation
  if (conversation) {
    await supabase
      .from('outreach_conversations')
      .update({
        messages_count: (conversation.messages_count || 0) + 1,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);
  }

  return { success: true, message: updatedMessage };
}

// =====================================================
// HANDLE INBOUND MESSAGE
// =====================================================

export interface InboundMessageInput {
  from_phone: string;
  message_text: string;
  twilio_sid?: string;
}

export interface InboundMessageResult {
  success: boolean;
  contact?: OutreachContact;
  message?: OutreachMessage;
  is_opt_out: boolean;
  is_new_contact: boolean;
  ai_response_needed: boolean;
  error?: string;
}

/**
 * Handle an inbound SMS message
 */
export async function handleInboundMessage(
  input: InboundMessageInput
): Promise<InboundMessageResult> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(input.from_phone);

  // Check for opt-out keywords first
  if (containsOptOutKeyword(input.message_text)) {
    const keyword = extractOptOutKeyword(input.message_text);

    await recordOptOut(normalizedPhone, 'STOP_reply', keyword || undefined);

    // Update any existing contacts
    await supabase
      .from('outreach_contacts')
      .update({ status: 'opted_out' })
      .eq('phone', normalizedPhone);

    // Update conversations
    await supabase
      .from('outreach_conversations')
      .update({ status: 'opted_out' })
      .eq('contact_id', (
        await supabase
          .from('outreach_contacts')
          .select('id')
          .eq('phone', normalizedPhone)
          .limit(1)
          .single()
      ).data?.id);

    return {
      success: true,
      is_opt_out: true,
      is_new_contact: false,
      ai_response_needed: false,
    };
  }

  // Find existing contact
  let { data: contact } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('phone', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let isNewContact = false;

  if (!contact) {
    // This is likely from a Text Us widget or unknown source
    // Create a new contact
    const timezone = await detectTimezoneFromPhone(normalizedPhone);

    const { data: newContact, error } = await supabase
      .from('outreach_contacts')
      .insert({
        phone: normalizedPhone,
        source: 'SMS_WIDGET',
        status: 'replied',
        timezone: timezone.timezone,
        timezone_source: 'area_code',
        messages_received: 1,
        first_reply_at: new Date().toISOString(),
        last_reply_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: 'Failed to create contact',
        is_opt_out: false,
        is_new_contact: true,
        ai_response_needed: false,
      };
    }

    contact = newContact;
    isNewContact = true;
  }

  // Get or create conversation
  let conversation = await getActiveConversation(contact.id);

  if (!conversation) {
    const { data: newConversation, error } = await supabase
      .from('outreach_conversations')
      .insert({
        contact_id: contact.id,
        campaign_id: contact.campaign_id,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: 'Failed to create conversation',
        is_opt_out: false,
        is_new_contact: isNewContact,
        ai_response_needed: false,
      };
    }

    conversation = newConversation;
  }

  if (!conversation) {
    return {
      success: false,
      error: 'Failed to get or create conversation',
      is_opt_out: false,
      is_new_contact: isNewContact,
      ai_response_needed: false,
    };
  }

  // Create message record
  const { data: message, error: messageError } = await supabase
    .from('outreach_messages')
    .insert({
      conversation_id: conversation.id,
      contact_id: contact.id,
      direction: 'inbound' as MessageDirection,
      message_text: input.message_text,
      sender_type: 'lead',
      twilio_sid: input.twilio_sid,
      status: 'received',
    })
    .select()
    .single();

  if (messageError) {
    return {
      success: false,
      error: 'Failed to create message record',
      is_opt_out: false,
      is_new_contact: isNewContact,
      ai_response_needed: false,
    };
  }

  // Update contact stats
  await supabase
    .from('outreach_contacts')
    .update({
      messages_received: (contact.messages_received || 0) + 1,
      last_reply_at: new Date().toISOString(),
      first_reply_at: contact.first_reply_at || new Date().toISOString(),
      status: contact.status === 'contacted' ? 'replied' : contact.status,
    })
    .eq('id', contact.id);

  // Update conversation
  await supabase
    .from('outreach_conversations')
    .update({
      messages_count: (conversation.messages_count || 0) + 1,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversation.id);

  // Check if AI response is needed
  const aiResponseNeeded = !conversation.human_takeover;

  return {
    success: true,
    contact,
    message,
    is_opt_out: false,
    is_new_contact: isNewContact,
    ai_response_needed: aiResponseNeeded,
  };
}

// =====================================================
// CONVERSATION MANAGEMENT
// =====================================================

/**
 * Get active conversation for a contact
 */
export async function getActiveConversation(
  contactId: string
): Promise<OutreachConversation | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('outreach_conversations')
    .select('*')
    .eq('contact_id', contactId)
    .in('status', ['active', 'qualified', 'scheduled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

/**
 * Get conversation with messages
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<{
  conversation: OutreachConversation;
  messages: OutreachMessage[];
  contact: OutreachContact;
} | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from('outreach_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) return null;

  const { data: messages } = await supabase
    .from('outreach_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const { data: contact } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', conversation.contact_id)
    .single();

  if (!contact) return null;

  return {
    conversation,
    messages: messages || [],
    contact,
  };
}

/**
 * Human takes over conversation from AI
 */
export async function takeOverConversation(
  conversationId: string,
  agentId: string,
  reason?: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_conversations')
    .update({
      status: 'human_takeover',
      human_takeover: true,
      human_takeover_by: agentId,
      human_takeover_at: new Date().toISOString(),
      human_takeover_reason: reason,
    })
    .eq('id', conversationId);

  return !error;
}

/**
 * Close a conversation
 */
export async function closeConversation(
  conversationId: string,
  status: 'qualified' | 'scheduled' | 'closed' | 'opted_out'
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_conversations')
    .update({ status })
    .eq('id', conversationId);

  return !error;
}

// =====================================================
// AI QUALIFICATION
// =====================================================

export interface AIQualificationResult {
  score: number;
  interest_level: 'hot' | 'warm' | 'cold';
  pain_points: string[];
  timeline: string | null;
  budget_signal: string | null;
  current_solution: string | null;
  recommended_plan: string | null;
  ready_to_schedule: boolean;
  qualification_summary: string;
  extracted_data: Record<string, unknown>;
}

/**
 * Analyze conversation and qualify the lead
 * TODO: Integrate with AI service
 */
export async function qualifyContact(
  contactId: string,
  conversationId: string
): Promise<AIQualificationResult | null> {
  const supabase = await createClient();

  // Get conversation messages
  const conversationData = await getConversationWithMessages(conversationId);

  if (!conversationData) return null;

  // TODO: Send to AI for analysis
  // For now, return a placeholder result
  const result: AIQualificationResult = {
    score: 50,
    interest_level: 'warm',
    pain_points: [],
    timeline: null,
    budget_signal: null,
    current_solution: null,
    recommended_plan: null,
    ready_to_schedule: false,
    qualification_summary: 'Qualification pending AI integration',
    extracted_data: {},
  };

  // Update contact with qualification data
  await supabase
    .from('outreach_contacts')
    .update({
      score: result.score,
      interest_level: result.interest_level,
      pain_points: result.pain_points,
      timeline: result.timeline,
      budget_signal: result.budget_signal,
      current_solution: result.current_solution,
      recommended_plan: result.recommended_plan,
      qualification_summary: result.qualification_summary,
      status: result.ready_to_schedule ? 'qualified' : 'qualifying',
    })
    .eq('id', contactId);

  // Update conversation with extracted data
  await supabase
    .from('outreach_conversations')
    .update({
      ai_extracted_data: result.extracted_data,
    })
    .eq('id', conversationId);

  return result;
}

/**
 * Generate AI response for a message
 * TODO: Integrate with AI service
 */
export async function generateAIResponse(
  contactId: string,
  conversationId: string,
  _inboundMessage: string
): Promise<string | null> {
  // Get conversation context
  const conversationData = await getConversationWithMessages(conversationId);

  if (!conversationData) return null;

  // TODO: Send to AI for response generation
  // For now, return null to indicate manual handling needed

  return null;
}
