// =====================================================
// NYLAS CALENDAR OPERATIONS
// =====================================================

import { nylas } from './client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import type { CalendarEvent } from '@/types';
import { syncLogger } from '@/lib/logger';

/**
 * Get user's Nylas grant ID from the database (decrypted)
 */
async function getGrantId(userId: string): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('calendar_connections')
      .select('nylas_grant_id')
      .eq('user_id', userId)
      .single();

    if (!data?.nylas_grant_id) return null;

    // Decrypt the grant ID (may fail if ENCRYPTION_KEY not set)
    try {
      return decrypt(data.nylas_grant_id);
    } catch (decryptError) {
      syncLogger.warn({ msg: 'Failed to decrypt grant ID - encryption may not be configured', userId });
      return null;
    }
  } catch (error) {
    syncLogger.error({ msg: 'Error getting grant ID', error, userId });
    return null;
  }
}

/**
 * Get user's calendar connection details
 */
export async function getCalendarConnection(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    syncLogger.error({ msg: 'Error fetching calendar connection', error });
  }

  return data;
}

/**
 * List user's calendars from their connected account
 */
export async function listCalendars(grantId: string) {
  try {
    const calendars = await nylas.calendars.list({ identifier: grantId });
    return calendars.data;
  } catch (error) {
    syncLogger.error({ msg: 'Error listing calendars', error });
    return [];
  }
}

/**
 * Get events from external calendar for a date range
 */
export async function getCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const grantId = await getGrantId(userId);
  if (!grantId) return [];
  const connection = await getCalendarConnection(userId);
  if (!connection?.calendar_id) return [];

  try {
    const events = await nylas.events.list({
      identifier: grantId,
      queryParams: {
        calendarId: connection.calendar_id,
        start: Math.floor(startDate.getTime() / 1000).toString(),
        end: Math.floor(endDate.getTime() / 1000).toString(),
        expandRecurring: true,
      },
    });

    return events.data.map((event) => ({
      id: event.id,
      title: event.title || 'Busy',
      description: event.description || undefined,
      location: event.location || undefined,
      start: new Date((event.when as any).startTime * 1000),
      end: new Date((event.when as any).endTime * 1000),
      busy: event.busy !== false,
      source: 'personal' as const,
    }));
  } catch (error) {
    syncLogger.error({ msg: 'Error fetching calendar events', error });
    return [];
  }
}

interface JobForCalendar {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time_start?: string;
  estimated_duration?: number;
  customer: {
    name: string;
    phone?: string;
    address?: string;
  };
}

/**
 * Create calendar event for a job
 */
export async function createCalendarEvent(
  userId: string,
  job: JobForCalendar
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  // Get connection with calendar ID
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('nylas_grant_id, calendar_id')
    .eq('user_id', userId)
    .single();

  if (!connection?.nylas_grant_id || !connection?.calendar_id) {
    return null;
  }

  // Decrypt grant ID for API call
  const decryptedGrantId = decrypt(connection.nylas_grant_id);

  const startTime = combineDateAndTime(
    job.scheduled_date,
    job.scheduled_time_start || '09:00'
  );
  const endTime = addHours(startTime, job.estimated_duration || 1);

  try {
    const event = await nylas.events.create({
      identifier: decryptedGrantId,
      queryParams: {
        calendarId: connection.calendar_id,
      },
      requestBody: {
        title: `${job.title} - ${job.customer.name}`,
        description: [
          job.description,
          '',
          `Customer: ${job.customer.name}`,
          job.customer.phone ? `Phone: ${job.customer.phone}` : '',
          '',
          `View in Trades Captain: ${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
        location: job.customer.address,
        when: {
          startTime: Math.floor(startTime.getTime() / 1000),
          endTime: Math.floor(endTime.getTime() / 1000),
        },
        busy: true,
      },
    });

    return event.data.id;
  } catch (error) {
    syncLogger.error({ msg: 'Error creating calendar event', error });
    return null;
  }
}

/**
 * Update calendar event for a job
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  job: JobForCalendar
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('nylas_grant_id, calendar_id')
    .eq('user_id', userId)
    .single();

  if (!connection?.nylas_grant_id || !connection?.calendar_id) {
    return;
  }

  // Decrypt grant ID for API call
  const decryptedGrantId = decrypt(connection.nylas_grant_id);

  const startTime = combineDateAndTime(
    job.scheduled_date,
    job.scheduled_time_start || '09:00'
  );
  const endTime = addHours(startTime, job.estimated_duration || 1);

  try {
    await nylas.events.update({
      identifier: decryptedGrantId,
      eventId,
      queryParams: {
        calendarId: connection.calendar_id,
      },
      requestBody: {
        title: `${job.title} - ${job.customer.name}`,
        description: [
          job.description,
          '',
          `Customer: ${job.customer.name}`,
          job.customer.phone ? `Phone: ${job.customer.phone}` : '',
          '',
          `View in Trades Captain: ${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
        location: job.customer.address,
        when: {
          startTime: Math.floor(startTime.getTime() / 1000),
          endTime: Math.floor(endTime.getTime() / 1000),
        },
      },
    });
  } catch (error) {
    syncLogger.error({ msg: 'Error updating calendar event', error });
  }
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('nylas_grant_id, calendar_id')
    .eq('user_id', userId)
    .single();

  if (!connection?.nylas_grant_id || !connection?.calendar_id) {
    return;
  }

  // Decrypt grant ID for API call
  const decryptedGrantId = decrypt(connection.nylas_grant_id);

  try {
    await nylas.events.destroy({
      identifier: decryptedGrantId,
      eventId,
      queryParams: {
        calendarId: connection.calendar_id,
      },
    });
  } catch (error) {
    syncLogger.error({ msg: 'Error deleting calendar event', error });
  }
}

// Helper functions
function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
