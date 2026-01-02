// =====================================================
// REPORTING DASHBOARD LIBRARY
// Comprehensive reporting for agents and managers
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type {
  PerformanceReport,
  LeadSourceReport,
  RetentionReport,
  TeamLeaderboard,
  PipelineStage,
  PipelineLeadSource,
} from './types';

// =====================================================
// PERFORMANCE REPORT
// =====================================================

/**
 * Get agent performance report
 */
export async function getPerformanceReport(
  agentId: string,
  period: 'this_month' | 'last_month' | 'this_quarter' | 'this_year'
): Promise<PerformanceReport> {
  const supabase = createAdminClient();

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  let prevPeriodStart: Date;
  let label: string;

  switch (period) {
    case 'this_month':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      label = periodStart.toLocaleString('default', { month: 'long', year: 'numeric' });
      break;
    case 'last_month':
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      label = periodStart.toLocaleString('default', { month: 'long', year: 'numeric' });
      break;
    case 'this_quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      prevPeriodStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      label = `Q${quarter + 1} ${now.getFullYear()}`;
      break;
    case 'this_year':
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
      prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
      label = now.getFullYear().toString();
      break;
    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      label = 'This Month';
  }

  // Get won deals in period
  const { data: wonDeals } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('agent_id', agentId)
    .eq('stage', 'won')
    .gte('converted_at', periodStart.toISOString())
    .lte('converted_at', periodEnd.toISOString());

  // Get previous period won deals
  const { data: prevWonDeals } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('agent_id', agentId)
    .eq('stage', 'won')
    .gte('converted_at', prevPeriodStart.toISOString())
    .lt('converted_at', periodStart.toISOString());

  // Get all leads for pipeline health
  const { data: allLeads } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('agent_id', agentId);

  const deals = wonDeals || [];
  const prevDeals = prevWonDeals || [];
  const leads = allLeads || [];

  const dealsWon = deals.length;
  const prevDealsWon = prevDeals.length;
  const dealsWonChange = prevDealsWon > 0
    ? Math.round(((dealsWon - prevDealsWon) / prevDealsWon) * 100)
    : 0;

  const revenue = deals.reduce((sum, d) => sum + (d.estimated_value_cents || 0), 0) / 100;
  const prevRevenue = prevDeals.reduce((sum, d) => sum + (d.estimated_value_cents || 0), 0) / 100;
  const revenueChange = prevRevenue > 0
    ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
    : 0;

  const avgDeal = dealsWon > 0 ? Math.round(revenue / dealsWon) : 0;
  const prevAvgDeal = prevDealsWon > 0 ? Math.round(prevRevenue / prevDealsWon) : 0;
  const avgDealChange = prevAvgDeal > 0
    ? Math.round(((avgDeal - prevAvgDeal) / prevAvgDeal) * 100)
    : 0;

  const lostDeals = leads.filter((l) => l.stage === 'lost');
  const winRate = dealsWon + lostDeals.length > 0
    ? Math.round((dealsWon / (dealsWon + lostDeals.length)) * 100)
    : 0;

  // Sales by track
  const trackMap: Record<string, { deals: number; revenue: number }> = {};
  for (const deal of deals) {
    const track = deal.interested_track || 'other';
    if (!trackMap[track]) {
      trackMap[track] = { deals: 0, revenue: 0 };
    }
    trackMap[track].deals++;
    trackMap[track].revenue += (deal.estimated_value_cents || 0) / 100;
  }

  const salesByTrack = Object.entries(trackMap).map(([track, data]) => ({
    track,
    deals: data.deals,
    revenue_monthly: data.revenue,
    percentage: dealsWon > 0 ? Math.round((data.deals / dealsWon) * 100) : 0,
    avg_commission: Math.round(data.revenue * 0.5 / data.deals),
  }));

  // Pipeline health
  const stages: PipelineStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
  const pipelineHealth = stages.map((stage) => {
    const stageLeads = leads.filter((l) => l.stage === stage);
    const avgDays = stageLeads.length > 0
      ? Math.round(
          stageLeads.reduce((sum, l) => {
            const days = Math.floor(
              (Date.now() - new Date(l.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / stageLeads.length
        )
      : 0;

    return {
      stage,
      leads: stageLeads.length,
      value_cents: stageLeads.reduce((sum, l) => sum + (l.estimated_value_cents || 0), 0),
      avg_days: avgDays,
      conversion_rate: 0, // Would need more complex calculation
    };
  });

  // Trend data (last 6 months)
  const trendData: { date: string; deals: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthDeals = (wonDeals || []).filter((d) => {
      const convertedAt = new Date(d.converted_at);
      return convertedAt >= monthStart && convertedAt <= monthEnd;
    });

    trendData.push({
      date: monthStart.toLocaleString('default', { month: 'short' }),
      deals: monthDeals.length,
      revenue: monthDeals.reduce((sum, d) => sum + (d.estimated_value_cents || 0), 0) / 100,
    });
  }

  return {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      label,
    },
    summary: {
      deals_won: dealsWon,
      deals_won_change: dealsWonChange,
      revenue_monthly: revenue,
      revenue_change: revenueChange,
      avg_deal_size: avgDeal,
      avg_deal_change: avgDealChange,
      win_rate: winRate,
      win_rate_change: 0,
    },
    sales_by_track: salesByTrack,
    pipeline_health: pipelineHealth,
    trend_data: trendData,
  };
}

// =====================================================
// LEAD SOURCE REPORT
// =====================================================

/**
 * Get lead source analysis
 */
export async function getLeadSourceReport(
  agentId: string,
  period: string
): Promise<LeadSourceReport> {
  const supabase = createAdminClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', periodStart.toISOString());

  const allLeads = leads || [];

  const sourceMap: Record<string, { leads: number; won: number; revenue: number }> = {};

  for (const lead of allLeads) {
    const source = lead.source || 'unknown';
    if (!sourceMap[source]) {
      sourceMap[source] = { leads: 0, won: 0, revenue: 0 };
    }
    sourceMap[source].leads++;
    if (lead.stage === 'won') {
      sourceMap[source].won++;
      sourceMap[source].revenue += (lead.estimated_value_cents || 0) / 100;
    }
  }

  const sources = Object.entries(sourceMap).map(([source, data]) => ({
    source: source as PipelineLeadSource,
    leads: data.leads,
    won: data.won,
    win_rate: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0,
    revenue: data.revenue,
    cost_per_lead: 0, // Would need cost tracking
  }));

  const insights: string[] = [];
  const bestSource = sources.sort((a, b) => b.win_rate - a.win_rate)[0];
  if (bestSource && bestSource.win_rate > 50) {
    insights.push(
      `${bestSource.source} has ${bestSource.win_rate}% win rate — ask happy clients for referrals!`
    );
  }

  return {
    period,
    sources,
    insights,
  };
}

// =====================================================
// RETENTION REPORT
// =====================================================

/**
 * Get client retention report
 */
export async function getRetentionReport(agentId: string): Promise<RetentionReport> {
  const supabase = createAdminClient();

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all clients
  const { data: clients } = await supabase
    .from('crm_accounts')
    .select('*')
    .eq('agent_id', agentId);

  const allClients = clients || [];
  const activeClients = allClients.filter((c) => c.status === 'active');
  const churned = allClients.filter(
    (c) =>
      c.status === 'cancelled' &&
      c.cancelled_at &&
      new Date(c.cancelled_at) >= thisMonth
  );

  const retentionRate =
    allClients.length > 0
      ? Math.round(((allClients.length - churned.length) / allClients.length) * 100)
      : 100;

  const avgTenure =
    activeClients.length > 0
      ? Math.round(
          activeClients.reduce((sum, c) => {
            const months = Math.floor(
              (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
            );
            return sum + months;
          }, 0) / activeClients.length
        )
      : 0;

  const churnDetails = churned.map((c) => ({
    client_name: c.business_name,
    plan_type: c.plan_type,
    tenure_months: Math.floor(
      (new Date(c.cancelled_at!).getTime() - new Date(c.created_at).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    ),
    reason: 'Unknown', // Would need churn reason tracking
    lost_revenue: c.monthly_amount || 0,
  }));

  // At-risk clients (no login in 14+ days - would need login tracking)
  const atRiskClients: RetentionReport['at_risk_clients'] = [];

  return {
    period: 'This Month',
    overview: {
      active_clients: activeClients.length,
      churned_this_month: churned.length,
      retention_rate: retentionRate,
      avg_tenure_months: avgTenure,
    },
    churn_details: churnDetails,
    at_risk_clients: atRiskClients,
  };
}

// =====================================================
// TEAM LEADERBOARD
// =====================================================

/**
 * Get team leaderboard (manager view)
 */
export async function getTeamLeaderboard(
  period: string
): Promise<TeamLeaderboard> {
  const supabase = createAdminClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all agents
  const { data: agents } = await supabase
    .from('admin_users')
    .select('id, full_name')
    .eq('role', 'agent')
    .eq('status', 'active');

  const allAgents = agents || [];
  const rankings: TeamLeaderboard['rankings'] = [];

  for (const agent of allAgents) {
    const { data: deals } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('stage', 'won')
      .gte('converted_at', periodStart.toISOString());

    const agentDeals = deals || [];
    const revenue = agentDeals.reduce((sum, d) => sum + (d.estimated_value_cents || 0), 0) / 100;
    const commission = revenue * 0.5; // Simplified

    rankings.push({
      rank: 0,
      agent_id: agent.id,
      agent_name: agent.full_name,
      deals: agentDeals.length,
      revenue,
      commission,
      vs_goal_percent: 0, // Would need goal tracking
    });
  }

  // Sort by deals and assign ranks
  rankings.sort((a, b) => b.deals - a.deals);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });

  return {
    period,
    rankings,
    team_totals: {
      total_deals: rankings.reduce((sum, r) => sum + r.deals, 0),
      total_revenue: rankings.reduce((sum, r) => sum + r.revenue, 0),
      total_commission: rankings.reduce((sum, r) => sum + r.commission, 0),
    },
  };
}
