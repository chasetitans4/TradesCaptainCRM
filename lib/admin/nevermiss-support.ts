// =====================================================
// NEVERMISS ADMIN SUPPORT FUNCTIONS
// Based on NeverMiss Support & Troubleshooting Guide v1.5
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// =====================================================
// TYPES
// =====================================================

export interface CustomerLookupResult {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  status: string;
  billing_status: string;
  plan_type: string;
  nevermiss_phone?: string;
  forward_to?: string;
  created_at: string;
}

export interface ConversationLogEntry {
  id: string;
  organization_id: string;
  caller_phone: string;
  state: string;
  lead_status: string;
  service_needed: string | null;
  urgency: string | null;
  ai_failure_count: number;
  handoff_reason: string | null;
  blocked_reason: string | null;
  address_raw: string | null;
  caller_address: string | null;
  address_confidence: number | null;
  created_at: string;
  updated_at: string;
  messages?: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string | null;
  error_code: string | null;
  from_number: string;
  to_number: string;
  created_at: string;
  delivered_at: string | null;
  status_updated_at: string | null;
}

export interface SmsDeliveryFailure {
  id: string;
  organization_id: string;
  to_number: string;
  error_code: string;
  error_message: string | null;
  twilio_sid: string;
  created_at: string;
}

export interface NotificationLogEntry {
  id: string;
  organization_id: string;
  conversation_id: string;
  type: 'sms' | 'email' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  recipient: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface SmsUsageRecord {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  sms_sent: number;
  sms_limit: number;
  overage_count: number;
}

export interface SuppressionListEntry {
  id: string;
  organization_id: string;
  phone: string;
  reason: string;
  is_active: boolean;
  suppressed_at: string;
  unsuppressed_at: string | null;
}

export interface AIIssueReport {
  id: string;
  conversation_id: string;
  organization_id: string;
  issue_type: string;
  description: string;
  reported_by: string;
  status: 'open' | 'reviewing' | 'resolved' | 'wont_fix';
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface WebhookEvent {
  id: string;
  organization_id: string;
  event_type: string;
  twilio_sid: string;
  status: string | null;
  processed: boolean;
  created_at: string;
}

// =====================================================
// CUSTOMER LOOKUP
// =====================================================

export async function lookupCustomerByPhone(phone: string): Promise<CustomerLookupResult[]> {
  const supabase = getAdminSupabase();

  // Normalize phone number for search
  const normalizedPhone = phone.replace(/\D/g, '');

  const { data, error } = await supabase.rpc('lookup_customer_by_phone', {
    search_phone: normalizedPhone
  });

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('organizations')
      .select(`
        id,
        business_name,
        owner_name,
        email,
        status,
        billing_status,
        plan_type,
        nevermiss_settings (
          phone_number,
          forward_to
        )
      `)
      .or(`email.ilike.%${phone}%`)
      .limit(10);

    if (fallbackError) throw fallbackError;

    return (fallbackData || []).map((org: any) => ({
      id: org.id,
      business_name: org.business_name || '',
      owner_name: org.owner_name || '',
      email: org.email || '',
      status: org.status || 'active',
      billing_status: org.billing_status || 'current',
      plan_type: org.plan_type || 'none',
      nevermiss_phone: org.nevermiss_settings?.[0]?.phone_number,
      forward_to: org.nevermiss_settings?.[0]?.forward_to,
      created_at: org.created_at,
    }));
  }

