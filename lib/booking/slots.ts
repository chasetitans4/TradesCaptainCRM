// =====================================================
// BOOKING SLOT CALCULATION
// Calculate available appointment slots
// Includes calendar slot holds (v6.4.2)
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getBookingSettings, BookingSettings } from './settings';
import { logger } from '@/lib/logger';
const bookingLogger = logger.child({ context: 'booking.slots' });

// Slot hold duration in minutes
const SLOT_HOLD_DURATION_MINUTES = 5;

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;
  available: boolean;
  reason?: string; // Why unavailable
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  dayName: string;
  slots: TimeSlot[];
  hasAvailability: boolean;
}

export interface AvailabilityResult {
  days: DaySlots[];
  settings: {
    slotDuration: number;
    leadTimeHours: number;
    maxDaysAhead: number;
  };
}

/**
 * Get available booking slots for a date range
 */
export async function getAvailableSlots(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AvailabilityResult> {
  const settings = await getBookingSettings(businessId);

  if (!settings || !settings.isEnabled) {
    return {
      days: [],
      settings: {
        slotDuration: 60,
        leadTimeHours: 24,
        maxDaysAhead: 30,
      },
    };
  }

  const now = new Date();
  const minDate = new Date(now.getTime() + settings.leadTimeHours * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + settings.maxDaysAhead * 24 * 60 * 60 * 1000);

  // Default to next 2 weeks if not specified
  const rangeStart = startDate && startDate > minDate ? startDate : minDate;
  const rangeEnd = endDate && endDate < maxDate ? endDate : new Date(Math.min(
    rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000,
    maxDate.getTime()
  ));

  // Get existing appointments/jobs for the date range
  const existingAppointments = await getExistingAppointments(businessId, rangeStart, rangeEnd);

  const days: DaySlots[] = [];
  const current = new Date(rangeStart);
  current.setHours(0, 0, 0, 0);

  while (current <= rangeEnd) {
    const dayOfWeek = current.getDay(); // 0=Sunday

    // Check if this day is available
    if (settings.availableDays.includes(dayOfWeek)) {
      const daySlots = generateDaySlots(
        current,
        settings,
        existingAppointments,
        now,
        minDate
      );

      days.push({
        date: formatDate(current),
        dayName: getDayName(dayOfWeek),
        slots: daySlots,
        hasAvailability: daySlots.some(s => s.available),
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    days,
    settings: {
      slotDuration: settings.slotDurationMinutes,
      leadTimeHours: settings.leadTimeHours,
      maxDaysAhead: settings.maxDaysAhead,
    },
  };
}

/**
 * Get available slots for a specific date
 */
export async function getSlotsForDate(
  businessId: string,
  date: Date
): Promise<TimeSlot[]> {
  const settings = await getBookingSettings(businessId);

  if (!settings || !settings.isEnabled) {
    return [];
  }

  const now = new Date();
  const minDate = new Date(now.getTime() + settings.leadTimeHours * 60 * 60 * 1000);

  const dayOfWeek = date.getDay();
  if (!settings.availableDays.includes(dayOfWeek)) {
    return [];
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingAppointments = await getExistingAppointments(businessId, dayStart, dayEnd);

  return generateDaySlots(date, settings, existingAppointments, now, minDate);
}

/**
 * Check if a specific time slot is available
 */
export async function isSlotAvailable(
  businessId: string,
  dateTime: Date,
  durationMinutes?: number
): Promise<{ available: boolean; reason?: string }> {
  const settings = await getBookingSettings(businessId);

  if (!settings || !settings.isEnabled) {
    return { available: false, reason: 'Online booking is not enabled' };
  }

  const duration = durationMinutes || settings.slotDurationMinutes;
  const now = new Date();
  const minDate = new Date(now.getTime() + settings.leadTimeHours * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + settings.maxDaysAhead * 24 * 60 * 60 * 1000);

  // Check lead time
  if (dateTime < minDate) {
    return {
      available: false,
      reason: `Appointments must be booked at least ${settings.leadTimeHours} hours in advance`,
    };
  }

  // Check max days ahead
  if (dateTime > maxDate) {
    return {
      available: false,
      reason: `Appointments can only be booked up to ${settings.maxDaysAhead} days in advance`,
    };
  }

  // Check day of week
  const dayOfWeek = dateTime.getDay();
  if (!settings.availableDays.includes(dayOfWeek)) {
    return { available: false, reason: 'This day is not available for booking' };
  }

  // Check time is within business hours
  const timeStr = formatTime(dateTime);
  if (timeStr < settings.dayStartTime || timeStr >= settings.dayEndTime) {
    return { available: false, reason: 'This time is outside business hours' };
  }

  // Check for conflicts with existing appointments
  const slotEnd = new Date(dateTime.getTime() + duration * 60 * 1000);
  const existingAppointments = await getExistingAppointments(
    businessId,
    new Date(dateTime.getTime() - settings.bufferMinutes * 60 * 1000),
    new Date(slotEnd.getTime() + settings.bufferMinutes * 60 * 1000)
  );

  if (existingAppointments.length > 0) {
    return { available: false, reason: 'This time slot is already booked' };
  }

  return { available: true };
}

/**
 * Get existing appointments/jobs that block availability
 */
async function getExistingAppointments(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const supabase = await createClient();

  // Get scheduled jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('scheduled_date, scheduled_time, estimated_duration')
    .eq('business_id', businessId)
    .in('status', ['scheduled', 'in_progress'])
    .gte('scheduled_date', formatDate(startDate))
    .lte('scheduled_date', formatDate(endDate));

  // Get confirmed booking requests (that haven't been converted to jobs yet)
  const { data: bookings } = await supabase
    .from('booking_requests')
    .select('confirmed_date, confirmed_time')
    .eq('business_id', businessId)
    .eq('status', 'confirmed')
    .gte('confirmed_date', formatDate(startDate))
    .lte('confirmed_date', formatDate(endDate));

  const appointments: Array<{ start: Date; end: Date }> = [];

  // Process jobs
  for (const job of jobs || []) {
    if (job.scheduled_date && job.scheduled_time) {
      const start = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const durationMinutes = job.estimated_duration || 60;
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      appointments.push({ start, end });
    }
  }

  // Process confirmed bookings
  for (const booking of bookings || []) {
    if (booking.confirmed_date && booking.confirmed_time) {
      const start = new Date(`${booking.confirmed_date}T${booking.confirmed_time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
      appointments.push({ start, end });
    }
  }

  return appointments;
}

/**
 * Generate time slots for a day
 */
function generateDaySlots(
  date: Date,
  settings: BookingSettings,
  existingAppointments: Array<{ start: Date; end: Date }>,
  now: Date,
  minDate: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const [startHour, startMin] = settings.dayStartTime.split(':').map(Number);
  const [endHour, endMin] = settings.dayEndTime.split(':').map(Number);

  const dayStart = new Date(date);
  dayStart.setHours(startHour, startMin, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMin, 0, 0);

  let current = new Date(dayStart);

  while (current < dayEnd) {
    const slotEnd = new Date(current.getTime() + settings.slotDurationMinutes * 60 * 1000);

    // Don't exceed day end time
    if (slotEnd > dayEnd) break;

    let available = true;
    let reason: string | undefined;

    // Check if slot is in the past or before minimum booking time
    if (current < minDate) {
      available = false;
      reason = current < now ? 'Past time slot' : 'Insufficient lead time';
    }

    // Check for conflicts with existing appointments (including buffer)
    if (available) {
      const bufferedStart = new Date(current.getTime() - settings.bufferMinutes * 60 * 1000);
      const bufferedEnd = new Date(slotEnd.getTime() + settings.bufferMinutes * 60 * 1000);

      for (const appt of existingAppointments) {
        if (bufferedStart < appt.end && bufferedEnd > appt.start) {
          available = false;
          reason = 'Already booked';
          break;
        }
      }
    }

    slots.push({
      start: current.toISOString(),
      end: slotEnd.toISOString(),
      available,
      reason,
    });

    current = new Date(slotEnd);
  }

  return slots;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

/**
 * Get summary of availability for next N days
 */
export async function getAvailabilitySummary(
  businessId: string,
  days: number = 7
): Promise<{
  totalSlots: number;
  availableSlots: number;
  nextAvailable: string | null;
}> {
  const result = await getAvailableSlots(businessId);

  let totalSlots = 0;
  let availableSlots = 0;
  let nextAvailable: string | null = null;

  for (const day of result.days.slice(0, days)) {
    for (const slot of day.slots) {
      totalSlots++;
      if (slot.available) {
        availableSlots++;
        if (!nextAvailable) {
          nextAvailable = slot.start;
        }
      }
    }
  }

  return { totalSlots, availableSlots, nextAvailable };
}

// =====================================================
// CALENDAR SLOT HOLDS (v6.4.2)
// Temporary hold mechanism to prevent double-booking during checkout
// =====================================================

export interface SlotHold {
  id: string;
  businessId: string;
  conversationId?: string;
  slotStart: string;
  slotEnd: string;
  status: 'held' | 'confirmed' | 'expired' | 'released';
  expiresAt: string;
  confirmedAt?: string;
  releasedAt?: string;
  createdAt: string;
}

/**
 * Create a temporary hold on a time slot (v6.4.2)
 * Uses ON CONFLICT DO NOTHING to handle race conditions
 */
export async function createSlotHold(
  businessId: string,
  slotStart: Date,
  slotEnd: Date,
  conversationId?: string
): Promise<{ success: boolean; hold?: SlotHold; reason?: string }> {
  const supabase = createAdminClient();

  // Step 1: Expire any stale holds for this slot
  await supabase
    .from('calendar_slot_holds')
    .update({
      status: 'expired',
      released_at: new Date().toISOString(),
    })
    .eq('business_id', businessId)
    .eq('slot_start', slotStart.toISOString())
    .eq('status', 'held')
    .lt('expires_at', new Date().toISOString());

  // Step 2: Try to insert - gracefully handle race condition
  const expiresAt = new Date(Date.now() + SLOT_HOLD_DURATION_MINUTES * 60 * 1000);

  const { data: hold, error } = await supabase
    .from('calendar_slot_holds')
    .insert({
      business_id: businessId,
      conversation_id: conversationId,
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      status: 'held',
      expires_at: expiresAt.toISOString(),
      held_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Step 3: Check if insert succeeded
  if (error) {
    // Unique constraint violation means slot is already held
    if (error.code === '23505') {
      return { success: false, reason: 'slot_unavailable' };
    }
    bookingLogger.error({
      msg: 'Error creating slot hold',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, reason: error.message };
  }

  return {
    success: true,
    hold: {
      id: hold.id,
      businessId: hold.business_id,
      conversationId: hold.conversation_id,
      slotStart: hold.slot_start,
      slotEnd: hold.slot_end,
      status: hold.status,
      expiresAt: hold.expires_at,
      createdAt: hold.created_at,
    },
  };
}

/**
 * Confirm a slot hold (convert to actual booking)
 */
export async function confirmSlotHold(holdId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('calendar_slot_holds')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', holdId)
    .eq('status', 'held');

  return !error;
}

/**
 * Release a slot hold (cancel)
 */
export async function releaseSlotHold(holdId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('calendar_slot_holds')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', holdId)
    .eq('status', 'held');

  return !error;
}

/**
 * Check if a slot is currently held
 */
export async function isSlotHeld(
  businessId: string,
  slotStart: Date
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('calendar_slot_holds')
    .select('id')
    .eq('business_id', businessId)
    .eq('slot_start', slotStart.toISOString())
    .eq('status', 'held')
    .gt('expires_at', new Date().toISOString())
    .single();

  return !!data;
}

/**
 * Expire all stale holds (call periodically via cron)
 */
export async function expireStaleHolds(): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('calendar_slot_holds')
    .update({
      status: 'expired',
      released_at: new Date().toISOString(),
    })
    .eq('status', 'held')
    .lt('expires_at', new Date().toISOString())
    .select('id');

  return data?.length || 0;
}
