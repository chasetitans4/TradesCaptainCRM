// =====================================================
// JOB COST SUMMARY
// Aggregated cost and profitability tracking
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface JobCostSummary {
  jobId: string;
  quotedAmount: number | null;
  invoicedAmount: number | null;
  collectedAmount: number | null;
  laborCost: number;
  materialCost: number;
  subcontractorCost: number;
  otherCost: number;
  totalCost: number;
  grossProfit: number | null;
  profitMargin: number | null;
  estimatedHours: number | null;
  actualHours: number | null;
}

/**
 * Update job cost summary (call after any cost changes)
 */
export async function updateJobCostSummary(
  jobId: string,
  overrides?: {
    quotedAmount?: number;
    invoicedAmount?: number;
    collectedAmount?: number;
    estimatedHours?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get labor costs
  const { data: labor } = await supabase
    .from('job_labor')
    .select('labor_cost, total_minutes')
    .eq('job_id', jobId);

  const laborCost = labor?.reduce((sum, l) => sum + (l.labor_cost || 0), 0) || 0;
  const actualMinutes = labor?.reduce((sum, l) => sum + (l.total_minutes || 0), 0) || 0;

  // Get material costs
  const { data: materials } = await supabase
    .from('job_materials')
    .select('total_cost')
    .eq('job_id', jobId);

  const materialCost = materials?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;

  // Get job info
  const { data: job } = await supabase
    .from('jobs')
    .select('total, estimated_duration')
    .eq('id', jobId)
    .single();

  // Get related quote
  const { data: quote } = await supabase
    .from('quotes')
    .select('total')
    .eq('job_id', jobId)
    .single();

  // Get related invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total, status, amount_paid')
    .eq('job_id', jobId)
    .single();

  // Use overrides if provided, otherwise use calculated values
  const quotedAmount = overrides?.quotedAmount ?? quote?.total ?? null;
  const invoicedAmount = overrides?.invoicedAmount ?? invoice?.total ?? job?.total ?? 0;
  const collectedAmount = overrides?.collectedAmount ?? (invoice?.status === 'paid'
    ? invoice.total
    : (invoice?.amount_paid || 0));
  const estimatedHours = overrides?.estimatedHours ?? (job?.estimated_duration ? job.estimated_duration / 60 : null);

  const totalCost = laborCost + materialCost;
  const grossProfit = invoicedAmount ? invoicedAmount - totalCost : null;
  const profitMargin = invoicedAmount && invoicedAmount > 0
    ? (grossProfit! / invoicedAmount) * 100
    : null;

  try {
    await supabase
      .from('job_cost_summary')
      .upsert(
        {
          job_id: jobId,
          quoted_amount: quotedAmount,
          invoiced_amount: invoicedAmount,
          collected_amount: collectedAmount,
          labor_cost: laborCost,
          material_cost: materialCost,
          subcontractor_cost: 0,
          other_cost: 0,
          total_cost: totalCost,
          gross_profit: grossProfit,
          profit_margin: profitMargin,
          estimated_hours: estimatedHours,
          actual_hours: actualMinutes / 60,
        },
        { onConflict: 'job_id' }
      );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update summary' };
  }
}

/**
 * Get cost summary for a job
 */
export async function getJobCostSummary(jobId: string): Promise<JobCostSummary | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_cost_summary')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (!data) {
    // Try to calculate if not exists
    await updateJobCostSummary(jobId);

    const { data: freshData } = await supabase
      .from('job_cost_summary')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (!freshData) return null;

    return mapSummary(freshData);
  }

  return mapSummary(data);
}

function mapSummary(data: any): JobCostSummary {
  return {
    jobId: data.job_id,
    quotedAmount: data.quoted_amount,
    invoicedAmount: data.invoiced_amount,
    collectedAmount: data.collected_amount,
    laborCost: data.labor_cost,
    materialCost: data.material_cost,
    subcontractorCost: data.subcontractor_cost,
    otherCost: data.other_cost,
    totalCost: data.total_cost,
    grossProfit: data.gross_profit,
    profitMargin: data.profit_margin,
    estimatedHours: data.estimated_hours,
    actualHours: data.actual_hours,
  };
}

/**
 * Get profitability report for a business
 */
