// =====================================================
// NEVERMISS DASHBOARD LIBRARY
// Agent-facing dashboard for monitoring AI SMS performance
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type {
  NevermissConversation,
  NevermissMessage,
  ClientSmsUsage,
  NevermissDashboardSummary,
  NevermissClientSummary,
  NevermissAlert,
} from './types';

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

/**
 * Get portfolio summary for agent's NeverMiss clients
 */
export async function getNevermissDashboardSummary(
  agentId: string,
  period: 'this_month' | 'last_month' = 'this_month'
): Promise<NevermissDashboardSummary> {
  const supabase = createAdminClient();

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;

  if (period === 'this_month') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  }

  // Get agent's clients with NeverMiss
  const { data: clients } = await supabase
    .from('crm_accounts')
    .select('id, business_name')
    .eq('agent_id', agentId)
    .in('plan_type', ['nevermiss', 'blue_pro', 'blue_enterprise', 'gold_starter', 'gold_pro', 'gold_enterprise']);

  if (!clients || clients.length === 0) {
    return {
      total_missed_calls: 0,
      total_leads_captured: 0,
      total_appointments_booked: 0,
      response_rate: 0,
      missed_calls_change: 0,
    };
  }

  const clientIds = clients.map(c => c.id);

  // Get current period stats
  const { data: currentConversations } = await supabase
    .from('nevermiss_conversations')
    .select('id, status')
    .in('client_id', clientIds)
    .gte('started_at', periodStart.toISOString())
    .lte('started_at', periodEnd.toISOString());

  // Get previous period stats for comparison
  const { data: prevConversations } = await supabase
    .from('nevermiss_conversations')
    .select('id, status')
    .in('client_id', clientIds)
    .gte('started_at', prevPeriodStart.toISOString())
    .lte('started_at', prevPeriodEnd.toISOString());

  const current = currentConversations || [];
  const prev = prevConversations || [];

  const totalMissedCalls = current.length;
  const leadsCapured = current.filter(c => c.status === 'captured' || c.status === 'booked').length;
  const appointmentsBooked = current.filter(c => c.status === 'booked').length;
  const responded = current.filter(c => c.status !== 'no_response').length;
  const responseRate = totalMissedCalls > 0 ? Math.round((responded / totalMissedCalls) * 100) : 0;

  const prevTotal = prev.length;
  const missedCallsChange = prevTotal > 0
    ? Math.round(((totalMissedCalls - prevTotal) / prevTotal) * 100)
    : 0;

  return {
    total_missed_calls: totalMissedCalls,
    total_leads_captured: leadsCapured,
    total_appointments_booked: appointmentsBooked,
    response_rate: responseRate,
    missed_calls_change: missedCallsChange,
  };
}

// =====================================================
// CLIENT LIST
// =====================================================

/**
 * Get list of all clients with NeverMiss and their usage
 */
