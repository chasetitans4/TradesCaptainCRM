// =====================================================
// CALENDAR AVAILABILITY CHECKING
// Core logic for determining available time slots
// =====================================================

import { getCalendarEvents } from '@/lib/nylas/calendar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { TimeSlot, ScheduleBlock } from '@/types';

interface AvailabilityOptions {
  user_id: string;
  date: Date;
  duration_minutes: number;
  include_drive_time?: boolean;
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableSlots(
  options: AvailabilityOptions
): Promise<TimeSlot[]> {
  const { user_id, date, duration_minutes, include_drive_time = true } = options;
  const supabase = await createServerSupabaseClient();

  // 1. Get working hours for this day
  const dayOfWeek = date.getDay();

  // First try user-specific working hours
  let { data: workingHours } = await supabase
    .from('working_hours')
    .select('*')
    .eq('user_id', user_id)
    .eq('day_of_week', dayOfWeek)
    .single();

  // Fall back to business default if no user-specific hours
  if (!workingHours) {
    const { data: user } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user_id)
      .single();

    if (user) {
      const { data: businessHours } = await supabase
        .from('working_hours')
        .select('*')
        .eq('business_id', user.business_id)
        .is('user_id', null)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (!businessHours?.is_working_day) {
        return []; // Not a working day
      }
      workingHours = businessHours;
    }
  } else if (!workingHours.is_working_day) {
    return []; // Not a working day
  }

  // Default hours if nothing is configured
  const hours = workingHours || {
    start_time: '08:00',
    end_time: '17:00',
    is_working_day: true,
  };

  // 2. Collect all blocked time slots
  const blockedSlots: TimeSlot[] = [];

  // 2a. Get user's business_id for subsequent queries
  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user_id)
    .single();

  if (!userData) {
    return [];
  }

  // 2b. Get existing jobs from database
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const dateStr = date.toISOString().split('T')[0];

  const { data: jobs } = await supabase
    .from('jobs')
    .select('scheduled_time_start, scheduled_time_end')
    .eq('assigned_to', user_id)
    .eq('scheduled_date', dateStr)
    .in('status', ['scheduled', 'in_progress']);

  // Get drive time setting from business
  const { data: business } = await supabase
    .from('businesses')
    .select('drive_time_enabled, drive_time_default_minutes')
    .eq('id', userData.business_id)
    .single();

  const driveTimeMinutes =
    include_drive_time && business?.drive_time_enabled
      ? business.drive_time_default_minutes || 30
      : 0;

  jobs?.forEach((job) => {
    if (!job.scheduled_time_start) return;

    const start = combineDateAndTime(date, job.scheduled_time_start);
    // Calculate end time from scheduled_time_end or default to 1 hour
    const end = job.scheduled_time_end
      ? combineDateAndTime(date, job.scheduled_time_end)
      : addMinutes(start, 60);

    blockedSlots.push({
      start: addMinutes(start, -driveTimeMinutes),
      end: addMinutes(end, driveTimeMinutes),
    });
  });

  // 2c. Get schedule blocks (breaks, lunch)
  const { data: blocks } = await supabase
    .from('schedule_blocks')
    .select('*')
    .eq('business_id', userData.business_id)
    .or(`user_id.eq.${user_id},user_id.is.null`)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${dateStr}`);

  blocks?.forEach((block: ScheduleBlock) => {
    // Skip if block is for a specific date that doesn't match
    if (block.specific_date && block.specific_date !== dateStr) {
      return;
    }
    // Skip if block is recurring but for a different day
    if (block.is_recurring && block.day_of_week !== null && block.day_of_week !== dayOfWeek) {
      return;
    }

    blockedSlots.push({
      start: combineDateAndTime(date, block.start_time),
      end: combineDateAndTime(date, block.end_time),
    });
  });

  // 2d. Get external calendar events (Nylas)
  const externalEvents = await getCalendarEvents(user_id, startOfDay, endOfDay);

  externalEvents.forEach((event) => {
    if (event.busy) {
      blockedSlots.push({
        start: event.start,
        end: event.end,
      });
    }
  });

  // 3. Calculate available slots
  const workStart = combineDateAndTime(date, hours.start_time);
  const workEnd = combineDateAndTime(date, hours.end_time);

  return findAvailableSlots(workStart, workEnd, blockedSlots, duration_minutes);
}

/**
 * Check if a specific time slot is available
 */
export async function isTimeSlotAvailable(
  user_id: string,
  start: Date,
  duration_minutes: number
): Promise<boolean> {
  const slots = await getAvailableSlots({
    user_id,
    date: start,
    duration_minutes,
  });

  return slots.some(
    (slot) =>
      slot.start <= start && addMinutes(start, duration_minutes) <= slot.end
  );
}

/**
 * Find the next available time slot after a given date
 */
export async function suggestNextAvailableSlot(
  user_id: string,
  after: Date,
  duration_minutes: number,
  maxDaysToCheck: number = 14
): Promise<TimeSlot | null> {
  let currentDate = new Date(after);

  for (let i = 0; i < maxDaysToCheck; i++) {
    const slots = await getAvailableSlots({
      user_id,
      date: currentDate,
      duration_minutes,
    });

    // Find first slot that's after the requested time
    const validSlot = slots.find((slot) => slot.start >= after);
    if (validSlot) {
      return {
        start: validSlot.start,
        end: addMinutes(validSlot.start, duration_minutes),
      };
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return null;
}

/**
 * Find available slots given working hours and blocked times
 */
function findAvailableSlots(
  workStart: Date,
  workEnd: Date,
  blocked: TimeSlot[],
  durationMinutes: number
): TimeSlot[] {
  // Sort blocked slots by start time
  const sorted = [...blocked].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const available: TimeSlot[] = [];
  let current = workStart;

  for (const block of sorted) {
    // Skip blocks entirely before current time
    if (block.end <= current) continue;

    // If there's a gap before this block
    if (block.start > current) {
      const gapMinutes = (block.start.getTime() - current.getTime()) / 60000;
      if (gapMinutes >= durationMinutes) {
        available.push({
          start: current,
          end: new Date(Math.min(block.start.getTime(), workEnd.getTime())),
        });
      }
    }

    // Move current to end of this block (or stay if we're already past it)
    if (block.end > current) {
      current = block.end;
    }
  }

  // Check for time after all blocks
  if (current < workEnd) {
    const gapMinutes = (workEnd.getTime() - current.getTime()) / 60000;
    if (gapMinutes >= durationMinutes) {
      available.push({
        start: current,
        end: workEnd,
      });
    }
  }

  return available;
}

/**
 * Combine a date and time string into a Date object
 */
function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Add minutes to a date
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export { combineDateAndTime, addMinutes };
