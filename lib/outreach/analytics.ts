// =====================================================
// OUTREACH MODULE - ANALYTICS
// Dashboard stats and reporting functions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  OutreachDashboardStats,
  AgentPerformanceStats,
} from '@/types/outreach';

// =====================================================
// DASHBOARD STATS
// =====================================================

/**
 * Get outreach dashboard statistics
 */
export async function getDashboardStats(): Promise<OutreachDashboardStats> {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Today's stats
  const { data: todayContacts } = await supabase
    .from('outreach_contacts')
    .select('status')
    .gte('created_at', todayStart.toISOString());

  const { data: todayReplies } = await supabase
    .from('outreach_contacts')
    .select('id')
    .gte('first_reply_at', todayStart.toISOString());

  const { data: todayCalls } = await supabase
    .from('scheduled_calls')
    .select('status')
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', now.toISOString());

  // Week stats
  const { data: weekContacts } = await supabase
    .from('outreach_contacts')
    .select('status')
    .gte('created_at', weekStart.toISOString());

  const { data: weekReplies } = await supabase
    .from('outreach_contacts')
    .select('id')
    .gte('first_reply_at', weekStart.toISOString());

  const { data: weekCalls } = await supabase
    .from('scheduled_calls')
    .select('status')
    .gte('scheduled_at', weekStart.toISOString());

  // Speed metrics (average over last 7 days)
  const { data: speedData } = await supabase
    .from('speed_metrics')
    .select('form_to_first_text_seconds, reply_to_booked_seconds, met_60_second_target')
    .gte('created_at', weekStart.toISOString());

  // Conversion funnel
  const { data: funnelData } = await supabase
    .from('outreach_contacts')
    .select('status')
    .gte('created_at', weekStart.toISOString());

  // Calculate stats
  const today = {
    new_leads: todayContacts?.length || 0,
    replies: todayReplies?.length || 0,
    qualified: todayContacts?.filter((c) =>
      ['qualified', 'call_scheduled', 'call_completed', 'converted'].includes(c.status)
    ).length || 0,
    calls_scheduled: todayCalls?.filter((c) => c.status === 'scheduled').length || 0,
    calls_completed: todayCalls?.filter((c) => c.status === 'completed').length || 0,
  };

  const week = {
    new_leads: weekContacts?.length || 0,
    replies: weekReplies?.length || 0,
    qualified: weekContacts?.filter((c) =>
      ['qualified', 'call_scheduled', 'call_completed', 'converted'].includes(c.status)
    ).length || 0,
    calls_scheduled: weekCalls?.filter((c) => c.status === 'scheduled').length || 0,
    calls_completed: weekCalls?.filter((c) => c.status === 'completed').length || 0,
    conversions: weekContacts?.filter((c) => c.status === 'converted').length || 0,
  };

  // Calculate speed metrics
  const speeds = speedData || [];
  const avgFirstText = speeds.length > 0
    ? speeds.reduce((sum, s) => sum + (s.form_to_first_text_seconds || 0), 0) / speeds.length
    : 0;
  const avgReplyToBooked = speeds.length > 0
    ? speeds.reduce((sum, s) => sum + (s.reply_to_booked_seconds || 0), 0) / speeds.length
    : 0;
  const under60Percent = speeds.length > 0
    ? (speeds.filter((s) => s.met_60_second_target).length / speeds.length) * 100
    : 0;

  // Conversion funnel
  const funnel = funnelData || [];
  const funnelStats = {
    contacted: funnel.filter((c) => c.status !== 'pending').length,
    replied: funnel.filter((c) =>
      !['pending', 'contacted'].includes(c.status)
    ).length,
    qualified: funnel.filter((c) =>
      ['qualified', 'call_scheduled', 'call_completed', 'converted'].includes(c.status)
    ).length,
    scheduled: funnel.filter((c) =>
      ['call_scheduled', 'call_completed', 'converted'].includes(c.status)
    ).length,
    converted: funnel.filter((c) => c.status === 'converted').length,
  };

  return {
    today,
    week,
    speed_metrics: {
      avg_first_text_seconds: Math.round(avgFirstText),
      avg_reply_to_booked_seconds: Math.round(avgReplyToBooked),
      percent_under_60_seconds: Math.round(under60Percent),
    },
    conversion_funnel: funnelStats,
  };
}

// =====================================================
// AGENT PERFORMANCE
// =====================================================

