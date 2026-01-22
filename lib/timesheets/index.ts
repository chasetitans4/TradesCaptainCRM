// =====================================================
// TIMESHEETS LIBRARY
// Clock in/out and time tracking functionality
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format, differenceInMinutes } from 'date-fns';
import { logger } from '@/lib/logger';
const timesheetsLogger = logger.child({ context: 'timesheets' });

// =====================================================
// TYPES
// =====================================================

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  business_id: string;
  job_id?: string;
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  notes?: string;
  latitude_in?: number;
  longitude_in?: number;
  latitude_out?: number;
  longitude_out?: number;
  status: 'active' | 'completed' | 'submitted' | 'approved' | 'rejected' | 'edited';
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  job?: {
    id: string;
    service_type: string;
    customer?: { name: string };
  };
}

export interface JobTimeEntry {
  id: string;
  business_id: string;
  time_entry_id?: string;
  job_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_travel: boolean;
  notes?: string;
  created_at: string;
  // Joined data
  job?: {
    id: string;
    service_type: string;
    customer?: { name: string };
  };
}

export interface BreakEntry {
  id: string;
  time_entry_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  break_type: 'paid' | 'unpaid' | 'lunch';
  created_at: string;
}

export interface TimesheetSettings {
  requireClockInLocation: boolean;
  requireClockOutLocation: boolean;
  allowManualEntries: boolean;
  requireApproval: boolean;
  autoBreakDeduction: number;
  autoBreakAfterHours: number;
  overtimeThresholdDaily: number;
  overtimeThresholdWeekly: number;
  roundingRule: 'none' | '15min' | '6min';
  lockTimesheetsAfterDays: number;
}

export interface TimesheetSummary {
  id: string;
  user_id: string;
  business_id: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  days_worked: number;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
}

export interface DailySummary {
  date: string;
  total_minutes: number;
  entries: TimeEntry[];
}

/**
 * Clock in a user
 */