  return data || [];
}

export async function lookupCustomerByEmail(email: string): Promise<CustomerLookupResult[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('organizations')
    .select(`
      id,
      business_name,
      owner_name,
      email,
      status,
      billing_status,
      plan_type,
      created_at,
      nevermiss_settings (
        phone_number,
        forward_to
      )
    `)
    .ilike('email', `%${email}%`)
    .limit(10);

  if (error) throw error;

  return (data || []).map((org: any) => ({
    id: org.id,
    business_name: org.business_name || '',
    owner_name: org.owner_name || '',
    email: org.email || '',
    status: org.status || 'active',
    billing_status: org.billing_status || 'current',
    plan_type: org.plan_type || 'none',
    nevermiss_phone: org.nevermiss_settings?.[0]?.phone_number,
    forward_to: org.nevermiss_settings?.[0]?.forward_to,
    created_at: org.created_at,
  }));
}

export async function lookupCustomerByName(name: string): Promise<CustomerLookupResult[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('organizations')
    .select(`
      id,
      business_name,
      owner_name,
      email,
      status,
      billing_status,
      plan_type,
      created_at,
      nevermiss_settings (
        phone_number,
        forward_to
      )
    `)
    .or(`business_name.ilike.%${name}%,owner_name.ilike.%${name}%`)
    .limit(10);

  if (error) throw error;

  return (data || []).map((org: any) => ({
    id: org.id,
    business_name: org.business_name || '',
    owner_name: org.owner_name || '',
    email: org.email || '',
    status: org.status || 'active',
    billing_status: org.billing_status || 'current',
    plan_type: org.plan_type || 'none',
    nevermiss_phone: org.nevermiss_settings?.[0]?.phone_number,
    forward_to: org.nevermiss_settings?.[0]?.forward_to,
    created_at: org.created_at,
  }));
}

// =====================================================
// CONVERSATION LOGS
// =====================================================

export async function getConversationLogs(
  organizationId: string,
  limit = 20,
  offset = 0
): Promise<{ conversations: ConversationLogEntry[]; total: number }> {
  const supabase = getAdminSupabase();

  const { data, error, count } = await supabase
    .from('nevermiss_conversations')
    .select(`
      id,
      organization_id,
      caller_phone,
      state,
      lead_status,
      service_needed,
      urgency,
      ai_failure_count,
      handoff_reason,
      blocked_reason,
      address_raw,
      caller_address,
      address_confidence,
      created_at,
      updated_at
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    conversations: data || [],
    total: count || 0,
  };
}

export async function getConversationMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('nevermiss_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getConversationById(
  conversationId: string
): Promise<ConversationLogEntry | null> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('nevermiss_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

// =====================================================
// SMS TROUBLESHOOTING
// =====================================================

export async function getSmsDeliveryFailures(
  organizationId?: string,
  hours = 24
): Promise<SmsDeliveryFailure[]> {
  const supabase = getAdminSupabase();

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('sms_delivery_failures')
    .select('*')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(100);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function checkSuppressionList(
  phone: string,
  organizationId?: string
): Promise<SuppressionListEntry[]> {
  const supabase = getAdminSupabase();

  let query = supabase
    .from('sms_suppression_list')
    .select('*')
    .eq('phone', phone)
    .eq('is_active', true);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function removeFromSuppressionList(
  phone: string,
  organizationId: string
): Promise<boolean> {
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from('sms_suppression_list')
    .update({
      is_active: false,
      unsuppressed_at: new Date().toISOString(),
    })
    .eq('phone', phone)
    .eq('organization_id', organizationId);

  if (error) throw error;

  return true;
}

export async function getSmsUsage(organizationId: string): Promise<SmsUsageRecord[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('sms_usage')
    .select('*')
    .eq('organization_id', organizationId)
    .order('period_start', { ascending: false })
    .limit(6);

  if (error) throw error;

  return data || [];
}

// =====================================================
// NOTIFICATION LOGS
// =====================================================

export async function getNotificationLogs(
  organizationId: string,
  limit = 20
): Promise<NotificationLogEntry[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
}

export async function getNotificationQueue(organizationId: string): Promise<any[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true });

  if (error) throw error;

  return data || [];
}

// =====================================================
// AI ISSUE MANAGEMENT
// =====================================================

export async function reportAIIssue(
  conversationId: string,
  issueType: string,
  description: string,
  reportedBy: string
): Promise<AIIssueReport> {
  const supabase = getAdminSupabase();

  // Get organization ID from conversation
  const { data: conversation } = await supabase
    .from('nevermiss_conversations')
    .select('organization_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const { data, error } = await supabase
    .from('ai_issues')
    .insert({
      conversation_id: conversationId,
      organization_id: conversation.organization_id,
      issue_type: issueType,
      description,
      reported_by: reportedBy,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getAIIssues(
  status?: string,
  limit = 50
): Promise<AIIssueReport[]> {
  const supabase = getAdminSupabase();

  let query = supabase
    .from('ai_issues')
    .select(`
      *,
      nevermiss_conversations (
        caller_phone,
        service_needed
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function resolveAIIssue(
  issueId: string,
  status: 'resolved' | 'wont_fix',
  resolutionNotes: string
): Promise<boolean> {
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from('ai_issues')
    .update({
      status,
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', issueId);

  if (error) throw error;

  return true;
}

// =====================================================
// WEBHOOK EVENTS
// =====================================================

export async function getWebhookEvents(
  organizationId: string,
  limit = 20
): Promise<WebhookEvent[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('nevermiss_events')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
}

export async function getOrphanedStatusEvents(): Promise<WebhookEvent[]> {
  const supabase = getAdminSupabase();

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('nevermiss_events')
    .select('*')
    .eq('event_type', 'sms_status')
    .eq('processed', false)
    .lt('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

// =====================================================
// QUICK ACTIONS
// =====================================================

export async function forceEndConversation(
  conversationId: string,
  status: 'completed' | 'abandoned' = 'completed'
): Promise<boolean> {
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from('nevermiss_conversations')
    .update({
      state: status,
      lead_status: 'incomplete',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) throw error;

  return true;
}

export async function unblockConversation(conversationId: string): Promise<boolean> {
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from('nevermiss_conversations')
    .update({
      state: 'awaiting_owner',
      blocked_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) throw error;

  return true;
}

export async function updateForwardToNumber(
  organizationId: string,
  newNumber: string
): Promise<boolean> {
  const supabase = getAdminSupabase();

  // Validate phone format
  if (!/^\+1\d{10}$/.test(newNumber)) {
    throw new Error('Phone number must be in E.164 format (+1XXXXXXXXXX)');
  }

  const { error } = await supabase
    .from('nevermiss_settings')
    .update({
      forward_to: newNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  if (error) throw error;

  return true;
}

export async function getNeverMissSettings(organizationId: string): Promise<any> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('nevermiss_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getAIApiLogs(
  conversationId: string
): Promise<any[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('ai_api_logs')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getDailyMetrics(
  organizationId: string,
  days = 30
): Promise<any[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('nevermiss_daily_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .order('date', { ascending: false })
    .limit(days);

  if (error) throw error;

  return data || [];
}

// =====================================================
// DUPLICATE CHECK
// =====================================================

export async function checkForDuplicateEvents(
  conversationId: string
): Promise<{ twilio_sid: string; count: number }[]> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase.rpc('check_duplicate_events', {
    p_conversation_id: conversationId
  });

  if (error) {
    // Fallback query if RPC doesn't exist
    const { data: fallback, error: fallbackError } = await supabase
      .from('nevermiss_events')
      .select('twilio_sid')
      .eq('conversation_id', conversationId);

    if (fallbackError) throw fallbackError;

    // Count duplicates manually
    const counts: Record<string, number> = {};
    (fallback || []).forEach((e: any) => {
      counts[e.twilio_sid] = (counts[e.twilio_sid] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([twilio_sid, count]) => ({ twilio_sid, count }));
  }

  return data || [];
}

// =====================================================
// ORGANIZATION STATUS CHECK
// =====================================================

export async function getOrganizationStatus(organizationId: string): Promise<{
  status: string;
  billing_status: string;
  has_nevermiss: boolean;
  phone_provisioned: boolean;
}> {
  const supabase = getAdminSupabase();

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('status, billing_status')
    .eq('id', organizationId)
    .single();

  if (orgError) throw orgError;

  const { data: settings } = await supabase
    .from('nevermiss_settings')
    .select('phone_number')
    .eq('organization_id', organizationId)
    .single();

  return {
    status: org?.status || 'unknown',
    billing_status: org?.billing_status || 'unknown',
    has_nevermiss: !!settings,
    phone_provisioned: !!settings?.phone_number,
  };
}

// =====================================================
// ERROR CODE REFERENCE
// =====================================================

export const TWILIO_ERROR_CODES: Record<string, { meaning: string; fix: string }> = {
  '21211': {
    meaning: 'Invalid phone number',
    fix: 'Verify forward_to number format (+1XXXXXXXXXX)',
  },
  '21214': {
    meaning: 'Cannot route to number',
    fix: 'Carrier issue, try different number',
  },
  '21610': {
    meaning: 'Recipient blocked sender',
    fix: 'Customer needs to unblock or opted out (text START)',
  },
  '30003': {
    meaning: 'Unreachable',
    fix: 'Phone off or no service',
  },
  '30004': {
    meaning: 'Blocked',
    fix: 'Customer blocked the number',
  },
  '30005': {
    meaning: 'Unknown destination',
    fix: 'Invalid phone number',
  },
  '30006': {
    meaning: 'Landline',
    fix: "Can't send SMS to landline",
  },
  '30007': {
    meaning: 'Carrier violation',
    fix: 'Content filtered (rare)',
  },
};

export const CONVERSATION_STATES: Record<string, string> = {
  greeting_sent: 'Initial greeting sent, awaiting response',
  capturing_need: 'Capturing service needed',
  capturing_address: 'Capturing address',
  capturing_urgency: 'Determining urgency',
  capturing_time: 'Capturing preferred time',
  confirming: 'Confirming details',
  offering_slots: 'Offering calendar slots',
  awaiting_booking_confirm: 'Waiting for booking confirmation',
  booking_confirmed: 'Booking confirmed',
  awaiting_owner: 'Waiting for owner action',
  lead_captured: 'Lead successfully captured',
  completed: 'Conversation completed',
  abandoned: 'Customer abandoned',
  opted_out: 'Customer opted out (STOP)',
  blocked_spam: 'Blocked for abuse/spam',
};