export async function getNevermissClients(
  agentId: string,
  filter?: 'all' | 'near_cap' | 'over_cap' | 'low_usage' | 'healthy'
): Promise<NevermissClientSummary[]> {
  const supabase = createAdminClient();

  // Get agent's clients with NeverMiss plans
  const { data: clients, error } = await supabase
    .from('crm_accounts')
    .select('id, business_name, plan_type')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .in('plan_type', ['nevermiss', 'blue_pro', 'blue_enterprise', 'gold_starter', 'gold_pro', 'gold_enterprise']);

  if (error || !clients) {
    return [];
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const results: NevermissClientSummary[] = [];

  for (const client of clients) {
    // Get SMS usage for current period
    const { data: usage } = await supabase
      .from('client_sms_usage')
      .select('sms_sent, sms_cap, leads_captured')
      .eq('client_id', client.id)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    const smsCap = getSmsCap(client.plan_type);
    const smsUsed = usage?.sms_sent || 0;
    const leadsCapured = usage?.leads_captured || 0;
    const usagePercentage = smsCap > 0 ? Math.round((smsUsed / smsCap) * 100) : 0;

    let status: NevermissClientSummary['status'];
    if (usagePercentage > 100) {
      status = 'over_cap';
    } else if (usagePercentage >= 80) {
      status = 'near_cap';
    } else if (usagePercentage < 20) {
      status = 'low_usage';
    } else {
      status = 'healthy';
    }

    // Apply filter
    if (filter && filter !== 'all' && filter !== status) {
      continue;
    }

    results.push({
      client_id: client.id,
      client_name: client.business_name,
      plan_type: client.plan_type,
      sms_used: smsUsed,
      sms_cap: smsCap,
      leads_captured: leadsCapured,
      status,
      usage_percentage: usagePercentage,
    });
  }

  // Sort by usage percentage descending
  results.sort((a, b) => b.usage_percentage - a.usage_percentage);

  return results;
}

/**
 * Get SMS cap for a given plan type
 */
function getSmsCap(planType: string): number {
  const caps: Record<string, number> = {
    'nevermiss': 700,
    'blue_pro': 1000,
    'blue_enterprise': 1500,
    'gold_starter': 700,
    'gold_pro': 1000,
    'gold_enterprise': 1500,
  };
  return caps[planType] || 700;
}

// =====================================================
// CLIENT DETAIL
// =====================================================

/**
 * Get detailed NeverMiss info for a specific client
 */
export async function getNevermissClientDetail(clientId: string): Promise<{
  client: {
    id: string;
    name: string;
    plan_type: string;
    phone_number?: string;
  };
  usage: {
    sms_used: number;
    sms_cap: number;
    leads_captured: number;
    appointments_booked: number;
    percentage: number;
  };
  stats: {
    missed_calls: number;
    capture_rate: number;
    booking_rate: number;
    avg_response_time_seconds: number;
  };
  quality_breakdown: {
    booked: number;
    needs_callback: number;
    no_response: number;
  };
  trend_data: {
    month: string;
    sms_used: number;
  }[];
} | null> {
  const supabase = createAdminClient();

  // Get client info
  const { data: client } = await supabase
    .from('crm_accounts')
    .select('id, business_name, plan_type, phone')
    .eq('id', clientId)
    .single();

  if (!client) return null;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get current period usage
  const { data: usage } = await supabase
    .from('client_sms_usage')
    .select('*')
    .eq('client_id', clientId)
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .single();

  // Get conversations for current month
  const { data: conversations } = await supabase
    .from('nevermiss_conversations')
    .select('id, status, started_at, last_message_at')
    .eq('client_id', clientId)
    .gte('started_at', periodStart.toISOString());

  const convs = conversations || [];
  const smsCap = getSmsCap(client.plan_type);
  const smsUsed = usage?.sms_sent || 0;
  const leadsCapured = usage?.leads_captured || 0;
  const appointmentsBooked = usage?.appointments_booked || 0;

  const missedCalls = convs.length;
  const captured = convs.filter(c => c.status === 'captured' || c.status === 'booked').length;
  const booked = convs.filter(c => c.status === 'booked').length;
  const noResponse = convs.filter(c => c.status === 'no_response').length;
  const needsCallback = convs.filter(c => c.status === 'captured').length;

  // Calculate average response time
  let totalResponseTime = 0;
  let responseCount = 0;
  for (const conv of convs) {
    if (conv.last_message_at && conv.started_at) {
      const start = new Date(conv.started_at).getTime();
      const response = new Date(conv.last_message_at).getTime();
      totalResponseTime += (response - start) / 1000;
      responseCount++;
    }
  }
  const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

  // Get trend data for last 6 months
  const trendData: { month: string; sms_used: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { data: monthUsage } = await supabase
      .from('client_sms_usage')
      .select('sms_sent')
      .eq('client_id', clientId)
      .eq('period_start', monthDate.toISOString().split('T')[0])
      .single();

    trendData.push({
      month: monthDate.toLocaleString('default', { month: 'short' }),
      sms_used: monthUsage?.sms_sent || 0,
    });
  }

  return {
    client: {
      id: client.id,
      name: client.business_name,
      plan_type: client.plan_type,
      phone_number: client.phone,
    },
    usage: {
      sms_used: smsUsed,
      sms_cap: smsCap,
      leads_captured: leadsCapured,
      appointments_booked: appointmentsBooked,
      percentage: smsCap > 0 ? Math.round((smsUsed / smsCap) * 100) : 0,
    },
    stats: {
      missed_calls: missedCalls,
      capture_rate: missedCalls > 0 ? Math.round((captured / missedCalls) * 100) : 0,
      booking_rate: captured > 0 ? Math.round((booked / captured) * 100) : 0,
      avg_response_time_seconds: avgResponseTime,
    },
    quality_breakdown: {
      booked,
      needs_callback: needsCallback,
      no_response: noResponse,
    },
    trend_data: trendData,
  };
}

// =====================================================
// CONVERSATIONS
// =====================================================

/**
 * Get recent conversations for a client
 */
export async function getNevermissConversations(
  clientId: string,
  limit: number = 20,
  offset: number = 0
): Promise<NevermissConversation[]> {
  const supabase = createAdminClient();

  const { data: conversations, error } = await supabase
    .from('nevermiss_conversations')
    .select(`
      *,
      messages:nevermiss_messages(*)
    `)
    .eq('client_id', clientId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !conversations) {
    return [];
  }

  return conversations.map(conv => ({
    ...conv,
    messages: (conv.messages || []).sort(
      (a: NevermissMessage, b: NevermissMessage) =>
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    ),
  }));
}

/**
 * Get a single conversation with all messages
 */
export async function getNevermissConversation(
  conversationId: string
): Promise<NevermissConversation | null> {
  const supabase = createAdminClient();

  const { data: conversation, error } = await supabase
    .from('nevermiss_conversations')
    .select(`
      *,
      messages:nevermiss_messages(*)
    `)
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return null;
  }

  return {
    ...conversation,
    messages: (conversation.messages || []).sort(
      (a: NevermissMessage, b: NevermissMessage) =>
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    ),
  };
}

