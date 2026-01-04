// =====================================================
// OUTREACH MODULE - CONTACTS
// Contact management functions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  OutreachContact,
  OutreachContactWithRelations,
  OutreachContactStatus,
  InterestLevel,
  CreateOutreachContactInput,
  OutreachContactFilters,
  PaginatedOutreachResponse,
} from '@/types/outreach';
import { recordConsent, detectTimezoneFromPhone, normalizePhone, isSafeToContact } from './compliance';
import { updateCampaignStats } from './campaigns';
import { logger } from '@/lib/logger';
const outreachLogger = logger.child({ context: 'outreach.contacts' });

// =====================================================
// GET CONTACTS
// =====================================================

/**
 * Get contacts with pagination and filters
 */
export async function getContacts(
  filters?: OutreachContactFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedOutreachResponse<OutreachContact>> {
  const supabase = await createClient();

  let query = supabase
    .from('outreach_contacts')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.source && filters.source.length > 0) {
    query = query.in('source', filters.source);
  }

  if (filters?.interest_level && filters.interest_level.length > 0) {
    query = query.in('interest_level', filters.interest_level);
  }

  if (filters?.assigned_agent_id) {
    query = query.eq('assigned_agent_id', filters.assigned_agent_id);
  }

  if (filters?.campaign_id) {
    query = query.eq('campaign_id', filters.campaign_id);
  }

  if (filters?.overflow_to_admin !== undefined) {
    query = query.eq('overflow_to_admin', filters.overflow_to_admin);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  if (filters?.date_range) {
    query = query
      .gte('created_at', filters.date_range.start)
      .lte('created_at', filters.date_range.end);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    outreachLogger.error({
      msg: 'Error getting contacts',
      filters,
      page,
      pageSize,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return {
      data: [],
      total: 0,
      page,
      page_size: pageSize,
      has_more: false,
    };
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    page_size: pageSize,
    has_more: (count || 0) > page * pageSize,
  };
}

/**
 * Get a single contact by ID
 */
export async function getContact(id: string): Promise<OutreachContact | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

/**
 * Get contact with all relations
 */
export async function getContactWithRelations(
  id: string
): Promise<OutreachContactWithRelations | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('outreach_contacts')
    .select(`
      *,
      campaign:outreach_campaigns(*),
      conversation:outreach_conversations(*),
      scheduled_call:scheduled_calls(*),
      assigned_agent:admin_users(id, name, email)
    `)
    .eq('id', id)
    .single();

  return data as OutreachContactWithRelations | null;
}

/**
 * Get contact by phone number
 */
export async function getContactByPhone(phone: string): Promise<OutreachContact | null> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  const { data } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('phone', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

/**
 * Get pending admin contacts (overflow)
 */
export async function getPendingAdminContacts(): Promise<OutreachContact[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('status', 'pending_admin')
    .eq('overflow_to_admin', true)
    .order('overflow_at', { ascending: true });

  return data || [];
}

// =====================================================
// CREATE CONTACT
// =====================================================

/**
 * Create a new outreach contact
 */
export async function createContact(
  input: CreateOutreachContactInput,
  consentData?: {
    consent_type: 'express_written' | 'express' | 'implied';
    consent_source: 'website_form' | 'referral_submit' | 'inbound_inquiry' | 'sms_widget';
    consent_ip?: string;
    consent_user_agent?: string;
    consent_form_url?: string;
  }
): Promise<{ success: boolean; contact?: OutreachContact; error?: string }> {
  const supabase = await createClient();

  // Normalize phone
  const normalizedPhone = normalizePhone(input.phone);

  // Check if contact already exists
  const existing = await getContactByPhone(normalizedPhone);
  if (existing) {
    return {
      success: false,
      error: 'Contact with this phone number already exists',
      contact: existing,
    };
  }

  // Check if safe to contact
  const safetyCheck = await isSafeToContact(normalizedPhone);
  if (!safetyCheck.safe) {
    return {
      success: false,
      error: `Cannot create contact: ${safetyCheck.reason}`,
    };
  }

  // Record consent if provided
  let consentId: string | undefined;
  if (consentData) {
    const consent = await recordConsent({
      phone: normalizedPhone,
      ...consentData,
    });
    consentId = consent?.id;
  }

  // Detect timezone
  const timezoneResult = await detectTimezoneFromPhone(normalizedPhone);

  // Create contact
  const { data, error } = await supabase
    .from('outreach_contacts')
    .insert({
      phone: normalizedPhone,
      name: input.name,
      company_name: input.company_name,
      email: input.email,
      trade: input.trade,
      city: input.city,
      state: input.state,
      source: input.source,
      source_campaign: input.source_campaign,
      source_details: input.source_details,
      referrer_client_id: input.referrer_client_id,
      campaign_id: input.campaign_id,
      consent_id: consentId,
      timezone: timezoneResult.timezone,
      timezone_source: timezoneResult.source,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update campaign stats if assigned
  if (input.campaign_id) {
    await updateCampaignStats(input.campaign_id);
  }

  return { success: true, contact: data };
}

// =====================================================
// UPDATE CONTACT
// =====================================================

/**
 * Update a contact
 */
export async function updateContact(
  id: string,
  updates: Partial<Omit<OutreachContact, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; contact?: OutreachContact; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('outreach_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update campaign stats if campaign changed
  if (updates.campaign_id) {
    await updateCampaignStats(updates.campaign_id);
  }

  return { success: true, contact: data };
}

/**
 * Update contact status
 */
export async function updateContactStatus(
  id: string,
  status: OutreachContactStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updates: Partial<OutreachContact> = { status };

  // Set converted_at if status is converted
  if (status === 'converted') {
    updates.converted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('outreach_contacts')
    .update(updates)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Get contact to update campaign stats
  const contact = await getContact(id);
  if (contact?.campaign_id) {
    await updateCampaignStats(contact.campaign_id);
  }

  return { success: true };
}

/**
 * Assign contact to agent
 */
export async function assignContactToAgent(
  contactId: string,
  agentId: string,
  assignedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updates: Partial<OutreachContact> = {
    assigned_agent_id: agentId,
    overflow_to_admin: false,
  };

  // If this is an admin assignment from overflow
  if (assignedBy) {
    updates.admin_assigned_by = assignedBy;
    updates.admin_assigned_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('outreach_contacts')
    .update(updates)
    .eq('id', contactId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark contact for admin overflow
 */
export async function markForAdminOverflow(
  contactId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_contacts')
    .update({
      status: 'pending_admin',
      overflow_to_admin: true,
      overflow_reason: reason,
      overflow_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// CONTACT SCORING
// =====================================================

/**
 * Update contact score
 */
export async function updateContactScore(
  id: string,
  score: number,
  breakdown?: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Determine interest level from score
  let interestLevel: InterestLevel;
  if (score >= 70) {
    interestLevel = 'hot';
  } else if (score >= 40) {
    interestLevel = 'warm';
  } else {
    interestLevel = 'cold';
  }

  const { error } = await supabase
    .from('outreach_contacts')
    .update({
      score: Math.max(0, Math.min(100, score)),
      score_breakdown: breakdown,
      interest_level: interestLevel,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Adjust contact score
 */
export async function adjustContactScore(
  id: string,
  adjustment: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {

  // Get current score
  const contact = await getContact(id);
  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  const newScore = Math.max(0, Math.min(100, (contact.score || 0) + adjustment));
  const breakdown = {
    ...(contact.score_breakdown || {}),
    [reason || 'adjustment']: adjustment,
  };

  return updateContactScore(id, newScore, breakdown);
}

// =====================================================
// CONVERSION
// =====================================================

/**
 * Mark contact as converted
 */
export async function markContactConverted(
  id: string,
  clientId: string,
  plan: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_contacts')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
      converted_client_id: clientId,
      converted_plan: plan,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update campaign stats
  const contact = await getContact(id);
  if (contact?.campaign_id) {
    await updateCampaignStats(contact.campaign_id);
  }

  return { success: true };
}

// =====================================================
// BULK OPERATIONS
// =====================================================

/**
 * Bulk assign contacts to agent
 */
export async function bulkAssignContacts(
  contactIds: string[],
  agentId: string,
  assignedBy?: string
): Promise<{ success: boolean; assigned: number; error?: string }> {
  const supabase = await createClient();

  const updates: Partial<OutreachContact> = {
    assigned_agent_id: agentId,
    overflow_to_admin: false,
  };

  if (assignedBy) {
    updates.admin_assigned_by = assignedBy;
    updates.admin_assigned_at = new Date().toISOString();
  }

  const { error, count } = await supabase
    .from('outreach_contacts')
    .update(updates)
    .in('id', contactIds);

  if (error) {
    return { success: false, assigned: 0, error: error.message };
  }

  return { success: true, assigned: count || 0 };
}

/**
 * Bulk update contact status
 */
export async function bulkUpdateStatus(
  contactIds: string[],
  status: OutreachContactStatus
): Promise<{ success: boolean; updated: number; error?: string }> {
  const supabase = await createClient();

  const updates: Partial<OutreachContact> = { status };

  if (status === 'converted') {
    updates.converted_at = new Date().toISOString();
  }

  const { error, count } = await supabase
    .from('outreach_contacts')
    .update(updates)
    .in('id', contactIds);

  if (error) {
    return { success: false, updated: 0, error: error.message };
  }

  return { success: true, updated: count || 0 };
}
