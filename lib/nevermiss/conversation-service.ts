// NeverMiss Conversation Service
// Handles database operations for conversations

import { createClient } from '@/lib/supabase/server';
import {
  BusinessSettings,
  Conversation,
  ConversationMessage,
  ConversationState,
  ExtractedInfo,
  CapturedLead,
  UrgencyLevel,
  TERMINAL_STATES
} from './types';
import {
  createEmptyExtractedInfo,
  generateGreeting,
  isAfterHours
} from './conversation-engine';

/**
 * Get business settings for NeverMiss
 */
export async function getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
  const supabase = await createClient();

  // Get nevermiss settings
  const { data: settings, error: settingsError } = await supabase
    .from('nevermiss_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (settingsError || !settings) {
    console.error('Failed to get NeverMiss settings:', settingsError);
    return null;
  }

  // Get business info
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('name, owner_name, plan_type')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    console.error('Failed to get business:', businessError);
    return null;
  }

  // Get plan features
  const { data: planFeatures } = await supabase
    .from('plan_nevermiss_features')
    .select('*')
    .eq('plan_type', business.plan_type)
    .single();

  // Determine plan capabilities
  const canBookCalendar = planFeatures?.can_book_calendar || false;
  const hasCrm = planFeatures?.includes_crm || false;

  return {
    businessId,
    businessName: settings.business_name || business.name,
    ownerName: business.owner_name || 'the owner',
    servicesOffered: settings.services_offered || [],
    serviceArea: settings.service_area || '',
    phoneNumber: settings.phone_number || '',
    forwardTo: settings.forward_to || '',

    // Conversation settings
    tone: settings.ai_tone || 'friendly',
    greetingStyle: 'apologetic',
    greetingMessage: settings.greeting_message || '',
    useOwnerName: true,
    maxMessages: 10,
    customPrompt: settings.custom_prompt || undefined,

    // Business hours
    businessHoursStart: settings.business_hours_start || '07:00',
    businessHoursEnd: settings.business_hours_end || '19:00',
    businessDays: settings.business_days || [1, 2, 3, 4, 5, 6],
    quietHoursStart: settings.quiet_hours_start || '21:00',
    quietHoursEnd: settings.quiet_hours_end || '07:00',
    timezone: settings.timezone || 'America/Los_Angeles', // Default to Pacific if not set

    // After hours
    afterHoursEnabled: true,
    afterHoursMessage: "I'll follow up first thing tomorrow morning.",

    // Emergency keywords
    emergencyKeywords: ['emergency', 'flooding', 'burst', 'leak', 'gas smell', 'no hot water', 'sewage'],
    emergencyAlwaysNotify: settings.emergency_always_notify ?? true,
    afterHoursNotify: true,

    // Notifications
    notifySms: settings.notify_sms ?? true,
    notifyEmail: settings.notify_email ?? true,
    notifyPush: settings.notify_push ?? true,

    // Plan features
    calendarBookingEnabled: canBookCalendar,
    crmIntegrationEnabled: hasCrm,
    autoCreateJobs: hasCrm
  };
}

/**
 * Find business by phone number
 */
export async function findBusinessByPhone(phoneNumber: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('nevermiss_settings')
    .select('business_id')
    .eq('phone_number', phoneNumber)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.business_id;
}

/**
 * Find or create a conversation
 */
