// =====================================================
// CUSTOMER LIFETIME VALUE (CLV)
// Calculate and track customer lifetime value metrics
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface CustomerCLV {
  id: string;
  name: string;
  email: string;
  lifetimeValue: number;
  predictedCLV: number | null;
  clvSegment: 'high' | 'medium' | 'low' | 'at_risk' | null;
  firstJobDate: string | null;
  lastJobDate: string | null;
  totalJobs: number;
  averageJobValue: number | null;
}

export interface CLVReport {
  segments: {
    high: { count: number; totalCLV: number; predictedCLV: number };
    medium: { count: number; totalCLV: number; predictedCLV: number };
    low: { count: number; totalCLV: number; predictedCLV: number };
    at_risk: { count: number; totalCLV: number; predictedCLV: number };
  };
  totalCustomers: number;
  totalCLV: number;
  averageCLV: number;
}

// Update customer CLV metrics
export async function updateCustomerCLV(customerId: string): Promise<void> {
  const supabase = await createClient();

  // Get all completed jobs with invoice totals
  const { data: jobs } = await supabase
    .from('jobs')
    .select('total, completed_at')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('completed_at');

  if (!jobs?.length) return;

  const totalJobs = jobs.length;
  const lifetimeValue = jobs.reduce((sum, j) => sum + (j.total || 0), 0);
  const averageJobValue = lifetimeValue / totalJobs;
  const firstJobDate = jobs[0].completed_at;
  const lastJobDate = jobs[jobs.length - 1].completed_at;

  // Calculate predicted CLV (simple model based on frequency and recency)
  const monthsAsCustomer = Math.max(
    1,
    (new Date(lastJobDate).getTime() - new Date(firstJobDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const jobsPerMonth = totalJobs / monthsAsCustomer;
  const predictedCLV = averageJobValue * jobsPerMonth * 24; // 2-year projection

  // Determine segment
  let clvSegment: string;
  if (lifetimeValue >= 5000) {
    clvSegment = 'high';
  } else if (lifetimeValue >= 1000) {
    clvSegment = 'medium';
  } else {
    clvSegment = 'low';
  }

  // Check for at-risk (no job in 6+ months for repeat customers)
  if (totalJobs >= 2) {
    const monthsSinceLastJob =
      (Date.now() - new Date(lastJobDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceLastJob > 6) {
      clvSegment = 'at_risk';
    }
  }

  await supabase
    .from('customers')
    .update({
      lifetime_value: lifetimeValue,
      predicted_clv: predictedCLV,
      clv_segment: clvSegment,
      first_job_date: firstJobDate?.split('T')[0],
      last_job_date: lastJobDate?.split('T')[0],
      total_jobs: totalJobs,
      average_job_value: averageJobValue,
    })
    .eq('id', customerId);
}

// Batch update CLV for all customers in a business
export async function updateAllCustomerCLV(businessId: string): Promise<number> {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId);

  let updated = 0;

  for (const customer of customers || []) {
    await updateCustomerCLV(customer.id);
    updated++;
  }

  return updated;
}

// Get CLV report for business
export async function getCLVReport(businessId: string): Promise<CLVReport> {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customers')
    .select('clv_segment, lifetime_value, predicted_clv')
    .eq('business_id', businessId)
    .gt('total_jobs', 0);

  const segments = {
    high: { count: 0, totalCLV: 0, predictedCLV: 0 },
    medium: { count: 0, totalCLV: 0, predictedCLV: 0 },
    low: { count: 0, totalCLV: 0, predictedCLV: 0 },
    at_risk: { count: 0, totalCLV: 0, predictedCLV: 0 },
  };

  customers?.forEach((c) => {
    const seg = c.clv_segment as keyof typeof segments;
    if (segments[seg]) {
      segments[seg].count++;
      segments[seg].totalCLV += c.lifetime_value || 0;
      segments[seg].predictedCLV += c.predicted_clv || 0;
    }
  });

  const totalCLV = customers?.reduce((sum, c) => sum + (c.lifetime_value || 0), 0) || 0;

  return {
    segments,
    totalCustomers: customers?.length || 0,
    totalCLV,
    averageCLV: customers?.length ? totalCLV / customers.length : 0,
  };
}

// Get top customers by CLV
export async function getTopCustomers(
  businessId: string,
  limit: number = 10
): Promise<CustomerCLV[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customers')
    .select('id, name, email, lifetime_value, predicted_clv, clv_segment, first_job_date, last_job_date, total_jobs, average_job_value')
    .eq('business_id', businessId)
    .gt('total_jobs', 0)
    .order('lifetime_value', { ascending: false })
    .limit(limit);

  return (data || []).map(transformCustomerCLV);
}

// Get at-risk customers for outreach
export async function getAtRiskCustomers(businessId: string): Promise<CustomerCLV[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customers')
    .select('id, name, email, lifetime_value, predicted_clv, clv_segment, first_job_date, last_job_date, total_jobs, average_job_value')
    .eq('business_id', businessId)
    .eq('clv_segment', 'at_risk')
    .order('lifetime_value', { ascending: false });

  return (data || []).map(transformCustomerCLV);
}

// Get customers by segment
export async function getCustomersBySegment(
  businessId: string,
  segment: 'high' | 'medium' | 'low' | 'at_risk'
): Promise<CustomerCLV[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customers')
    .select('id, name, email, lifetime_value, predicted_clv, clv_segment, first_job_date, last_job_date, total_jobs, average_job_value')
    .eq('business_id', businessId)
    .eq('clv_segment', segment)
    .order('lifetime_value', { ascending: false });

  return (data || []).map(transformCustomerCLV);
}

// Get customer CLV details
export async function getCustomerCLVDetails(customerId: string): Promise<{
  clv: CustomerCLV | null;
  jobHistory: Array<{
    id: string;
    title: string;
    total: number;
    completedAt: string;
  }>;
  trends: {
    yearlySpend: Record<string, number>;
    averageJobValue: number;
    jobFrequency: number; // jobs per year
  };
}> {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, lifetime_value, predicted_clv, clv_segment, first_job_date, last_job_date, total_jobs, average_job_value')
    .eq('id', customerId)
    .single();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, total, completed_at')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  // Calculate yearly spend
  const yearlySpend: Record<string, number> = {};
  jobs?.forEach((job) => {
    if (job.completed_at) {
      const year = new Date(job.completed_at).getFullYear().toString();
      yearlySpend[year] = (yearlySpend[year] || 0) + (job.total || 0);
    }
  });

  // Calculate job frequency
  let jobFrequency = 0;
  if (customer?.first_job_date && customer?.total_jobs > 0) {
    const yearsAsCustomer = Math.max(
      1,
      (Date.now() - new Date(customer.first_job_date).getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
    jobFrequency = customer.total_jobs / yearsAsCustomer;
  }

  return {
    clv: customer ? transformCustomerCLV(customer) : null,
    jobHistory: (jobs || []).map((j) => ({
      id: j.id,
      title: j.title,
      total: j.total || 0,
      completedAt: j.completed_at,
    })),
    trends: {
      yearlySpend,
      averageJobValue: customer?.average_job_value || 0,
      jobFrequency,
    },
  };
}

// Identify churn risk based on patterns
export async function identifyChurnRisk(businessId: string): Promise<{
  atRisk: CustomerCLV[];
  potentialChurn: CustomerCLV[];
}> {
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // At-risk: High-value customers with no recent activity
  const { data: atRisk } = await supabase
    .from('customers')
    .select('id, name, email, lifetime_value, predicted_clv, clv_segment, first_job_date, last_job_date, total_jobs, average_job_value')
    .eq('business_id', businessId)
    .in('clv_segment', ['high', 'medium'])
    .lt('last_job_date', sixMonthsAgo.toISOString().split('T')[0])
    .gte('total_jobs', 2)
    .order('lifetime_value', { ascending: false });

  // Potential churn: Customers with declining frequency
  const { data: potentialChurn } = await supabase
    .from('customers')
    .select('id, name, email, lifetime_value, predicted_clv, clv_segment, first_job_date, last_job_date, total_jobs, average_job_value')
    .eq('business_id', businessId)
    .lt('last_job_date', threeMonthsAgo.toISOString().split('T')[0])
    .gte('total_jobs', 3)
    .order('lifetime_value', { ascending: false })
    .limit(20);

  return {
    atRisk: (atRisk || []).map(transformCustomerCLV),
    potentialChurn: (potentialChurn || []).map(transformCustomerCLV),
  };
}

// Get CLV trends over time
export async function getCLVTrends(
  businessId: string,
  months: number = 12
): Promise<Array<{ month: string; newCustomerValue: number; totalCustomerValue: number }>> {
  const supabase = await createClient();

  const trends: Array<{ month: string; newCustomerValue: number; totalCustomerValue: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // New customer value this month
    const { data: newCustomers } = await supabase
      .from('customers')
      .select('lifetime_value')
      .eq('business_id', businessId)
      .gte('first_job_date', monthStart.toISOString().split('T')[0])
      .lte('first_job_date', monthEnd.toISOString().split('T')[0]);

    // Total customer value (jobs completed this month)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('total')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('completed_at', monthStart.toISOString())
      .lte('completed_at', monthEnd.toISOString());

    trends.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      newCustomerValue: newCustomers?.reduce((sum, c) => sum + (c.lifetime_value || 0), 0) || 0,
      totalCustomerValue: jobs?.reduce((sum, j) => sum + (j.total || 0), 0) || 0,
    });
  }

  return trends;
}

// Helper to transform database row
function transformCustomerCLV(row: any): CustomerCLV {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    lifetimeValue: parseFloat(row.lifetime_value || 0),
    predictedCLV: row.predicted_clv ? parseFloat(row.predicted_clv) : null,
    clvSegment: row.clv_segment,
    firstJobDate: row.first_job_date,
    lastJobDate: row.last_job_date,
    totalJobs: row.total_jobs || 0,
    averageJobValue: row.average_job_value ? parseFloat(row.average_job_value) : null,
  };
}
