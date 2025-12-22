// =====================================================
// REPORTS & ANALYTICS LIBRARY
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns';

export interface ReportFilters {
  businessId: string;
  startDate: Date;
  endDate: Date;
}

export interface DashboardMetrics {
  revenue: number;
  revenueChange: number;
  jobsCompleted: number;
  jobsChange: number;
  newLeads: number;
  leadsChange: number;
  leadsWon: number;
  conversionRate: number;
  conversionChange: number;
  avgJobValue: number;
  outstandingAmount: number;
  outstandingCount: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

/**
 * Get dashboard metrics for a date range
 */
export async function getDashboardMetrics(filters: ReportFilters): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const { businessId, startDate, endDate } = filters;

  // Calculate previous period for comparison
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

  // Current period revenue (from paid invoices)
  const { data: revenueData } = await supabase
    .from('invoices')
    .select('total')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', startDate.toISOString())
    .lte('paid_at', endDate.toISOString());

  const revenue = revenueData?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

  // Previous period revenue
  const { data: prevRevenueData } = await supabase
    .from('invoices')
    .select('total')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', prevStartDate.toISOString())
    .lte('paid_at', prevEndDate.toISOString());

  const prevRevenue = prevRevenueData?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Jobs completed - current period
  const { count: jobsCompleted } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());

  // Jobs completed - previous period
  const { count: prevJobsCompleted } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('completed_at', prevStartDate.toISOString())
    .lte('completed_at', prevEndDate.toISOString());

  const jobsChange =
    prevJobsCompleted && prevJobsCompleted > 0
      ? (((jobsCompleted || 0) - prevJobsCompleted) / prevJobsCompleted) * 100
      : 0;

  // New leads - current period
  const { count: newLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // New leads - previous period
  const { count: prevNewLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', prevStartDate.toISOString())
    .lte('created_at', prevEndDate.toISOString());

  const leadsChange =
    prevNewLeads && prevNewLeads > 0 ? (((newLeads || 0) - prevNewLeads) / prevNewLeads) * 100 : 0;

  // Leads won (converted) - current period
  const { count: leadsWon } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'won')
    .gte('updated_at', startDate.toISOString())
    .lte('updated_at', endDate.toISOString());

  // Leads won - previous period
  const { count: prevLeadsWon } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'won')
    .gte('updated_at', prevStartDate.toISOString())
    .lte('updated_at', prevEndDate.toISOString());

  // Conversion rates
  const conversionRate = newLeads ? ((leadsWon || 0) / newLeads) * 100 : 0;
  const prevConversionRate = prevNewLeads ? ((prevLeadsWon || 0) / prevNewLeads) * 100 : 0;
  const conversionChange = conversionRate - prevConversionRate;

  // Average job value
  const avgJobValue = jobsCompleted ? revenue / jobsCompleted : 0;

  // Outstanding invoices
  const { data: outstandingData } = await supabase
    .from('invoices')
    .select('amount_due')
    .eq('business_id', businessId)
    .in('status', ['sent', 'viewed', 'overdue']);

  const outstandingAmount =
    outstandingData?.reduce((sum, inv) => sum + (Number(inv.amount_due) || 0), 0) || 0;
  const outstandingCount = outstandingData?.length || 0;

  return {
    revenue,
    revenueChange: Math.round(revenueChange * 10) / 10,
    jobsCompleted: jobsCompleted || 0,
    jobsChange: Math.round(jobsChange * 10) / 10,
    newLeads: newLeads || 0,
    leadsChange: Math.round(leadsChange * 10) / 10,
    leadsWon: leadsWon || 0,
    conversionRate: Math.round(conversionRate * 10) / 10,
    conversionChange: Math.round(conversionChange * 10) / 10,
    avgJobValue: Math.round(avgJobValue * 100) / 100,
    outstandingAmount,
    outstandingCount,
  };
}

/**
 * Get revenue over time (last N months)
 */
export async function getRevenueOverTime(
  businessId: string,
  months: number = 6
): Promise<RevenueDataPoint[]> {
  const supabase = await createClient();
  const data: RevenueDataPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', businessId)
      .eq('status', 'paid')
      .gte('paid_at', start.toISOString())
      .lte('paid_at', end.toISOString());

    const revenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

    data.push({
      month: format(date, 'MMM'),
      revenue,
    });
  }

  return data;
}

/**
 * Get lead source breakdown
 */
export async function getLeadSourceBreakdown(filters: ReportFilters): Promise<SourceBreakdown[]> {
  const supabase = await createClient();
  const { businessId, startDate, endDate } = filters;

  const { data } = await supabase
    .from('leads')
    .select('source')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Group by source
  const breakdown: Record<string, number> = {};
  data?.forEach((lead) => {
    const source = lead.source || 'Unknown';
    breakdown[source] = (breakdown[source] || 0) + 1;
  });

  return Object.entries(breakdown)
    .map(([source, count]) => ({ source: formatSourceName(source), count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get job status breakdown
 */
export async function getJobStatusBreakdown(filters: ReportFilters): Promise<StatusBreakdown[]> {
  const supabase = await createClient();
  const { businessId, startDate, endDate } = filters;

  const { data } = await supabase
    .from('jobs')
    .select('status')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const breakdown: Record<string, number> = {};
  data?.forEach((job) => {
    breakdown[job.status] = (breakdown[job.status] || 0) + 1;
  });

  const statusOrder = ['completed', 'in_progress', 'scheduled', 'cancelled', 'no_show'];

  return statusOrder
    .filter((status) => breakdown[status])
    .map((status) => ({
      status: formatStatusName(status),
      count: breakdown[status],
    }));
}

/**
 * Get year-to-date summary
 */
export async function getYearToDateSummary(businessId: string) {
  const supabase = await createClient();
  const start = startOfYear(new Date());
  const end = new Date();

  // YTD Revenue
  const { data: revenueData } = await supabase
    .from('invoices')
    .select('total')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', start.toISOString())
    .lte('paid_at', end.toISOString());

  const ytdRevenue = revenueData?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

  // YTD Jobs
  const { count: ytdJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString());

  // YTD Leads
  const { count: ytdLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  return {
    revenue: ytdRevenue,
    jobs: ytdJobs || 0,
    leads: ytdLeads || 0,
  };
}

// Helper functions
function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    website_chat: 'Website',
    ai_sms: 'AI SMS',
    phone: 'Phone Call',
    manual: 'Manual Entry',
    missed_call: 'Missed Call',
    referral: 'Referral',
    google: 'Google',
    facebook: 'Facebook',
  };
  return names[source] || source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ');
}

function formatStatusName(status: string): string {
  const names: Record<string, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
    scheduled: 'Scheduled',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };
  return names[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}