export async function findOrCreateConversation(
  businessId: string,
  customerPhone: string,
  businessPhone: string,
  settings: BusinessSettings
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const supabase = await createClient();

  // Look for existing active conversation
  const { data: existing, error: findError } = await supabase
    .from('nevermiss_conversations')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .eq('business_phone', businessPhone)
    .in('state', ['active', 'greeting_sent', 'capturing_need', 'capturing_address', 'capturing_urgency', 'capturing_time', 'confirming', 'awaiting_owner'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing && !findError) {
    // Load messages for existing conversation
    const { data: messages } = await supabase
      .from('nevermiss_messages')
      .select('*')
      .eq('conversation_id', existing.id)
      .order('created_at', { ascending: true });

    const conversation: Conversation = {
      id: existing.id,
      businessId: existing.business_id,
      customerId: existing.customer_id,
      customerPhone: existing.customer_phone,
      businessPhone: existing.business_phone,
      state: existing.state as ConversationState,
      previousStates: [],
      extracted: {
        serviceNeeded: existing.metadata?.service_needed || null,
        address: existing.metadata?.address || null,
        urgency: existing.metadata?.urgency || null,
        urgencyReason: existing.metadata?.urgency_reason || null,
        preferredTime: existing.metadata?.preferred_time || null,
        customerName: existing.metadata?.customer_name || null,
        additionalNotes: existing.metadata?.additional_notes || null
      },
      messages: (messages || []).map(m => ({
        id: m.id,
        role: m.direction === 'outbound' ? 'assistant' : 'customer',
        content: m.content,
        timestamp: new Date(m.created_at),
        twilioSid: m.twilio_sid,
        status: m.status
      })),
      messageCount: existing.message_count || 0,
      aiMessagesSinceResponse: 0,
      startedAt: new Date(existing.created_at),
      lastCustomerMessageAt: existing.last_customer_message_at ? new Date(existing.last_customer_message_at) : undefined,
      isAfterHours: isAfterHours(settings),
      isEmergency: existing.metadata?.is_emergency || false,
      ownerNotified: existing.metadata?.owner_notified || false,
      ownerNotifiedAt: existing.metadata?.owner_notified_at ? new Date(existing.metadata.owner_notified_at) : undefined,
      aiModel: 'claude-3-5-sonnet-20241022'
    };

    // Count AI messages since last customer response
    let aiCount = 0;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'customer') {
        break;
      }
      if (conversation.messages[i].role === 'assistant') {
        aiCount++;
      }
    }
    conversation.aiMessagesSinceResponse = aiCount;

    return { conversation, isNew: false };
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabase
    .from('nevermiss_conversations')
    .insert({
      business_id: businessId,
      customer_phone: customerPhone,
      business_phone: businessPhone,
      state: 'active',
      ai_enabled: true,
      message_count: 0,
      metadata: {}
    })
    .select()
    .single();

  if (createError || !newConv) {
    throw new Error(`Failed to create conversation: ${createError?.message}`);
  }

  const conversation: Conversation = {
    id: newConv.id,
    businessId: newConv.business_id,
    customerPhone: newConv.customer_phone,
    businessPhone: newConv.business_phone,
    state: 'active',
    previousStates: [],
    extracted: createEmptyExtractedInfo(),
    messages: [],
    messageCount: 0,
    aiMessagesSinceResponse: 0,
    startedAt: new Date(newConv.created_at),
    isAfterHours: isAfterHours(settings),
    isEmergency: false,
    ownerNotified: false,
    aiModel: 'claude-3-5-sonnet-20241022'
  };

  return { conversation, isNew: true };
}

/**
 * Save a message to the conversation
 */
