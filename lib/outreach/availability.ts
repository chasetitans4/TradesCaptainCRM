// =====================================================
// OUTREACH MODULE - AGENT AVAILABILITY
// Calculates and checks agent availability for scheduling
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  AgentAvailability,
  AgentBreakTime,
  AgentTimeBlock,
  AgentBlackoutDay,
  GlobalBlackoutDate,
  CallDistributionSettings,
} from '@/types/outreach';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AgentAvailabilityResult {
  agent_id: string;
  agent_name: string;
  agent_timezone: string;
  slots: TimeSlot[];
  is_available_today: boolean;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is a global blackout (holiday)
 */
export async function isGlobalBlackout(date: Date): Promise<boolean> {
  const supabase = await createClient();
  const dateStr = date.toISOString().split('T')[0];

  const { data } = await supabase
    .from('global_blackout_dates')
    .select('id')
    .or(`blackout_date.eq.${dateStr},and(recurring_yearly.eq.true)`)
    .limit(1);

  if (data && data.length > 0) {
    return true;
  }

  // Check recurring yearly holidays (match month and day)
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  const { data: recurringData } = await supabase
    .from('global_blackout_dates')
    .select('blackout_date')
    .eq('recurring_yearly', true);

  if (recurringData) {
    for (const holiday of recurringData) {
      const holidayDate = new Date(holiday.blackout_date);
      if (holidayDate.getMonth() + 1 === month && holidayDate.getDate() === dayOfMonth) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 */
export async function isBusinessDay(date: Date, settings?: CallDistributionSettings): Promise<boolean> {
  // Check weekend blackouts
  if (settings) {
    if (date.getDay() === 0 && settings.blackout_sunday) return false;
    if (date.getDay() === 6 && settings.blackout_saturday) return false;
  } else {
    if (isWeekend(date)) return false;
  }

  // Check global blackouts
  if (await isGlobalBlackout(date)) {
    return false;
  }

  return true;
}

/**
 * Get the next N business days from a start date
 */
export async function getBusinessDayWindow(
  startDate: Date,
  businessDays: number = 3
): Promise<{ start: Date; end: Date; dates: Date[] }> {
  const supabase = await createClient();

  // Get distribution settings
  const { data: settings } = await supabase
    .from('call_distribution_settings')
    .select('*')
    .limit(1)
    .single();

  const dates: Date[] = [];
  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (dates.length < businessDays) {
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000); // Next day

    if (await isBusinessDay(current, settings)) {
      dates.push(new Date(current));
    }

    // Safety limit - don't look more than 14 days ahead
    if (current.getTime() - startDate.getTime() > 14 * 24 * 60 * 60 * 1000) {
      break;
    }
  }

  return {
    start: dates[0] || startDate,
    end: dates[dates.length - 1] || startDate,
    dates,
  };
}

/**
 * Get agent's weekly availability schedule
 */
export async function getAgentAvailabilitySchedule(
  agentId: string
): Promise<AgentAvailability[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('agent_availability')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('shift_number', { ascending: true });

  return data || [];
}

/**
 * Get agent's break times
 */
export async function getAgentBreakTimes(
  agentId: string
): Promise<AgentBreakTime[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('agent_break_times')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true);

  return data || [];
}

/**
 * Get agent's time blocks (vacations, meetings, etc.)
 */
export async function getAgentTimeBlocks(
  agentId: string,
  startDate: Date,
  endDate: Date
): Promise<AgentTimeBlock[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('agent_time_blocks')
    .select('*')
    .eq('agent_id', agentId)
    .gte('end_datetime', startDate.toISOString())
    .lte('start_datetime', endDate.toISOString());

  return data || [];
}

/**
 * Get agent's blackout days
 */
export async function getAgentBlackoutDays(
  agentId: string
): Promise<AgentBlackoutDay[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('agent_blackout_days')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true);

  return data || [];
}

/**
 * Check if an agent is blacked out on a specific date
 */
export async function isAgentBlackedOut(
  agentId: string,
  date: Date
): Promise<boolean> {
  const blackoutDays = await getAgentBlackoutDays(agentId);
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay();

  for (const blackout of blackoutDays) {
    // Check recurring weekly blackouts
    if (blackout.blackout_type === 'recurring' && blackout.day_of_week === dayOfWeek) {
      return true;
    }

    // Check specific date blackouts
    if (blackout.blackout_type === 'specific') {
      if (blackout.blackout_date === dateStr) {
        return true;
      }

      // Check date ranges
      if (blackout.blackout_date && blackout.blackout_end_date) {
        const start = new Date(blackout.blackout_date);
        const end = new Date(blackout.blackout_end_date);
        if (date >= start && date <= end) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get agent's available time slots for a specific date
 */
export async function getAgentAvailableSlotsForDate(
  agentId: string,
  date: Date,
  bufferMinutes: number = 30,
  callDurationMinutes: number = 15
): Promise<TimeSlot[]> {
  const supabase = await createClient();
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split('T')[0];

  // Check if agent is blacked out
  if (await isAgentBlackedOut(agentId, date)) {
    return [];
  }

  // Get agent's availability for this day
  const availability = await getAgentAvailabilitySchedule(agentId);
  const dayAvailability = availability.filter((a) => a.day_of_week === dayOfWeek);

  if (dayAvailability.length === 0) {
    return [];
  }

  // Get break times
  const breakTimes = await getAgentBreakTimes(agentId);
  const dayBreaks = breakTimes.filter((b) => b.day_of_week === dayOfWeek);

  // Get time blocks for this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const timeBlocks = await getAgentTimeBlocks(agentId, startOfDay, endOfDay);

  // Get existing scheduled calls
  const { data: existingCalls } = await supabase
    .from('scheduled_calls')
    .select('scheduled_at, duration_minutes')
    .eq('agent_id', agentId)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .not('status', 'in', '("cancelled","rescheduled")');

  // Build available slots
  const slots: TimeSlot[] = [];

  for (const avail of dayAvailability) {
    // Parse start and end times
    const [startHour, startMin] = avail.start_time.split(':').map(Number);
    const [endHour, endMin] = avail.end_time.split(':').map(Number);

    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMin, 0, 0);

    const slotEnd = new Date(date);
    slotEnd.setHours(endHour, endMin, 0, 0);

    // Generate 15-minute slots within availability window
    let currentSlot = new Date(slotStart);

    while (currentSlot.getTime() + callDurationMinutes * 60 * 1000 <= slotEnd.getTime()) {
      const slotEndTime = new Date(currentSlot.getTime() + callDurationMinutes * 60 * 1000);

      // Check if slot conflicts with break times
      let isBreak = false;
      for (const brk of dayBreaks) {
        const [breakStartH, breakStartM] = brk.start_time.split(':').map(Number);
        const [breakEndH, breakEndM] = brk.end_time.split(':').map(Number);

        const breakStart = new Date(date);
        breakStart.setHours(breakStartH, breakStartM, 0, 0);
        const breakEnd = new Date(date);
        breakEnd.setHours(breakEndH, breakEndM, 0, 0);

        if (currentSlot < breakEnd && slotEndTime > breakStart) {
          isBreak = true;
          break;
        }
      }

      if (isBreak) {
        currentSlot = new Date(currentSlot.getTime() + 15 * 60 * 1000);
        continue;
      }

      // Check if slot conflicts with time blocks
      let isBlocked = false;
      for (const block of timeBlocks) {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);

        if (currentSlot < blockEnd && slotEndTime > blockStart) {
          isBlocked = true;
          break;
        }
      }

      if (isBlocked) {
        currentSlot = new Date(currentSlot.getTime() + 15 * 60 * 1000);
        continue;
      }

      // Check if slot conflicts with existing calls (with buffer)
      let hasConflict = false;
      for (const call of existingCalls || []) {
        const callStart = new Date(call.scheduled_at);
        const callEnd = new Date(callStart.getTime() + (call.duration_minutes || 15) * 60 * 1000);

        // Apply buffer before and after
        const bufferedCallStart = new Date(callStart.getTime() - bufferMinutes * 60 * 1000);
        const bufferedCallEnd = new Date(callEnd.getTime() + bufferMinutes * 60 * 1000);

        if (currentSlot < bufferedCallEnd && slotEndTime > bufferedCallStart) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        slots.push({
          start: new Date(currentSlot),
          end: slotEndTime,
        });
      }

      currentSlot = new Date(currentSlot.getTime() + 15 * 60 * 1000);
    }
  }

  return slots;
}

/**
 * Check if a specific time slot is available for an agent
 */
export async function isSlotAvailable(
  agentId: string,
  startTime: Date,
  durationMinutes: number = 15,
  bufferMinutes: number = 30
): Promise<boolean> {
  const slots = await getAgentAvailableSlotsForDate(
    agentId,
    startTime,
    bufferMinutes,
    durationMinutes
  );

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  for (const slot of slots) {
    if (startTime >= slot.start && endTime <= slot.end) {
      return true;
    }
  }

  return false;
}

/**
 * Get all agents' availability for a date range
 */
export async function getAllAgentsAvailability(
  startDate: Date,
  endDate: Date,
  agentIds?: string[]
): Promise<AgentAvailabilityResult[]> {
  const supabase = await createClient();

  // Get agents
  let query = supabase
    .from('admin_users')
    .select('id, name, timezone')
    .eq('role', 'agent')
    .eq('is_active', true);

  if (agentIds && agentIds.length > 0) {
    query = query.in('id', agentIds);
  }

  const { data: agents } = await query;

  if (!agents) return [];

  const results: AgentAvailabilityResult[] = [];

  for (const agent of agents) {
    const slots: TimeSlot[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const daySlots = await getAgentAvailableSlotsForDate(agent.id, current);
      slots.push(...daySlots);
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    results.push({
      agent_id: agent.id,
      agent_name: agent.name,
      agent_timezone: agent.timezone || 'America/New_York',
      slots,
      is_available_today: slots.some(
        (s) =>
          s.start.getFullYear() === today.getFullYear() &&
          s.start.getMonth() === today.getMonth() &&
          s.start.getDate() === today.getDate()
      ),
    });
  }

  return results;
}
