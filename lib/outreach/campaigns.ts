// =====================================================
// OUTREACH MODULE - CAMPAIGNS
// Campaign management functions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  OutreachCampaign,
  CampaignType,
  CampaignStatus,
  CreateCampaignInput,
} from '@/types/outreach';

// =====================================================
// GET CAMPAIGNS
// =====================================================

/**
 * Get all campaigns
 */
export async function getCampaigns(filters?: {
  status?: CampaignStatus[];
  type?: CampaignType[];
}): Promise<OutreachCampaign[]> {
  const supabase = await createClient();

  let query = supabase
    .from('outreach_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.type && filters.type.length > 0) {
    query = query.in('campaign_type', filters.type);
  }

  const { data } = await query;

  return data || [];
}

/**
 * Get a campaign by ID
 */
export async function getCampaign(id: string): Promise<OutreachCampaign | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('outreach_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

/**
 * Get active campaign by type (for auto-triggering)
 */
export async function getActiveCampaignByType(
  type: CampaignType
): Promise<OutreachCampaign | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('outreach_campaigns')
    .select('*')
    .eq('campaign_type', type)
    .eq('status', 'active')
    .limit(1)
    .single();

  return data;
}

// =====================================================
// CREATE CAMPAIGN
// =====================================================

/**
 * Create a new campaign
 */
export async function createCampaign(
  input: CreateCampaignInput,
  createdBy?: string
): Promise<{ success: boolean; campaign?: OutreachCampaign; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('outreach_campaigns')
    .insert({
      name: input.name,
      description: input.description,
      campaign_type: input.campaign_type,
      status: 'draft',
      initial_message_template: input.initial_message_template,
      ai_system_prompt: input.ai_system_prompt,
      ai_goal: input.ai_goal || 'qualify_and_book',
      trigger_type: input.trigger_type || 'immediate',
      trigger_delay_minutes: input.trigger_delay_minutes || 0,
      sending_window_start: input.sending_window_start || '09:00',
      sending_window_end: input.sending_window_end || '18:00',
      sending_days: input.sending_days || [1, 2, 3, 4, 5],
      daily_send_limit: input.daily_send_limit,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, campaign: data };
}

// =====================================================
// UPDATE CAMPAIGN
// =====================================================

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: string,
  updates: Partial<Omit<OutreachCampaign, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; campaign?: OutreachCampaign; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('outreach_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, campaign: data };
}

/**
 * Start a campaign
 */
export async function startCampaign(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_campaigns')
    .update({ status: 'active' })
    .eq('id', id)
    .in('status', ['draft', 'paused']);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_campaigns')
    .update({ status: 'paused' })
    .eq('id', id)
    .eq('status', 'active');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Complete a campaign
 */
export async function completeCampaign(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('outreach_campaigns')
    .update({ status: 'completed' })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// CAMPAIGN STATS
// =====================================================

/**
 * Update campaign stats (called after contact actions)
 */
export async function updateCampaignStats(
  campaignId: string
): Promise<void> {
  const supabase = await createClient();

  // Get contact counts
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('status')
    .eq('campaign_id', campaignId);

  if (!contacts) return;

  const stats = {
    contacts_total: contacts.length,
    contacts_messaged: contacts.filter(
      (c) => !['pending'].includes(c.status)
    ).length,
    contacts_replied: contacts.filter(
      (c) => !['pending', 'contacted'].includes(c.status)
    ).length,
    contacts_qualified: contacts.filter(
      (c) => ['qualified', 'call_scheduled', 'call_completed', 'converted'].includes(c.status)
    ).length,
    demos_booked: contacts.filter(
      (c) => ['call_scheduled', 'call_completed', 'converted'].includes(c.status)
    ).length,
    deals_closed: contacts.filter(
      (c) => c.status === 'converted'
    ).length,
  };

  await supabase
    .from('outreach_campaigns')
    .update(stats)
    .eq('id', campaignId);
}

// =====================================================
// CAMPAIGN TEMPLATES
// =====================================================

/**
 * Get default message templates by campaign type
 */
export function getDefaultTemplate(type: CampaignType): string {
  switch (type) {
    case 'website_instant':
      return `Hey {{name}}! Just saw you checked out Trades Captain. I help {{trade}} businesses get more calls — what's your biggest challenge right now?`;

    case 'sms_widget':
      return `Hey! Thanks for reaching out 👋 I'm Alex from Trades Captain. What kind of trade business do you have?`;

    case 'referral':
      return `Hey {{name}}! {{referrer_name}} from {{referrer_company}} thought you might be interested in what we do at Trades Captain. They've been seeing great results. Got a minute to chat about your {{trade}} business?`;

    case 'reengagement':
      return `Hey {{name}}! It's been a while since we chatted. Just checking in — has anything changed with your marketing needs?`;

    case 'scheduled':
      return `Hey {{name}}! We have some exciting updates at Trades Captain that could help your {{trade}} business. Want to hear more?`;

    default:
      return `Hey {{name}}! Thanks for your interest in Trades Captain. How can we help your business today?`;
  }
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  }

  // Clean up any remaining placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  // Clean up double spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}
