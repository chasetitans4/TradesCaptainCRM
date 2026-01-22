// =====================================================
// OUTREACH SCHEDULING - QUERY FUNCTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type { ScheduledCallWithContact } from '@/types/outreach';

// =====================================================
// GET SCHEDULED CALLS
// =====================================================

export async function getScheduledCallsForAgent(
  agentId: string,
  date: Date
): Promise<ScheduledCallWithContact[]> {
  const supabase = await createClient();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from('scheduled_calls')
    .select(`
      *,
      contact:outreach_contacts(*),
      agent:admin_users!scheduled_calls_agent_id_fkey(id, full_name, email)
    `)
    .eq('agent_id', agentId)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .not('status', 'in', '("cancelled","rescheduled")')
    .order('scheduled_at', { ascending: true });

  return (data || []) as ScheduledCallWithContact[];
}

export async function getPendingAdminCalls(): Promise<ScheduledCallWithContact[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('scheduled_calls')
    .select(`
      *,
      contact:outreach_contacts(*),
      agent:admin_users!scheduled_calls_agent_id_fkey(id, full_name, email)
    `)
    .eq('status', 'pending_admin_approval')
    .order('created_at', { ascending: true });

  return (data || []) as ScheduledCallWithContact[];
}

export async function getScheduledCallById(callId: string): Promise<ScheduledCallWithContact | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('scheduled_calls')
    .select(`
      *,
      contact:outreach_contacts(*),
      agent:admin_users!scheduled_calls_agent_id_fkey(id, full_name, email)
    `)
    .eq('id', callId)
    .single();

  return data as ScheduledCallWithContact | null;
}

export async function getUpcomingCallsForContact(
  contactId: string
): Promise<ScheduledCallWithContact[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('scheduled_calls')
    .select(`
      *,
      contact:outreach_contacts(*),
      agent:admin_users!scheduled_calls_agent_id_fkey(id, full_name, email)
    `)
    .eq('contact_id', contactId)
    .gte('scheduled_at', new Date().toISOString())
    .not('status', 'in', '("cancelled","rescheduled","completed","no_show")')
    .order('scheduled_at', { ascending: true });

  return (data || []) as ScheduledCallWithContact[];
}