export async function getProfitabilityReport(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<{
  jobs: Array<{
    job: {
      id: string;
      title: string;
      type: string;
      completedAt: string;
      customerName: string;
    };
    costs: JobCostSummary;
  }>;
  totals: {
    revenue: number;
    collected: number;
    laborCost: number;
    materialCost: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    jobCount: number;
  };
  byJobType: Array<{
    jobType: string;
    jobCount: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      type,
      completed_at,
      customer:customers(name),
      cost_summary:job_cost_summary(*)
    `)
    .eq('business_id', businessId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate + 'T23:59:59')
    .eq('status', 'completed')
    .not('cost_summary', 'is', null);

  const jobs = (data || []).map((j) => ({
    job: {
      id: j.id,
      title: j.title,
      type: j.type || 'Other',
      completedAt: j.completed_at,
      customerName: (j.customer as any)?.name || '',
    },
    costs: mapSummary(j.cost_summary),
  }));

  // Calculate totals
  const totals = jobs.reduce(
    (acc, item) => ({
      revenue: acc.revenue + (item.costs.invoicedAmount || 0),
      collected: acc.collected + (item.costs.collectedAmount || 0),
      laborCost: acc.laborCost + item.costs.laborCost,
      materialCost: acc.materialCost + item.costs.materialCost,
      totalCost: acc.totalCost + item.costs.totalCost,
      grossProfit: acc.grossProfit + (item.costs.grossProfit || 0),
      jobCount: acc.jobCount + 1,
    }),
    {
      revenue: 0,
      collected: 0,
      laborCost: 0,
      materialCost: 0,
      totalCost: 0,
      grossProfit: 0,
      jobCount: 0,
    }
  );

  // Calculate by job type
  const byTypeMap = new Map<string, {
    jobCount: number;
    revenue: number;
    cost: number;
    profit: number;
  }>();

  for (const item of jobs) {
    const type = item.job.type;
    const existing = byTypeMap.get(type) || { jobCount: 0, revenue: 0, cost: 0, profit: 0 };

    byTypeMap.set(type, {
      jobCount: existing.jobCount + 1,
      revenue: existing.revenue + (item.costs.invoicedAmount || 0),
      cost: existing.cost + item.costs.totalCost,
      profit: existing.profit + (item.costs.grossProfit || 0),
    });
  }

  const byJobType = Array.from(byTypeMap.entries()).map(([jobType, data]) => ({
    jobType,
    jobCount: data.jobCount,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.profit,
    margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
  }));

  return {
    jobs,
    totals: {
      ...totals,
      profitMargin: totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0,
    },
    byJobType: byJobType.sort((a, b) => b.profit - a.profit),
  };
}

/**
 * Get technician profitability
 */
export async function getTechnicianProfitability(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  userId: string;
  userName: string;
  jobCount: number;
  totalRevenue: number;
  totalLaborCost: number;
  totalHours: number;
  avgRevenuePerJob: number;
  avgHoursPerJob: number;
}>> {
  const supabase = await createClient();

  const { data: labor } = await supabase
    .from('job_labor')
    .select(`
      user_id,
      labor_cost,
      total_minutes,
      job_id,
      user:users(name, business_id),
      job:jobs(total, status, completed_at)
    `)
    .gte('clock_in', startDate)
    .lte('clock_in', endDate + 'T23:59:59')
    .not('clock_out', 'is', null);

  const techMap = new Map<string, {
    userName: string;
    jobIds: Set<string>;
    totalLaborCost: number;
    totalMinutes: number;
    totalRevenue: number;
  }>();

  for (const entry of labor || []) {
    if ((entry.user as any)?.business_id !== businessId) continue;
    if ((entry.job as any)?.status !== 'completed') continue;

    const existing = techMap.get(entry.user_id) || {
      userName: (entry.user as any)?.name || '',
      jobIds: new Set(),
      totalLaborCost: 0,
      totalMinutes: 0,
      totalRevenue: 0,
    };

    existing.jobIds.add(entry.job_id);
    existing.totalLaborCost += entry.labor_cost || 0;
    existing.totalMinutes += entry.total_minutes || 0;

    // Only count revenue once per job
    if (!techMap.has(entry.user_id) || !techMap.get(entry.user_id)!.jobIds.has(entry.job_id)) {
      existing.totalRevenue += (entry.job as any)?.total || 0;
    }

    techMap.set(entry.user_id, existing);
  }

  return Array.from(techMap.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
    jobCount: data.jobIds.size,
    totalRevenue: data.totalRevenue,
    totalLaborCost: data.totalLaborCost,
    totalHours: data.totalMinutes / 60,
    avgRevenuePerJob: data.jobIds.size > 0 ? data.totalRevenue / data.jobIds.size : 0,
    avgHoursPerJob: data.jobIds.size > 0 ? (data.totalMinutes / 60) / data.jobIds.size : 0,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Get cost variance analysis
 */
export async function getCostVarianceReport(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  jobId: string;
  jobTitle: string;
  jobType: string;
  estimatedHours: number;
  actualHours: number;
  hoursVariance: number;
  quotedAmount: number;
  actualCost: number;
  costVariance: number;
  isOverBudget: boolean;
  isOverTime: boolean;
}>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_cost_summary')
    .select(`
      *,
      job:jobs(id, title, type, business_id, completed_at)
    `)
    .gte('job.completed_at', startDate)
    .lte('job.completed_at', endDate + 'T23:59:59')
    .not('estimated_hours', 'is', null)
    .not('quoted_amount', 'is', null);

  return (data || [])
    .filter((item) => (item.job as any)?.business_id === businessId)
    .map((item) => {
      const hoursVariance = (item.actual_hours || 0) - (item.estimated_hours || 0);
      const costVariance = item.total_cost - (item.quoted_amount || 0);

      return {
        jobId: item.job_id,
        jobTitle: (item.job as any)?.title || '',
        jobType: (item.job as any)?.type || 'Other',
        estimatedHours: item.estimated_hours || 0,
        actualHours: item.actual_hours || 0,
        hoursVariance,
        quotedAmount: item.quoted_amount || 0,
        actualCost: item.total_cost,
        costVariance,
        isOverBudget: costVariance > 0,
        isOverTime: hoursVariance > 0,
      };
    })
    .sort((a, b) => b.costVariance - a.costVariance);
}

// Alias for API compatibility
export const getCostVarianceAnalysis = getCostVarianceReport;

/**
 * Get profitability by job type
 */
export async function getJobTypeProfitability(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  jobType: string;
  jobCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  avgRevenuePerJob: number;
  avgCostPerJob: number;
}>> {
  const report = await getProfitabilityReport(businessId, startDate, endDate);

  return report.byJobType.map((item) => ({
    ...item,
    avgRevenuePerJob: item.jobCount > 0 ? item.revenue / item.jobCount : 0,
    avgCostPerJob: item.jobCount > 0 ? item.cost / item.jobCount : 0,
  }));
}