// =====================================================
// ALERTS
// =====================================================

/**
 * Get NeverMiss alerts for agent's clients
 */
export async function getNevermissAlerts(agentId: string): Promise<NevermissAlert[]> {
  const supabase = createAdminClient();
  const alerts: NevermissAlert[] = [];

  // Get all clients with their usage
  const clients = await getNevermissClients(agentId);

  // Check for near cap and over cap
  const nearCap = clients.filter(c => c.status === 'near_cap');
  const overCap = clients.filter(c => c.status === 'over_cap');
  const lowUsage = clients.filter(c => c.status === 'low_usage');

  for (const client of overCap) {
    alerts.push({
      type: 'over_cap',
      client_id: client.client_id,
      client_name: client.client_name,
      message: `${client.sms_used}/${client.sms_cap} SMS (${client.usage_percentage}%)`,
      details: 'Great upgrade candidate!',
    });
  }

  for (const client of nearCap) {
    alerts.push({
      type: 'near_cap',
      client_id: client.client_id,
      client_name: client.client_name,
      message: `${client.sms_used}/${client.sms_cap} SMS (${client.usage_percentage}%)`,
      details: 'Approaching SMS cap',
    });
  }

  for (const client of lowUsage) {
    // Check how long they've had the service
    const { data: account } = await supabase
      .from('crm_accounts')
      .select('created_at')
      .eq('id', client.client_id)
      .single();

    if (account) {
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceStart >= 14) {
        alerts.push({
          type: 'low_usage',
          client_id: client.client_id,
          client_name: client.client_name,
          message: `Only ${client.sms_used}/${client.sms_cap} SMS used (${client.usage_percentage}%)`,
          details: `Started ${daysSinceStart} days ago. Possible setup issue?`,
        });
      }
    }
  }

  // Check for declining capture rates (compare last 2 months)
  for (const client of clients) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const { data: thisMonthUsage } = await supabase
      .from('client_sms_usage')
      .select('sms_sent, leads_captured')
      .eq('client_id', client.client_id)
      .eq('period_start', thisMonth.toISOString().split('T')[0])
      .single();

    const { data: lastMonthUsage } = await supabase
      .from('client_sms_usage')
      .select('sms_sent, leads_captured')
      .eq('client_id', client.client_id)
      .eq('period_start', lastMonth.toISOString().split('T')[0])
      .single();

    if (thisMonthUsage && lastMonthUsage && lastMonthUsage.sms_sent > 50) {
      const thisRate = thisMonthUsage.sms_sent > 0
        ? (thisMonthUsage.leads_captured / thisMonthUsage.sms_sent) * 100
        : 0;
      const lastRate = lastMonthUsage.sms_sent > 0
        ? (lastMonthUsage.leads_captured / lastMonthUsage.sms_sent) * 100
        : 0;

      if (lastRate - thisRate >= 15) {
        alerts.push({
          type: 'declining_rate',
          client_id: client.client_id,
          client_name: client.client_name,
          message: `Capture rate dropped ${Math.round(lastRate)}% → ${Math.round(thisRate)}%`,
          details: 'AI responses may need tuning',
        });
      }
    }
  }

  return alerts;
}

// =====================================================
// SMS USAGE
// =====================================================

/**
 * Get SMS usage overview for all agent's clients
 */
export async function getSmsUsageOverview(agentId: string): Promise<{
  total_clients: number;
  total_sms_sent: number;
  total_sms_capacity: number;
  overall_usage_percent: number;
  by_status: {
    over_cap: number;
    near_cap: number;
    healthy: number;
    low_usage: number;
  };
}> {
  const clients = await getNevermissClients(agentId);

  const totalSmsSent = clients.reduce((sum, c) => sum + c.sms_used, 0);
  const totalSmsCapacity = clients.reduce((sum, c) => sum + c.sms_cap, 0);

  return {
    total_clients: clients.length,
    total_sms_sent: totalSmsSent,
    total_sms_capacity: totalSmsCapacity,
    overall_usage_percent: totalSmsCapacity > 0
      ? Math.round((totalSmsSent / totalSmsCapacity) * 100)
      : 0,
    by_status: {
      over_cap: clients.filter(c => c.status === 'over_cap').length,
      near_cap: clients.filter(c => c.status === 'near_cap').length,
      healthy: clients.filter(c => c.status === 'healthy').length,
      low_usage: clients.filter(c => c.status === 'low_usage').length,
    },
  };
}