/**
 * Get agent performance stats
 */
export async function getAgentPerformanceStats(
  agentId?: string
): Promise<AgentPerformanceStats[]> {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Get agents
  let agentQuery = supabase
    .from('admin_users')
    .select('id, name')
    .eq('role', 'agent')
    .eq('is_active', true);

  if (agentId) {
    agentQuery = agentQuery.eq('id', agentId);
  }

  const { data: agents } = await agentQuery;

  if (!agents) return [];

  const results: AgentPerformanceStats[] = [];

  for (const agent of agents) {
    // Today's calls
    const { data: todayCalls } = await supabase
      .from('scheduled_calls')
      .select('status, started_at, ended_at')
      .eq('agent_id', agent.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', now.toISOString());

    // Week's conversions
    const { data: weekConversions } = await supabase
      .from('outreach_contacts')
      .select('id')
      .eq('assigned_agent_id', agent.id)
      .eq('status', 'converted')
      .gte('converted_at', weekStart.toISOString());

    // Week's calls for conversion rate
    const { data: weekCalls } = await supabase
      .from('scheduled_calls')
      .select('status')
      .eq('agent_id', agent.id)
      .gte('scheduled_at', weekStart.toISOString())
      .eq('status', 'completed');

    // Calculate stats
    const calls = todayCalls || [];
    const completedCalls = calls.filter((c) => c.status === 'completed');
    const noShowCalls = calls.filter((c) => c.status === 'no_show');

    // Calculate average call duration
    let totalDuration = 0;
    let durationCount = 0;
    for (const call of completedCalls) {
      if (call.started_at && call.ended_at) {
        const start = new Date(call.started_at);
        const end = new Date(call.ended_at);
        totalDuration += (end.getTime() - start.getTime()) / 60000; // minutes
        durationCount++;
      }
    }

    const weekConversionCount = weekConversions?.length || 0;
    const weekCallsCount = weekCalls?.length || 0;
    const conversionRate = weekCallsCount > 0
      ? (weekConversionCount / weekCallsCount) * 100
      : 0;

    results.push({
      agent_id: agent.id,
      agent_name: agent.name,
      calls_today: calls.length,
      calls_completed_today: completedCalls.length,
      calls_no_show: noShowCalls.length,
      conversions_this_week: weekConversionCount,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      avg_call_duration_minutes: durationCount > 0
        ? Math.round((totalDuration / durationCount) * 10) / 10
        : 0,
    });
  }

  // Sort by conversions
  results.sort((a, b) => b.conversions_this_week - a.conversions_this_week);

  return results;
}

// =====================================================
// SPEED METRICS
// =====================================================

/**
 * Record speed metrics for a contact
 */
export async function recordSpeedMetrics(
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get contact
  const { data: contact } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  // Get call data
  const { data: call } = await supabase
    .from('scheduled_calls')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Calculate timestamps
  const formSubmittedAt = contact.created_at;
  const firstTextSentAt = contact.first_message_at;
  const firstReplyAt = contact.first_reply_at;
  const callBookedAt = contact.scheduled_call_id
    ? (await supabase
        .from('scheduled_calls')
        .select('created_at')
        .eq('id', contact.scheduled_call_id)
        .single()
      ).data?.created_at
    : null;
  const callCompletedAt = call?.ended_at;
  const closedAt = contact.converted_at;

  // Calculate durations
  let formToFirstTextSeconds: number | null = null;
  let firstTextToReplySeconds: number | null = null;
  let replyToQualifiedSeconds: number | null = null;
  let qualifiedToBookedSeconds: number | null = null;
  let replyToBookedSeconds: number | null = null;

  if (formSubmittedAt && firstTextSentAt) {
    formToFirstTextSeconds = Math.round(
      (new Date(firstTextSentAt).getTime() - new Date(formSubmittedAt).getTime()) / 1000
    );
  }

  if (firstTextSentAt && firstReplyAt) {
    firstTextToReplySeconds = Math.round(
      (new Date(firstReplyAt).getTime() - new Date(firstTextSentAt).getTime()) / 1000
    );
  }

  if (firstReplyAt && callBookedAt) {
    replyToBookedSeconds = Math.round(
      (new Date(callBookedAt).getTime() - new Date(firstReplyAt).getTime()) / 1000
    );
  }

  // Check if met targets
  const met60SecondTarget = formToFirstTextSeconds !== null && formToFirstTextSeconds <= 60;
  const met5MinuteReplyTarget = firstTextToReplySeconds !== null && firstTextToReplySeconds <= 300;
  const met30MinuteBookingTarget = replyToBookedSeconds !== null && replyToBookedSeconds <= 1800;

  // Insert or update speed metrics
  const { error } = await supabase
    .from('speed_metrics')
    .upsert({
      contact_id: contactId,
      form_submitted_at: formSubmittedAt,
      first_text_sent_at: firstTextSentAt,
      first_reply_at: firstReplyAt,
      call_booked_at: callBookedAt,
      call_completed_at: callCompletedAt,
      closed_at: closedAt,
      form_to_first_text_seconds: formToFirstTextSeconds,
      first_text_to_reply_seconds: firstTextToReplySeconds,
      reply_to_qualified_seconds: replyToQualifiedSeconds,
      qualified_to_booked_seconds: qualifiedToBookedSeconds,
      reply_to_booked_seconds: replyToBookedSeconds,
      met_60_second_target: met60SecondTarget,
      met_5_minute_reply_target: met5MinuteReplyTarget,
      met_30_minute_booking_target: met30MinuteBookingTarget,
    }, {
      onConflict: 'contact_id',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get speed-to-lead report
 */
export async function getSpeedReport(
  startDate: Date,
  endDate: Date
): Promise<{
  avg_first_text_seconds: number;
  avg_reply_seconds: number;
  avg_booking_seconds: number;
  percent_under_60: number;
  percent_under_5_min: number;
  percent_under_30_min: number;
  total_contacts: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('speed_metrics')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (!data || data.length === 0) {
    return {
      avg_first_text_seconds: 0,
      avg_reply_seconds: 0,
      avg_booking_seconds: 0,
      percent_under_60: 0,
      percent_under_5_min: 0,
      percent_under_30_min: 0,
      total_contacts: 0,
    };
  }

  const total = data.length;

  const avgFirstText = data.reduce((sum, m) => sum + (m.form_to_first_text_seconds || 0), 0) / total;
  const avgReply = data.reduce((sum, m) => sum + (m.first_text_to_reply_seconds || 0), 0) / total;
  const avgBooking = data.reduce((sum, m) => sum + (m.reply_to_booked_seconds || 0), 0) / total;

  const under60 = data.filter((m) => m.met_60_second_target).length;
  const under5Min = data.filter((m) => m.met_5_minute_reply_target).length;
  const under30Min = data.filter((m) => m.met_30_minute_booking_target).length;

  return {
    avg_first_text_seconds: Math.round(avgFirstText),
    avg_reply_seconds: Math.round(avgReply),
    avg_booking_seconds: Math.round(avgBooking),
    percent_under_60: Math.round((under60 / total) * 100),
    percent_under_5_min: Math.round((under5Min / total) * 100),
    percent_under_30_min: Math.round((under30Min / total) * 100),
    total_contacts: total,
  };
}

// =====================================================
// CAMPAIGN ANALYTICS
// =====================================================

/**
 * Get campaign performance comparison
 */
export async function getCampaignPerformance(): Promise<
  Array<{
    campaign_id: string;
    campaign_name: string;
    contacts: number;
    replied: number;
    reply_rate: number;
    qualified: number;
    qualification_rate: number;
    booked: number;
    booking_rate: number;
    converted: number;
    conversion_rate: number;
  }>
> {
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from('outreach_campaigns')
    .select('id, name, contacts_total, contacts_replied, contacts_qualified, demos_booked, deals_closed');

  if (!campaigns) return [];

  return campaigns.map((c) => ({
    campaign_id: c.id,
    campaign_name: c.name,
    contacts: c.contacts_total || 0,
    replied: c.contacts_replied || 0,
    reply_rate: c.contacts_total > 0
      ? Math.round((c.contacts_replied / c.contacts_total) * 100)
      : 0,
    qualified: c.contacts_qualified || 0,
    qualification_rate: c.contacts_replied > 0
      ? Math.round((c.contacts_qualified / c.contacts_replied) * 100)
      : 0,
    booked: c.demos_booked || 0,
    booking_rate: c.contacts_qualified > 0
      ? Math.round((c.demos_booked / c.contacts_qualified) * 100)
      : 0,
    converted: c.deals_closed || 0,
    conversion_rate: c.demos_booked > 0
      ? Math.round((c.deals_closed / c.demos_booked) * 100)
      : 0,
  }));
}