export async function saveMessage(
  conversation: Conversation,
  message: Omit<ConversationMessage, 'id'>,
  twilioSid?: string,
  fromNumber?: string,
  toNumber?: string
): Promise<ConversationMessage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('nevermiss_messages')
    .insert({
      business_id: conversation.businessId,
      conversation_id: conversation.id,
      direction: message.role === 'assistant' ? 'outbound' : 'inbound',
      content: message.content,
      twilio_sid: twilioSid,
      from_number: fromNumber,
      to_number: toNumber,
      status: message.status || 'queued',
      is_ai_response: message.role === 'assistant',
      ai_model: message.role === 'assistant' ? conversation.aiModel : null
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save message: ${error?.message}`);
  }

  return {
    id: data.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(data.created_at),
    twilioSid: data.twilio_sid,
    status: data.status
  };
}

/**
 * Update conversation state and extracted info
 */
export async function updateConversation(
  conversationId: string,
  updates: {
    state?: ConversationState;
    extracted?: ExtractedInfo;
    messageCount?: number;
    lastCustomerMessageAt?: Date;
    isEmergency?: boolean;
    ownerNotified?: boolean;
    ownerNotifiedAt?: Date;
    completedAt?: Date;
    abandonedAt?: Date;
  }
): Promise<void> {
  const supabase = await createClient();

  const dbUpdates: Record<string, unknown> = {};

  if (updates.state) {
    dbUpdates.state = updates.state;
  }
  if (updates.messageCount !== undefined) {
    dbUpdates.message_count = updates.messageCount;
  }
  if (updates.lastCustomerMessageAt) {
    dbUpdates.last_customer_message_at = updates.lastCustomerMessageAt.toISOString();
  }
  if (updates.completedAt) {
    dbUpdates.completed_at = updates.completedAt.toISOString();
  }
  if (updates.abandonedAt) {
    dbUpdates.abandoned_at = updates.abandonedAt.toISOString();
  }

  // Store extracted info and flags in metadata
  if (updates.extracted || updates.isEmergency !== undefined || updates.ownerNotified !== undefined) {
    const { data: current } = await supabase
      .from('nevermiss_conversations')
      .select('metadata')
      .eq('id', conversationId)
      .single();

    const metadata = current?.metadata || {};

    if (updates.extracted) {
      metadata.service_needed = updates.extracted.serviceNeeded;
      metadata.address = updates.extracted.address;
      metadata.urgency = updates.extracted.urgency;
      metadata.urgency_reason = updates.extracted.urgencyReason;
      metadata.preferred_time = updates.extracted.preferredTime;
      metadata.customer_name = updates.extracted.customerName;
      metadata.additional_notes = updates.extracted.additionalNotes;
    }
    if (updates.isEmergency !== undefined) {
      metadata.is_emergency = updates.isEmergency;
    }
    if (updates.ownerNotified !== undefined) {
      metadata.owner_notified = updates.ownerNotified;
    }
    if (updates.ownerNotifiedAt) {
      metadata.owner_notified_at = updates.ownerNotifiedAt.toISOString();
    }

    dbUpdates.metadata = metadata;
  }

  const { error } = await supabase
    .from('nevermiss_conversations')
    .update(dbUpdates)
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to update conversation: ${error.message}`);
  }
}

/**
 * Check if phone is on suppression list
 */
export async function isPhoneSuppressed(
  businessId: string,
  phoneNumber: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sms_suppression_list')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone_number', phoneNumber)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}

/**
 * Add phone to suppression list (opt-out)
 */
export async function addToSuppressionList(
  businessId: string,
  phoneNumber: string,
  reason: 'opt_out' | 'spam' | 'undeliverable'
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sms_suppression_list')
    .upsert({
      business_id: businessId,
      phone_number: phoneNumber,
      reason,
      is_active: true
    }, {
      onConflict: 'business_id,phone_number'
    });

  if (error) {
    throw new Error(`Failed to add to suppression list: ${error.message}`);
  }
}

/**
 * Remove phone from suppression list (re-subscribe)
 */
export async function removeFromSuppressionList(
  businessId: string,
  phoneNumber: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sms_suppression_list')
    .update({ is_active: false })
    .eq('business_id', businessId)
    .eq('phone_number', phoneNumber);

  if (error) {
    throw new Error(`Failed to remove from suppression list: ${error.message}`);
  }
}

/**
 * Create a captured lead from a completed conversation
 */
export async function createCapturedLead(
  conversation: Conversation,
  settings: BusinessSettings
): Promise<CapturedLead> {
  // Calculate conversation duration
  const endTime = new Date();
  const durationSeconds = Math.floor(
    (endTime.getTime() - conversation.startedAt.getTime()) / 1000
  );

  // Count outbound SMS messages
  const smsCount = conversation.messages.filter(m => m.role === 'assistant').length;

  const lead: CapturedLead = {
    leadId: `lead_${conversation.id}`,
    businessId: conversation.businessId,
    capturedAt: endTime,
    source: 'missed_call',

    customer: {
      phone: conversation.customerPhone,
      name: conversation.extracted.customerName,
      optedOut: false,
      existingCustomerId: conversation.customerId
    },

    serviceRequest: {
      serviceNeeded: conversation.extracted.serviceNeeded || 'Not specified',
      address: {
        raw: conversation.extracted.address || 'Not provided',
        street: null,
        city: null,
        state: null,
        zip: null
      },
      urgency: conversation.extracted.urgency || 'medium',
      urgencyReason: conversation.extracted.urgencyReason,
      preferredTime: conversation.extracted.preferredTime,
      additionalNotes: conversation.extracted.additionalNotes
    },

    conversation: {
      id: conversation.id,
      messageCount: conversation.messageCount,
      durationSeconds,
      smsCount,
      startedAt: conversation.startedAt,
      endedAt: endTime,
      messages: conversation.messages
    },

    status: 'new',
    ownerNotificationMethod: []
  };

  // Try to parse address
  if (conversation.extracted.address) {
    const addressParts = parseAddress(conversation.extracted.address);
    if (addressParts) {
      lead.serviceRequest.address = {
        raw: conversation.extracted.address,
        ...addressParts
      };
    }
  }

  return lead;
}

