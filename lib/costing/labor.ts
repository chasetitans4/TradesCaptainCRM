// =====================================================
// JOB LABOR TRACKING
// Time tracking and labor cost management
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export interface LaborEntry {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalMinutes: number | null;
  hourlyRate: number;
  overtimeRate: number;
  isOvertime: boolean;
  laborCost: number | null;
  notes: string | null;
}

/**
 * Clock in to a job
 */
export async function clockIn(
  jobId: string,
  userId: string,
  notes?: string,
  client?: SupabaseClient
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  const supabase = client ?? await createClient();

  // Check for existing open clock-in on any job
  const { data: existing } = await supabase
    .from('job_labor')
    .select('id, job_id')
    .eq('user_id', userId)
    .is('clock_out', null)
    .single();

  if (existing) {
    return {
      success: false,
      error: existing.job_id === jobId
        ? 'Already clocked in to this job'
        : 'Already clocked in to another job. Please clock out first.',
    };
  }

  // Get user's hourly rate
  const { data: user } = await supabase
    .from('users')
    .select('hourly_rate, overtime_rate')
    .eq('id', userId)
    .single();

  const { data: entry, error } = await supabase
    .from('job_labor')
    .insert({
      job_id: jobId,
      user_id: userId,
      clock_in: new Date().toISOString(),
      hourly_rate: user?.hourly_rate || 0,
      overtime_rate: user?.overtime_rate || 0,
      notes,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job status to in_progress
  await supabase
    .from('jobs')
    .update({ status: 'in_progress' })
    .eq('id', jobId)
    .eq('status', 'scheduled');

  // Update technician location status
  await supabase
    .from('technician_locations')
    .upsert(
      {
        user_id: userId,
        status: 'on_job',
        current_job_id: jobId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  return { success: true, entryId: entry.id };
}

/**
 * Clock out from a job
 */
export async function clockOut(
  jobId: string,
  userId: string,
  breakMinutes: number = 0,
  notes?: string,
  client?: SupabaseClient
): Promise<{ success: boolean; totalMinutes?: number; laborCost?: number; error?: string }> {
  const supabase = client ?? await createClient();

  const { data: entry } = await supabase
    .from('job_labor')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .is('clock_out', null)
    .single();

  if (!entry) {
    return { success: false, error: 'No active clock-in found for this job' };
  }

  const clockOut = new Date();
  const clockIn = new Date(entry.clock_in);
  const totalMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMinutes;
  const hours = totalMinutes / 60;
  const laborCost = hours * (entry.hourly_rate || 0);

  const { error } = await supabase
    .from('job_labor')
    .update({
      clock_out: clockOut.toISOString(),
      break_minutes: breakMinutes,
      total_minutes: totalMinutes,
      labor_cost: laborCost,
      notes: notes || entry.notes,
    })
    .eq('id', entry.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update technician location status
  await supabase
    .from('technician_locations')
    .update({
      status: 'available',
      current_job_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(jobId);

  return { success: true, totalMinutes, laborCost };
}

/**
 * Add manual labor entry
 */
export async function addLaborEntry(
  jobId: string,
  userId: string,
  data: {
    clockIn: Date;
    clockOut: Date;
    breakMinutes?: number;
    notes?: string;
    isOvertime?: boolean;
  }
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  const supabase = await createClient();

  // Get user's hourly rate
  const { data: user } = await supabase
    .from('users')
    .select('hourly_rate, overtime_rate')
    .eq('id', userId)
    .single();

  const breakMins = data.breakMinutes || 0;
  const totalMinutes = Math.round((data.clockOut.getTime() - data.clockIn.getTime()) / 60000) - breakMins;
  const hours = totalMinutes / 60;
  const rate = data.isOvertime ? (user?.overtime_rate || user?.hourly_rate || 0) : (user?.hourly_rate || 0);
  const laborCost = hours * rate;

  const { data: entry, error } = await supabase
    .from('job_labor')
    .insert({
      job_id: jobId,
      user_id: userId,
      clock_in: data.clockIn.toISOString(),
      clock_out: data.clockOut.toISOString(),
      break_minutes: breakMins,
      total_minutes: totalMinutes,
      hourly_rate: user?.hourly_rate || 0,
      overtime_rate: user?.overtime_rate || 0,
      is_overtime: data.isOvertime || false,
      labor_cost: laborCost,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(jobId);

  return { success: true, entryId: entry.id };
}

/**
 * Update labor entry
 */
export async function updateLaborEntry(
  entryId: string,
  data: Partial<{
    clockIn: Date;
    clockOut: Date;
    breakMinutes: number;
    notes: string;
    isOvertime: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current entry
  const { data: entry } = await supabase
    .from('job_labor')
    .select('*')
    .eq('id', entryId)
    .single();

  if (!entry) {
    return { success: false, error: 'Labor entry not found' };
  }

  const updateData: Record<string, any> = {};

  const clockIn = data.clockIn || new Date(entry.clock_in);
  const clockOut = data.clockOut || (entry.clock_out ? new Date(entry.clock_out) : null);
  const breakMins = data.breakMinutes !== undefined ? data.breakMinutes : entry.break_minutes;

  if (data.clockIn) updateData.clock_in = data.clockIn.toISOString();
  if (data.clockOut) updateData.clock_out = data.clockOut.toISOString();
  if (data.breakMinutes !== undefined) updateData.break_minutes = data.breakMinutes;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isOvertime !== undefined) updateData.is_overtime = data.isOvertime;

  // Recalculate if times changed
  if (clockOut) {
    const totalMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMins;
    const hours = totalMinutes / 60;
    const rate = (data.isOvertime || entry.is_overtime)
      ? (entry.overtime_rate || entry.hourly_rate || 0)
      : (entry.hourly_rate || 0);

    updateData.total_minutes = totalMinutes;
    updateData.labor_cost = hours * rate;
  }

  const { error } = await supabase
    .from('job_labor')
    .update(updateData)
    .eq('id', entryId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(entry.job_id);

  return { success: true };
}

/**
 * Delete labor entry
 */
export async function deleteLaborEntry(entryId: string, client?: SupabaseClient): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? await createClient();

  const { data: entry } = await supabase
    .from('job_labor')
    .select('job_id')
    .eq('id', entryId)
    .single();

  if (!entry) {
    return { success: false, error: 'Labor entry not found' };
  }

  const { error } = await supabase.from('job_labor').delete().eq('id', entryId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(entry.job_id);

  return { success: true };
}

/**
 * Get labor entries for a job
 */
export async function getJobLabor(jobId: string, client?: SupabaseClient): Promise<LaborEntry[]> {
  const supabase = client ?? await createClient();

  const { data } = await supabase
    .from('job_labor')
    .select(`
      *,
      user:users!job_labor_user_id_fkey(name)
    `)
    .eq('job_id', jobId)
    .order('clock_in', { ascending: false });

  return (data || []).map((l) => ({
    id: l.id,
    jobId: l.job_id,
    userId: l.user_id,
    userName: l.user?.name || '',
    clockIn: l.clock_in,
    clockOut: l.clock_out,
    breakMinutes: l.break_minutes,
    totalMinutes: l.total_minutes,
    hourlyRate: l.hourly_rate,
    overtimeRate: l.overtime_rate,
    isOvertime: l.is_overtime,
    laborCost: l.labor_cost,
    notes: l.notes,
  }));
}

/**
 * Get active clock-in for a user
 */
export async function getActiveClockIn(userId: string, client?: SupabaseClient): Promise<{
  jobId: string;
  jobTitle: string;
  clockIn: string;
  duration: number;
} | null> {
  const supabase = client ?? await createClient();

  const { data } = await supabase
    .from('job_labor')
    .select(`
      job_id,
      clock_in,
      job:jobs(title)
    `)
    .eq('user_id', userId)
    .is('clock_out', null)
    .single();

  if (!data) return null;

  const clockIn = new Date(data.clock_in);
  const duration = Math.round((Date.now() - clockIn.getTime()) / 60000);

  return {
    jobId: data.job_id,
    jobTitle: (data.job as any)?.title || '',
    clockIn: data.clock_in,
    duration,
  };
}

/**
 * Get labor summary for a date range
 */
export async function getLaborSummary(
  userId: string,
  startDate: string,
  endDate: string,
  client?: SupabaseClient
): Promise<{
  totalMinutes: number;
  totalCost: number;
  jobCount: number;
  entries: LaborEntry[];
}> {
  const supabase = client ?? await createClient();

  const { data } = await supabase
    .from('job_labor')
    .select(`
      *,
      user:users!job_labor_user_id_fkey(name)
    `)
    .eq('user_id', userId)
    .gte('clock_in', startDate)
    .lte('clock_in', endDate + 'T23:59:59')
    .not('clock_out', 'is', null);

  const entries = (data || []).map((l) => ({
    id: l.id,
    jobId: l.job_id,
    userId: l.user_id,
    userName: l.user?.name || '',
    clockIn: l.clock_in,
    clockOut: l.clock_out,
    breakMinutes: l.break_minutes,
    totalMinutes: l.total_minutes,
    hourlyRate: l.hourly_rate,
    overtimeRate: l.overtime_rate,
    isOvertime: l.is_overtime,
    laborCost: l.labor_cost,
    notes: l.notes,
  }));

  const totalMinutes = entries.reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
  const totalCost = entries.reduce((sum, e) => sum + (e.laborCost || 0), 0);
  const jobIds = new Set(entries.map((e) => e.jobId));

  return {
    totalMinutes,
    totalCost,
    jobCount: jobIds.size,
    entries,
  };
}
