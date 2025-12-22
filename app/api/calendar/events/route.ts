// =====================================================
// CALENDAR EVENTS
// GET /api/calendar/events?start=2024-01-01&end=2024-01-31
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents } from '@/lib/nylas';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import type { CalendarDisplayEvent, ScheduleBlock } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const start = request.nextUrl.searchParams.get('start');
    const end = request.nextUrl.searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing start/end params' },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const supabase = await createServerSupabaseClient();

    // Get jobs from database
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*, customer:customers(name, phone)')
      .eq('assigned_to', profile.id)
      .gte('scheduled_date', start.split('T')[0])
      .lte('scheduled_date', end.split('T')[0])
      .in('status', ['scheduled', 'in_progress']);

    // Get schedule blocks
    const { data: blocks } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('business_id', profile.business_id)
      .or(`user_id.eq.${profile.id},user_id.is.null`);

    // Get external calendar events
    const externalEvents = await getCalendarEvents(profile.id, startDate, endDate);

    // Format all events uniformly
    const events: CalendarDisplayEvent[] = [];

    // Jobs
    if (jobs) {
      jobs.forEach((job) => {
        const startTime = combineDateAndTime(
          job.scheduled_date,
          job.scheduled_time_start || '09:00'
        );
        const endTime = job.scheduled_time_end
          ? combineDateAndTime(job.scheduled_date, job.scheduled_time_end)
          : addHours(startTime, 1);

        events.push({
          id: job.id,
          type: 'job',
          title: `${job.service_type} - ${job.customer?.name || 'Customer'}`,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          color: '#3b82f6', // Blue
          editable: true,
          job_id: job.id,
          customer: job.customer
            ? {
                name: job.customer.name,
                phone: job.customer.phone || undefined,
              }
            : undefined,
        });
      });
    }

    // Schedule blocks (generate recurring instances)
    if (blocks) {
      blocks.forEach((block: ScheduleBlock) => {
        if (block.is_recurring && block.day_of_week !== null) {
          // Generate instances for each matching day in the range
          const instances = generateRecurringInstances(
            block,
            startDate,
            endDate
          );
          events.push(...instances);
        } else if (block.specific_date) {
          // One-time block
          const blockDate = new Date(block.specific_date);
          if (blockDate >= startDate && blockDate <= endDate) {
            events.push({
              id: block.id,
              type: 'break',
              title: block.label,
              start: combineDateAndTime(
                block.specific_date,
                block.start_time
              ).toISOString(),
              end: combineDateAndTime(
                block.specific_date,
                block.end_time
              ).toISOString(),
              color: '#f97316', // Orange
              editable: false,
            });
          }
        }
      });
    }

    // External calendar events
    externalEvents.forEach((event) => {
      events.push({
        id: event.id,
        type: 'personal',
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        color: '#6b7280', // Gray
        editable: false,
        source: 'external',
      });
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// Helper functions
function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function generateRecurringInstances(
  block: ScheduleBlock,
  startDate: Date,
  endDate: Date
): CalendarDisplayEvent[] {
  const instances: CalendarDisplayEvent[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    if (current.getDay() === block.day_of_week) {
      const dateStr = current.toISOString().split('T')[0];
      instances.push({
        id: `${block.id}-${dateStr}`,
        type: 'break',
        title: block.label,
        start: combineDateAndTime(dateStr, block.start_time).toISOString(),
        end: combineDateAndTime(dateStr, block.end_time).toISOString(),
        color: '#f97316', // Orange
        editable: false,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return instances;
}