/**
 * Simple address parser (basic implementation)
 */
function parseAddress(address: string): { street: string | null; city: string | null; state: string | null; zip: string | null } | null {
  // Very basic parsing - in production, use a proper geocoding API
  const parts = address.split(',').map(p => p.trim());

  if (parts.length === 0) return null;

  const result = {
    street: parts[0] || null,
    city: parts[1] || null,
    state: null as string | null,
    zip: null as string | null
  };

  // Try to extract state and zip from last parts
  if (parts.length > 2) {
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})?/i);
    if (stateZipMatch) {
      result.state = stateZipMatch[1].toUpperCase();
      result.zip = stateZipMatch[2] || null;
    } else {
      result.city = parts[1];
    }
  }

  return result;
}

/**
 * Log a webhook event for idempotency
 */
export async function logWebhookEvent(
  businessId: string,
  twilioSid: string,
  eventType: string,
  status?: string,
  errorCode?: string,
  errorMessage?: string,
  rawPayload?: Record<string, unknown>
): Promise<{ isNew: boolean }> {
  const supabase = await createClient();

  // Try to insert - will fail on duplicate due to partial unique index
  const { error } = await supabase
    .from('nevermiss_events')
    .insert({
      business_id: businessId,
      twilio_sid: twilioSid,
      event_type: eventType,
      status,
      error_code: errorCode,
      error_message: errorMessage,
      raw_payload: rawPayload,
      processed: false
    });

  // Check if it was a duplicate
  if (error?.code === '23505') { // Unique violation
    return { isNew: false };
  }

  if (error) {
    console.error('Failed to log webhook event:', error);
    throw error;
  }

  return { isNew: true };
}

/**
 * Mark a webhook event as processed
 */
export async function markEventProcessed(
  twilioSid: string,
  eventType: string,
  status?: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient();

  let query = supabase
    .from('nevermiss_events')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      notes
    })
    .eq('twilio_sid', twilioSid)
    .eq('event_type', eventType);

  if (status) {
    query = query.eq('status', status);
  }

  const { error } = await query;

  if (error) {
    console.error('Failed to mark event processed:', error);
  }
}

/**
 * Find existing customer by phone number
 */
export async function findCustomerByPhone(
  businessId: string,
  phoneNumber: string
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .eq('business_id', businessId)
    .eq('phone', phoneNumber)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: [data.first_name, data.last_name].filter(Boolean).join(' ')
  };
}

/**
 * Create a job from a captured lead (for Blue/Gold plans)
 */
export async function createJobFromLead(
  lead: CapturedLead,
  settings: BusinessSettings
): Promise<string | null> {
  if (!settings.autoCreateJobs) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      business_id: lead.businessId,
      customer_id: lead.customer.existingCustomerId,
      title: lead.serviceRequest.serviceNeeded,
      description: `Lead captured via Leads Captain\n\nAddress: ${lead.serviceRequest.address.raw}\nUrgency: ${lead.serviceRequest.urgency}${lead.serviceRequest.urgencyReason ? ` - ${lead.serviceRequest.urgencyReason}` : ''}\nPreferred Time: ${lead.serviceRequest.preferredTime || 'Not specified'}`,
      status: 'lead',
      priority: lead.serviceRequest.urgency === 'emergency' ? 'urgent' : lead.serviceRequest.urgency === 'high' ? 'high' : 'normal',
      source: 'nevermiss',
      address: lead.serviceRequest.address.raw,
      metadata: {
        nevermiss_lead_id: lead.leadId,
        nevermiss_conversation_id: lead.conversation.id,
        customer_phone: lead.customer.phone
      }
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to create job from lead:', error);
    return null;
  }

  return data.id;
}