export async function clockIn(
  userId: string,
  businessId: string,
  options?: {
    jobId?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<TimeEntry> {
  const supabase = await createClient();

  // Check if user is already clocked in
  const { data: activeEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (activeEntry) {
    throw new Error('Already clocked in. Please clock out first.');
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userId,
      business_id: businessId,
      job_id: options?.jobId || null,
      clock_in: new Date().toISOString(),
      break_minutes: 0,
      notes: options?.notes || null,
      latitude_in: options?.latitude || null,
      longitude_in: options?.longitude || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Clock in error',
      userId,
      businessId,
      jobId: options?.jobId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to clock in');
  }

  return data;
}

/**
 * Clock out a user
 */
export async function clockOut(
  userId: string,
  options?: {
    breakMinutes?: number;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<TimeEntry> {
  const supabase = await createClient();

  // Find active time entry
  const { data: activeEntry, error: findError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (findError || !activeEntry) {
    throw new Error('No active clock-in found');
  }

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      clock_out: new Date().toISOString(),
      break_minutes: options?.breakMinutes ?? activeEntry.break_minutes,
      notes: options?.notes || activeEntry.notes,
      latitude_out: options?.latitude || null,
      longitude_out: options?.longitude || null,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', activeEntry.id)
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Clock out error',
      userId,
      breakMinutes: options?.breakMinutes,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to clock out');
  }

  return data;
}

/**
 * Get current clock status for a user
 */
export async function getClockStatus(userId: string): Promise<{
  isClockedIn: boolean;
  currentEntry?: TimeEntry;
  todayHours: number;
  weekHours: number;
}> {
  const supabase = await createClient();

  // Get active entry
  const { data: activeEntry } = await supabase
    .from('time_entries')
    .select(`
      *,
      job:jobs(id, title, customer_name)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // Get today's total
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: todayEntries } = await supabase
    .from('time_entries')
    .select('clock_in, clock_out, break_minutes')
    .eq('user_id', userId)
    .in('status', ['active', 'completed'])
    .gte('clock_in', todayStart)
    .lte('clock_in', todayEnd);

  // Get week total
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString();
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 }).toISOString();

  const { data: weekEntries } = await supabase
    .from('time_entries')
    .select('clock_in, clock_out, break_minutes')
    .eq('user_id', userId)
    .in('status', ['active', 'completed'])
    .gte('clock_in', weekStart)
    .lte('clock_in', weekEnd);

  const todayHours = calculateTotalHours(todayEntries || []);
  const weekHours = calculateTotalHours(weekEntries || []);

  return {
    isClockedIn: !!activeEntry,
    currentEntry: activeEntry || undefined,
    todayHours,
    weekHours,
  };
}

/**
 * Get time entries for a user within a date range
 */
export async function getTimeEntries(
  businessId: string,
  options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'active' | 'completed' | 'edited';
  }
): Promise<TimeEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('time_entries')
    .select(`
      *,
      user:users!time_entries_user_id_fkey(id, name, avatar_url),
      job:jobs!time_entries_job_id_fkey(id, title, customer_name)
    `)
    .eq('business_id', businessId)
    .order('clock_in', { ascending: false });

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options?.startDate) {
    query = query.gte('clock_in', options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte('clock_in', options.endDate.toISOString());
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    timesheetsLogger.error({
      msg: 'Error fetching time entries',
      businessId,
      options,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to fetch time entries');
  }

  return data || [];
}

/**
 * Get weekly summary for a user
 */
export async function getWeeklySummary(
  userId: string,
  businessId: string,
  weekStart?: Date
): Promise<{
  summary: TimesheetSummary | null;
  dailyBreakdown: DailySummary[];
}> {
  const supabase = await createClient();
  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 0 });
  const end = endOfWeek(start, { weekStartsOn: 0 });

  // Get or create weekly summary
  const { data: summary } = await supabase
    .from('timesheet_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', format(start, 'yyyy-MM-dd'))
    .single();

  // Get all entries for the week
  const { data: entries } = await supabase
    .from('time_entries')
    .select(`
      *,
      job:jobs!time_entries_job_id_fkey(id, title)
    `)
    .eq('user_id', userId)
    .in('status', ['completed', 'edited'])
    .gte('clock_in', start.toISOString())
    .lte('clock_in', end.toISOString())
    .order('clock_in', { ascending: true });

  // Group by day
  const dailyBreakdown: DailySummary[] = [];
  const entriesByDay = new Map<string, TimeEntry[]>();

  (entries || []).forEach((entry) => {
    const day = format(new Date(entry.clock_in), 'yyyy-MM-dd');
    if (!entriesByDay.has(day)) {
      entriesByDay.set(day, []);
    }
    entriesByDay.get(day)!.push(entry);
  });

  // Create daily summaries for each day of the week
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayEntries = entriesByDay.get(dayStr) || [];
    const totalMinutes = dayEntries.reduce((sum, entry) => {
      if (!entry.clock_out) return sum;
      const minutes = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
      return sum + Math.max(0, minutes - (entry.break_minutes || 0));
    }, 0);

    dailyBreakdown.push({
      date: dayStr,
      total_minutes: totalMinutes,
      entries: dayEntries,
    });
  }

  return {
    summary,
    dailyBreakdown,
  };
}

/**
 * Add or edit a time entry manually
 */
export async function addTimeEntry(
  userId: string,
  businessId: string,
  data: {
    clockIn: Date;
    clockOut: Date;
    breakMinutes?: number;
    jobId?: string;
    notes?: string;
  }
): Promise<TimeEntry> {
  const supabase = await createClient();

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userId,
      business_id: businessId,
      job_id: data.jobId || null,
      clock_in: data.clockIn.toISOString(),
      clock_out: data.clockOut.toISOString(),
      break_minutes: data.breakMinutes || 0,
      notes: data.notes || null,
      status: 'edited', // Mark as manually entered
    })
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error adding time entry',
      userId,
      businessId,
      data,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to add time entry');
  }

  return entry;
}

/**
 * Update a time entry
 */
export async function updateTimeEntry(
  entryId: string,
  updates: {
    clockIn?: Date;
    clockOut?: Date;
    breakMinutes?: number;
    jobId?: string;
    notes?: string;
  }
): Promise<TimeEntry> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    status: 'edited',
  };

  if (updates.clockIn) updateData.clock_in = updates.clockIn.toISOString();
  if (updates.clockOut) updateData.clock_out = updates.clockOut.toISOString();
  if (updates.breakMinutes !== undefined) updateData.break_minutes = updates.breakMinutes;
  if (updates.jobId !== undefined) updateData.job_id = updates.jobId || null;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  const { data, error } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', entryId)
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error updating time entry',
      entryId,
      updates: updateData,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to update time entry');
  }

  return data;
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(entryId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    timesheetsLogger.error({
      msg: 'Error deleting time entry',
      entryId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to delete time entry');
  }
}

/**
 * Approve a weekly timesheet
 */
export async function approveTimesheet(
  userId: string,
  businessId: string,
  weekStart: Date,
  approvedBy: string
): Promise<void> {
  const supabase = await createClient();
  const start = startOfWeek(weekStart, { weekStartsOn: 0 });
  const end = endOfWeek(weekStart, { weekStartsOn: 0 });

  // Calculate totals
  const { data: entries } = await supabase
    .from('time_entries')
    .select('clock_in, clock_out, break_minutes')
    .eq('user_id', userId)
    .in('status', ['completed', 'edited'])
    .gte('clock_in', start.toISOString())
    .lte('clock_in', end.toISOString());

  const totalHours = calculateTotalHours(entries || []);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);

  // Count unique days
  const uniqueDays = new Set(
    (entries || []).map((e) => format(new Date(e.clock_in), 'yyyy-MM-dd'))
  );

  // Upsert summary
  const { error } = await supabase
    .from('timesheet_summaries')
    .upsert({
      user_id: userId,
      business_id: businessId,
      week_start: format(start, 'yyyy-MM-dd'),
      week_end: format(end, 'yyyy-MM-dd'),
      total_hours: totalHours,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      days_worked: uniqueDays.size,
      approved: true,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' });

  if (error) {
    timesheetsLogger.error({
      msg: 'Error approving timesheet',
      userId,
      businessId,
      weekStart: weekStart.toISOString(),
      approvedBy,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to approve timesheet');
  }
}

// Helper function to calculate total hours from entries
function calculateTotalHours(
  entries: Array<{ clock_in: string; clock_out?: string; break_minutes: number }>
): number {
  return entries.reduce((sum, entry) => {
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    const minutes = differenceInMinutes(clockOut, new Date(entry.clock_in));
    const worked = Math.max(0, minutes - (entry.break_minutes || 0));
    return sum + worked / 60;
  }, 0);
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format duration from minutes
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// =====================================================
// BREAK TRACKING
// =====================================================

/**
 * Start a break
 */
export async function startBreak(
  timeEntryId: string,
  breakType: BreakEntry['break_type'] = 'unpaid'
): Promise<BreakEntry> {
  const supabase = await createClient();

  // Check for existing active break
  const { data: existing } = await supabase
    .from('break_entries')
    .select('id')
    .eq('time_entry_id', timeEntryId)
    .is('end_time', null)
    .single();

  if (existing) {
    throw new Error('Already on a break');
  }

  const { data, error } = await supabase
    .from('break_entries')
    .insert({
      time_entry_id: timeEntryId,
      start_time: new Date().toISOString(),
      break_type: breakType,
    })
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error starting break',
      timeEntryId,
      breakType,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to start break');
  }

  return data;
}

/**
 * End a break
 */
export async function endBreak(breakId: string): Promise<BreakEntry> {
  const supabase = await createClient();

  // Get break entry
  const { data: breakEntry, error: findError } = await supabase
    .from('break_entries')
    .select('*')
    .eq('id', breakId)
    .single();

  if (findError || !breakEntry) {
    throw new Error('Break not found');
  }

  if (breakEntry.end_time) {
    throw new Error('Break already ended');
  }

  // Calculate duration
  const start = new Date(breakEntry.start_time);
  const end = new Date();
  const durationMinutes = differenceInMinutes(end, start);

  // Update break entry
  const { data, error } = await supabase
    .from('break_entries')
    .update({
      end_time: end.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', breakId)
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error ending break',
      breakId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to end break');
  }

  // Update timesheet total break minutes (only for unpaid/lunch breaks)
  if (breakEntry.break_type !== 'paid') {
    const { data: timeEntry } = await supabase
      .from('time_entries')
      .select('break_minutes')
      .eq('id', breakEntry.time_entry_id)
      .single();

    if (timeEntry) {
      await supabase
        .from('time_entries')
        .update({ break_minutes: (timeEntry.break_minutes || 0) + durationMinutes })
        .eq('id', breakEntry.time_entry_id);
    }
  }

  return data;
}

/**
 * Get active break for a time entry
 */
export async function getActiveBreak(timeEntryId: string): Promise<BreakEntry | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('break_entries')
    .select('*')
    .eq('time_entry_id', timeEntryId)
    .is('end_time', null)
    .single();

  return data;
}

/**
 * Get all breaks for a time entry
 */
export async function getBreaks(timeEntryId: string): Promise<BreakEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('break_entries')
    .select('*')
    .eq('time_entry_id', timeEntryId)
    .order('start_time', { ascending: true });

  if (error) {
    timesheetsLogger.error({
      msg: 'Error fetching breaks',
      timeEntryId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return [];
  }

  return data || [];
}

// =====================================================
// JOB TIME TRACKING
// =====================================================

/**
 * Start job timer
 */
export async function startJobTimer(
  jobId: string,
  userId: string,
  businessId: string,
  isTravel: boolean = false
): Promise<JobTimeEntry> {
  const supabase = await createClient();

  // Check for existing active timer on any job
  const { data: existing } = await supabase
    .from('job_time_entries')
    .select('id, job_id')
    .eq('user_id', userId)
    .is('end_time', null)
    .single();

  if (existing) {
    if (existing.job_id === jobId) {
      throw new Error('Timer already running for this job');
    }
    // Stop the other timer first
    await stopJobTimer(existing.id);
  }

  // Get today's time entry
  const todayStart = startOfDay(new Date()).toISOString();
  const { data: timeEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('clock_in', todayStart)
    .single();

  const { data, error } = await supabase
    .from('job_time_entries')
    .insert({
      business_id: businessId,
      time_entry_id: timeEntry?.id || null,
      job_id: jobId,
      user_id: userId,
      start_time: new Date().toISOString(),
      is_travel: isTravel,
    })
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error starting job timer',
      jobId,
      userId,
      businessId,
      isTravel,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to start job timer');
  }

  return data;
}

/**
 * Stop job timer
 */
export async function stopJobTimer(entryId: string): Promise<JobTimeEntry> {
  const supabase = await createClient();

  const { data: entry, error: findError } = await supabase
    .from('job_time_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  if (findError || !entry) {
    throw new Error('Time entry not found');
  }

  if (entry.end_time) {
    throw new Error('Timer already stopped');
  }

  const start = new Date(entry.start_time);
  const end = new Date();
  const durationMinutes = differenceInMinutes(end, start);

  const { data, error } = await supabase
    .from('job_time_entries')
    .update({
      end_time: end.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', entryId)
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error stopping job timer',
      entryId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to stop job timer');
  }

  return data;
}

/**
 * Get active job timer for a user
 */
export async function getActiveJobTimer(userId: string): Promise<JobTimeEntry | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_time_entries')
    .select(`
      *,
      job:jobs(id, service_type, customer:customers(name))
    `)
    .eq('user_id', userId)
    .is('end_time', null)
    .single();

  return data;
}

/**
 * Get time entries for a job
 */
export async function getJobTimeEntries(jobId: string): Promise<JobTimeEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('job_time_entries')
    .select(`
      *,
      user:users!job_time_entries_user_id_fkey(name)
    `)
    .eq('job_id', jobId)
    .order('start_time', { ascending: true });

  if (error) {
    timesheetsLogger.error({
      msg: 'Error fetching job time entries',
      jobId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return [];
  }

  return data || [];
}

/**
 * Get total time for a job
 */
export async function getJobTotalTime(jobId: string): Promise<{
  totalMinutes: number;
  travelMinutes: number;
  workMinutes: number;
}> {
  const entries = await getJobTimeEntries(jobId);

  let travelMinutes = 0;
  let workMinutes = 0;

  for (const entry of entries) {
    const minutes = entry.duration_minutes || 0;
    if (entry.is_travel) {
      travelMinutes += minutes;
    } else {
      workMinutes += minutes;
    }
  }

  return {
    totalMinutes: travelMinutes + workMinutes,
    travelMinutes,
    workMinutes,
  };
}

// =====================================================
// APPROVAL WORKFLOW
// =====================================================

/**
 * Submit timesheet for approval
 */
export async function submitTimesheet(entryId: string): Promise<TimeEntry> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('status', 'completed')
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error submitting timesheet',
      entryId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to submit timesheet');
  }

  return data;
}

/**
 * Approve a single time entry
 */
export async function approveTimeEntry(
  entryId: string,
  approverId: string
): Promise<TimeEntry> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .in('status', ['submitted', 'completed'])
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error approving time entry',
      entryId,
      approverId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to approve time entry');
  }

  return data;
}

/**
 * Reject a time entry
 */
export async function rejectTimeEntry(
  entryId: string,
  reason: string
): Promise<TimeEntry> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('status', 'submitted')
    .select()
    .single();

  if (error) {
    timesheetsLogger.error({
      msg: 'Error rejecting time entry',
      entryId,
      reason,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to reject time entry');
  }

  return data;
}

/**
 * Bulk approve time entries
 */
export async function bulkApproveTimeEntries(
  entryIds: string[],
  approverId: string
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', entryIds)
    .in('status', ['submitted', 'completed'])
    .select('id');

  if (error) {
    timesheetsLogger.error({
      msg: 'Error bulk approving time entries',
      entryIds,
      approverId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to approve time entries');
  }

  return data?.length || 0;
}

// =====================================================
// REPORTS
// =====================================================

/**
 * Get payroll export data
 */
export async function getPayrollExport(
  businessId: string,
  startDate: Date,
  endDate: Date,
  overtimeThreshold: number = 8
): Promise<{
  employee: string;
  date: string;
  clockIn: string;
  clockOut: string;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
  totalHours: number;
}[]> {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('time_entries')
    .select(`
      *,
      user:users!time_entries_user_id_fkey(name)
    `)
    .eq('business_id', businessId)
    .gte('clock_in', startDate.toISOString())
    .lte('clock_in', endDate.toISOString())
    .in('status', ['completed', 'approved'])
    .order('clock_in', { ascending: true });

  if (!entries) return [];

  return entries.map((entry) => {
    const clockIn = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
    const totalMinutes = clockOut ? differenceInMinutes(clockOut, clockIn) - (entry.break_minutes || 0) : 0;
    const totalHours = Math.max(0, totalMinutes / 60);
    const regularHours = Math.min(totalHours, overtimeThreshold);
    const overtimeHours = Math.max(0, totalHours - overtimeThreshold);

    return {
      employee: entry.user?.name || 'Unknown',
      date: format(clockIn, 'yyyy-MM-dd'),
      clockIn: format(clockIn, 'HH:mm'),
      clockOut: clockOut ? format(clockOut, 'HH:mm') : '',
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      breakMinutes: entry.break_minutes || 0,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  });
}

/**
 * Get timesheet stats for a date range
 */
export async function getTimesheetStats(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalEntries: number;
  pendingApproval: number;
  approved: number;
  totalHours: number;
  totalOvertimeHours: number;
  averageHoursPerDay: number;
}> {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('time_entries')
    .select('status, clock_in, clock_out, break_minutes')
    .eq('business_id', businessId)
    .gte('clock_in', startDate.toISOString())
    .lte('clock_in', endDate.toISOString());

  if (!entries) {
    return {
      totalEntries: 0,
      pendingApproval: 0,
      approved: 0,
      totalHours: 0,
      totalOvertimeHours: 0,
      averageHoursPerDay: 0,
    };
  }

  const totalEntries = entries.length;
  const pendingApproval = entries.filter((e) => e.status === 'submitted').length;
  const approved = entries.filter((e) => e.status === 'approved').length;

  let totalHours = 0;
  let totalOvertimeHours = 0;

  entries.forEach((entry) => {
    if (entry.clock_out) {
      const minutes = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in)) - (entry.break_minutes || 0);
      const hours = Math.max(0, minutes / 60);
      totalHours += hours;
      totalOvertimeHours += Math.max(0, hours - 8);
    }
  });

  return {
    totalEntries,
    pendingApproval,
    approved,
    totalHours: Math.round(totalHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    averageHoursPerDay: totalEntries > 0 ? Math.round((totalHours / totalEntries) * 100) / 100 : 0,
  };
}

/**
 * Apply rounding rule to hours
 */
export function applyRounding(
  hours: number,
  rule: TimesheetSettings['roundingRule']
): number {
  if (rule === 'none') return hours;

  const minuteIncrement = rule === '15min' ? 15 : 6;
  const totalMinutes = hours * 60;
  const roundedMinutes = Math.round(totalMinutes / minuteIncrement) * minuteIncrement;
  return roundedMinutes / 60;
}

/**
 * Get week start date (Monday) for a given date
 */
export function getWeekStartMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
