// =====================================================
// TECHNICIAN PERFORMANCE METRICS LIBRARY
// KPIs and performance tracking for field technicians
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface TechnicianDailyMetrics {
  id: string;
  technician_id: string;
  business_id: string;
  date: string;
  jobs_completed: number;
  jobs_scheduled: number;
  total_revenue: number;
  total_labor_hours: number;
  travel_time_minutes: number;
  first_time_fix_count: number;
  callback_count: number;
  parts_used_cost: number;
  average_job_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  period: string;
  jobsCompleted: number;
  jobsScheduled: number;
  completionRate: number;
  totalRevenue: number;
  revenuePerJob: number;
  laborHours: number;
  revenuePerHour: number;
  firstTimeFixRate: number;
  callbackRate: number;
  averageRating: number;
  totalRatings: number;
  efficiency: number; // Jobs per 8-hour day equivalent
}

export interface JobRating {
  id: string;
  job_id: string;
  technician_id: string;
  business_id: string;
  quality_rating: number;
  timeliness_rating: number;
  professionalism_rating: number;
  overall_rating: number;
  feedback?: string;
  rated_by: string;
  created_at: string;
}

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Record daily metrics for a technician (called by cron/end of day)
 */
export async function recordDailyMetrics(
  technicianId: string,
  businessId: string,
  date: Date = new Date()
): Promise<TechnicianDailyMetrics> {
  const supabase = await createServerClient();

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayStart = startOfDay(date).toISOString();
  const dayEnd = endOfDay(date).toISOString();

  // Get jobs for the day
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, status, total, labor_hours, is_callback')
    .eq('business_id', businessId)
    .eq('assigned_to', technicianId)
    .gte('scheduled_date', dayStart)
    .lte('scheduled_date', dayEnd);

  if (jobsError) throw jobsError;

  // Get job ratings for the day
  const { data: ratings, error: ratingsError } = await supabase
    .from('job_ratings')
    .select('overall_rating')
    .eq('technician_id', technicianId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd);

  if (ratingsError) throw ratingsError;

  // Calculate metrics
  const completedJobs = jobs?.filter(j => j.status === 'completed') || [];
  const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.total || 0), 0);
  const totalLaborHours = completedJobs.reduce((sum, j) => sum + (j.labor_hours || 0), 0);
  const firstTimeFixes = completedJobs.filter(j => !j.is_callback).length;
  const callbacks = completedJobs.filter(j => j.is_callback).length;
  const avgRating = ratings && ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.length
    : 0;

  // Upsert daily metrics
  const { data, error } = await supabase
    .from('technician_daily_metrics')
    .upsert(
      {
        technician_id: technicianId,
        business_id: businessId,
        date: dateStr,
        jobs_completed: completedJobs.length,
        jobs_scheduled: jobs?.length || 0,
        total_revenue: totalRevenue,
        total_labor_hours: totalLaborHours,
        first_time_fix_count: firstTimeFixes,
        callback_count: callbacks,
        average_job_rating: avgRating,
        rating_count: ratings?.length || 0,
      },
      {
        onConflict: 'technician_id,date',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get technician performance for a date range
 */
export async function getTechnicianPerformance(
  technicianId: string,
  businessId: string,
  range: DateRange,
  customStart?: Date,
  customEnd?: Date
): Promise<TechnicianPerformance> {
  const supabase = await createServerClient();

  let startDate: Date;
  let endDate: Date = new Date();

  switch (range) {
    case 'today':
      startDate = startOfDay(new Date());
      endDate = endOfDay(new Date());
      break;
    case 'week':
      startDate = startOfWeek(new Date());
      endDate = endOfWeek(new Date());
      break;
    case 'month':
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
      break;
    case 'quarter':
      startDate = subDays(new Date(), 90);
      break;
    case 'year':
      startDate = subDays(new Date(), 365);
      break;
    case 'custom':
      if (!customStart || !customEnd) throw new Error('Custom range requires start and end dates');
      startDate = customStart;
      endDate = customEnd;
      break;
    default:
      startDate = startOfMonth(new Date());
  }

  // Get technician info
  const { data: technician } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', technicianId)
    .single();

  // Get aggregated metrics
  const { data: metrics, error } = await supabase
    .from('technician_daily_metrics')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('business_id', businessId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  // Aggregate metrics
  const totals = (metrics || []).reduce(
    (acc, m) => ({
      jobsCompleted: acc.jobsCompleted + m.jobs_completed,
      jobsScheduled: acc.jobsScheduled + m.jobs_scheduled,
      totalRevenue: acc.totalRevenue + m.total_revenue,
      laborHours: acc.laborHours + m.total_labor_hours,
      firstTimeFixes: acc.firstTimeFixes + m.first_time_fix_count,
      callbacks: acc.callbacks + m.callback_count,
      ratingSum: acc.ratingSum + (m.average_job_rating * m.rating_count),
      ratingCount: acc.ratingCount + m.rating_count,
    }),
    {
      jobsCompleted: 0,
      jobsScheduled: 0,
      totalRevenue: 0,
      laborHours: 0,
      firstTimeFixes: 0,
      callbacks: 0,
      ratingSum: 0,
      ratingCount: 0,
    }
  );

  const workDays = metrics?.length || 1;

  return {
    technicianId,
    technicianName: technician?.full_name || 'Unknown',
    period: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
    jobsCompleted: totals.jobsCompleted,
    jobsScheduled: totals.jobsScheduled,
    completionRate: totals.jobsScheduled > 0
      ? Math.round((totals.jobsCompleted / totals.jobsScheduled) * 100)
      : 0,
    totalRevenue: totals.totalRevenue,
    revenuePerJob: totals.jobsCompleted > 0
      ? Math.round(totals.totalRevenue / totals.jobsCompleted)
      : 0,
    laborHours: totals.laborHours,
    revenuePerHour: totals.laborHours > 0
      ? Math.round(totals.totalRevenue / totals.laborHours)
      : 0,
    firstTimeFixRate: totals.jobsCompleted > 0
      ? Math.round((totals.firstTimeFixes / totals.jobsCompleted) * 100)
      : 0,
    callbackRate: totals.jobsCompleted > 0
      ? Math.round((totals.callbacks / totals.jobsCompleted) * 100)
      : 0,
    averageRating: totals.ratingCount > 0
      ? Math.round((totals.ratingSum / totals.ratingCount) * 10) / 10
      : 0,
    totalRatings: totals.ratingCount,
    efficiency: Math.round((totals.jobsCompleted / workDays) * 10) / 10,
  };
}

/**
 * Get team performance comparison
 */
export async function getTeamPerformance(
  businessId: string,
  range: DateRange = 'month'
): Promise<TechnicianPerformance[]> {
  const supabase = await createServerClient();

  // Get all technicians for the business
  const { data: technicians, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('business_id', businessId)
    .eq('role', 'technician');

  if (error) throw error;

  const performances: TechnicianPerformance[] = [];

  for (const tech of technicians || []) {
    const perf = await getTechnicianPerformance(tech.id, businessId, range);
    performances.push(perf);
  }

  // Sort by revenue descending
  return performances.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Rate a technician's job performance
 */
export async function rateJobPerformance(
  jobId: string,
  technicianId: string,
  businessId: string,
  ratings: {
    quality: number;
    timeliness: number;
    professionalism: number;
    feedback?: string;
  },
  ratedBy: string
): Promise<JobRating> {
  const supabase = await createServerClient();

  const overallRating = Math.round(
    ((ratings.quality + ratings.timeliness + ratings.professionalism) / 3) * 10
  ) / 10;

  const { data, error } = await supabase
    .from('job_ratings')
    .insert({
      job_id: jobId,
      technician_id: technicianId,
      business_id: businessId,
      quality_rating: ratings.quality,
      timeliness_rating: ratings.timeliness,
      professionalism_rating: ratings.professionalism,
      overall_rating: overallRating,
      feedback: ratings.feedback,
      rated_by: ratedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get technician rankings for a metric
 */
export async function getTechnicianRankings(
  businessId: string,
  metric: 'revenue' | 'jobs' | 'rating' | 'efficiency',
  range: DateRange = 'month',
  limit: number = 10
): Promise<{ rank: number; technicianId: string; technicianName: string; value: number }[]> {
  const performances = await getTeamPerformance(businessId, range);

  let sortedPerf: TechnicianPerformance[];

  switch (metric) {
    case 'revenue':
      sortedPerf = [...performances].sort((a, b) => b.totalRevenue - a.totalRevenue);
      break;
    case 'jobs':
      sortedPerf = [...performances].sort((a, b) => b.jobsCompleted - a.jobsCompleted);
      break;
    case 'rating':
      sortedPerf = [...performances].sort((a, b) => b.averageRating - a.averageRating);
      break;
    case 'efficiency':
      sortedPerf = [...performances].sort((a, b) => b.efficiency - a.efficiency);
      break;
    default:
      sortedPerf = performances;
  }

  return sortedPerf.slice(0, limit).map((perf, index) => ({
    rank: index + 1,
    technicianId: perf.technicianId,
    technicianName: perf.technicianName,
    value: metric === 'revenue' ? perf.totalRevenue
      : metric === 'jobs' ? perf.jobsCompleted
      : metric === 'rating' ? perf.averageRating
      : perf.efficiency,
  }));
}

/**
 * Get trend data for a technician
 */
export async function getTechnicianTrend(
  technicianId: string,
  businessId: string,
  days: number = 30
): Promise<{
  dates: string[];
  revenue: number[];
  jobs: number[];
  ratings: number[];
}> {
  const supabase = await createServerClient();

  const startDate = subDays(new Date(), days);

  const { data: metrics, error } = await supabase
    .from('technician_daily_metrics')
    .select('date, total_revenue, jobs_completed, average_job_rating')
    .eq('technician_id', technicianId)
    .eq('business_id', businessId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .order('date', { ascending: true });

  if (error) throw error;

  return {
    dates: metrics?.map(m => m.date) || [],
    revenue: metrics?.map(m => m.total_revenue) || [],
    jobs: metrics?.map(m => m.jobs_completed) || [],
    ratings: metrics?.map(m => m.average_job_rating) || [],
  };
}

/**
 * Get business-wide performance summary
 */
export async function getBusinessPerformanceSummary(
  businessId: string,
  range: DateRange = 'month'
): Promise<{
  totalRevenue: number;
  totalJobs: number;
  averageJobValue: number;
  teamSize: number;
  topPerformer: { name: string; revenue: number } | null;
  averageRating: number;
  firstTimeFixRate: number;
}> {
  const performances = await getTeamPerformance(businessId, range);

  if (performances.length === 0) {
    return {
      totalRevenue: 0,
      totalJobs: 0,
      averageJobValue: 0,
      teamSize: 0,
      topPerformer: null,
      averageRating: 0,
      firstTimeFixRate: 0,
    };
  }

  const totals = performances.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.totalRevenue,
      jobs: acc.jobs + p.jobsCompleted,
      ratingSum: acc.ratingSum + (p.averageRating * p.totalRatings),
      ratingCount: acc.ratingCount + p.totalRatings,
      ftfSum: acc.ftfSum + p.firstTimeFixRate,
    }),
    { revenue: 0, jobs: 0, ratingSum: 0, ratingCount: 0, ftfSum: 0 }
  );

  const topPerformer = performances[0]; // Already sorted by revenue

  return {
    totalRevenue: totals.revenue,
    totalJobs: totals.jobs,
    averageJobValue: totals.jobs > 0 ? Math.round(totals.revenue / totals.jobs) : 0,
    teamSize: performances.length,
    topPerformer: topPerformer ? { name: topPerformer.technicianName, revenue: topPerformer.totalRevenue } : null,
    averageRating: totals.ratingCount > 0
      ? Math.round((totals.ratingSum / totals.ratingCount) * 10) / 10
      : 0,
    firstTimeFixRate: performances.length > 0
      ? Math.round(totals.ftfSum / performances.length)
      : 0,
  };
}

/**
 * Process end-of-day metrics for all technicians (cron job)
 */
export async function processEndOfDayMetrics(): Promise<{ processed: number; errors: string[] }> {
  const supabase = await createServerClient();

  const result = { processed: 0, errors: [] as string[] };

  // Get all active technicians
  const { data: technicians, error } = await supabase
    .from('profiles')
    .select('id, business_id')
    .eq('role', 'technician');

  if (error) {
    result.errors.push(`Failed to fetch technicians: ${error.message}`);
    return result;
  }

  const yesterday = subDays(new Date(), 1);

  for (const tech of technicians || []) {
    try {
      await recordDailyMetrics(tech.id, tech.business_id, yesterday);
      result.processed++;
    } catch (err: any) {
      result.errors.push(`Failed to process metrics for ${tech.id}: ${err.message}`);
    }
  }

  return result;
}
