// =====================================================
// TIMELINE BUILDER SERVICE
//
// Builds system-generated timeline events for Proof of Work
// All events are immutable and system-generated (not user-editable)
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type {
  ProofOfWork,
  ProofOfWorkTimelineEvent,
  CreateTimelineEventInput,
  TimelineEventType,
} from '@/types/proof-of-work';
import { TIMELINE_EVENT_ICONS, TIMELINE_EVENT_LABELS } from '@/types/proof-of-work';

interface Job {
  id: string;
  scheduled_date: string;
  scheduled_time_start?: string;
  arrived_at?: string;
  departed_at?: string;
  completed_at?: string;
  assigned_to?: string;
  tech_notes?: string;
}

interface TimelineEventBuilder {
  event_type: TimelineEventType;
  event_time: string;
  event_icon: string;
  event_label: string;
  verification_badge?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display (e.g., "January 15, 2025")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Build timeline events from job data
 */
function buildTimelineEvents(
  job: Job,
  pow: ProofOfWork,
  photoCount: number
): TimelineEventBuilder[] {
  const events: TimelineEventBuilder[] = [];

  // 1. SCHEDULED event
  const scheduledTime = job.scheduled_time_start
    ? `${job.scheduled_date}T${job.scheduled_time_start}`
    : job.scheduled_date;

  events.push({
    event_type: 'SCHEDULED',
    event_time: scheduledTime,
    event_icon: TIMELINE_EVENT_ICONS.SCHEDULED,
    event_label: `Job scheduled for ${formatDate(job.scheduled_date)}`,
  });

  // 2. ASSIGNED event (if tech is assigned)
  if (job.assigned_to) {
    events.push({
      event_type: 'ASSIGNED',
      event_time: scheduledTime, // Same as scheduled for simplicity
      event_icon: TIMELINE_EVENT_ICONS.ASSIGNED,
      event_label: 'Technician assigned',
      metadata: { technician_id: job.assigned_to },
    });
  }

  // 3. ARRIVED event (if we have arrival time)
  if (job.arrived_at) {
    const verificationBadge = pow.location_verified ? 'GPS Verified' : undefined;

    events.push({
      event_type: 'ARRIVED',
      event_time: job.arrived_at,
      event_icon: TIMELINE_EVENT_ICONS.ARRIVED,
      event_label: `Arrived at ${formatTime(job.arrived_at)}`,
      verification_badge: verificationBadge,
      metadata: {
        location_verified: pow.location_verified,
        distance_meters: pow.arrival_distance_meters,
      },
    });
  }

  // 4. WORK_STARTED event (same as arrival or shortly after)
  if (job.arrived_at) {
    events.push({
      event_type: 'WORK_STARTED',
      event_time: job.arrived_at,
      event_icon: TIMELINE_EVENT_ICONS.WORK_STARTED,
      event_label: 'Work started',
    });
  }

  // 5. PHOTOS_ADDED event (if photos exist)
  if (photoCount > 0) {
    // Use a time slightly after arrival for photos
    const photoTime = job.arrived_at
      ? new Date(new Date(job.arrived_at).getTime() + 10 * 60 * 1000).toISOString()
      : job.completed_at || new Date().toISOString();

    events.push({
      event_type: 'PHOTOS_ADDED',
      event_time: photoTime,
      event_icon: TIMELINE_EVENT_ICONS.PHOTOS_ADDED,
      event_label: `${photoCount} photo${photoCount > 1 ? 's' : ''} documented`,
      metadata: { photo_count: photoCount },
    });
  }

  // 6. COMPLETED event
  if (job.completed_at || job.departed_at) {
    const completedTime = job.completed_at || job.departed_at!;
    const verificationBadge = pow.badge_timestamped ? 'Time Verified' : undefined;

    events.push({
      event_type: 'COMPLETED',
      event_time: completedTime,
      event_icon: TIMELINE_EVENT_ICONS.COMPLETED,
      event_label: `Work completed at ${formatTime(completedTime)}`,
      verification_badge: verificationBadge,
      metadata: {
        duration_minutes: pow.duration_minutes,
      },
    });
  }

  // Sort events by time
  events.sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());

  return events;
}

/**
 * Build and save timeline events for a Proof of Work
 */
export async function buildTimeline(
  pow: ProofOfWork & { job?: Job }
): Promise<ProofOfWorkTimelineEvent[]> {
  const supabase = createAdminClient();

  // Get job data if not included
  let job = pow.job;
  if (!job) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', pow.job_id)
      .single();

    if (error || !data) {
      logger.error({
        msg: 'Failed to get job for timeline',
        jobId: pow.job_id,
        error,
      });
      return [];
    }
    job = data as Job;
  }

  // Get photo count for this job
  const { count: photoCount } = await supabase
    .from('job_photos')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', pow.job_id)
    .gte('verification_level', 1);

  // Build timeline events
  const events = buildTimelineEvents(job, pow, photoCount || 0);

  // Delete existing timeline events (in case of rebuild)
  await supabase
    .from('proof_of_work_timeline')
    .delete()
    .eq('proof_of_work_id', pow.id);

  // Insert new timeline events
  const timelineInputs: CreateTimelineEventInput[] = events.map((event) => ({
    proof_of_work_id: pow.id,
    event_type: event.event_type,
    event_time: event.event_time,
    event_icon: event.event_icon,
    event_label: event.event_label,
    verification_badge: event.verification_badge,
    metadata: event.metadata,
  }));

  const { data: savedEvents, error } = await supabase
    .from('proof_of_work_timeline')
    .insert(timelineInputs)
    .select();

  if (error) {
    logger.error({
      msg: 'Failed to save timeline events',
      powId: pow.id,
      error,
    });
    return [];
  }

  logger.info({
    msg: 'Timeline built',
    powId: pow.id,
    eventCount: savedEvents?.length || 0,
  });

  return savedEvents as ProofOfWorkTimelineEvent[];
}

/**
 * Get timeline events for a Proof of Work
 */
export async function getTimeline(powId: string): Promise<ProofOfWorkTimelineEvent[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('proof_of_work_timeline')
    .select('*')
    .eq('proof_of_work_id', powId)
    .order('event_time', { ascending: true });

  if (error) {
    logger.error({
      msg: 'Failed to get timeline',
      powId,
      error,
    });
    return [];
  }

  return data as ProofOfWorkTimelineEvent[];
}

/**
 * Add a SENT event to timeline (when PoW is delivered)
 */
export async function addSentEvent(
  powId: string,
  deliveryChannel: 'SMS' | 'EMAIL' | 'BOTH'
): Promise<ProofOfWorkTimelineEvent | null> {
  const supabase = createAdminClient();

  const channelLabel =
    deliveryChannel === 'BOTH'
      ? 'SMS and email'
      : deliveryChannel.toLowerCase();

  const input: CreateTimelineEventInput = {
    proof_of_work_id: powId,
    event_type: 'SENT',
    event_time: new Date().toISOString(),
    event_icon: TIMELINE_EVENT_ICONS.SENT,
    event_label: `Proof of Work sent via ${channelLabel}`,
    metadata: { delivery_channel: deliveryChannel },
  };

  const { data, error } = await supabase
    .from('proof_of_work_timeline')
    .insert(input)
    .select()
    .single();

  if (error) {
    logger.error({
      msg: 'Failed to add SENT event to timeline',
      powId,
      error,
    });
    return null;
  }

  return data as ProofOfWorkTimelineEvent;
}

/**
 * Format timeline for public display
 * Returns a simplified format suitable for the public page
 */
export function formatTimelineForDisplay(
  events: ProofOfWorkTimelineEvent[]
): Array<{
  icon: string;
  label: string;
  time: string;
  badge?: string;
}> {
  return events.map((event) => ({
    icon: event.event_icon,
    label: event.event_label,
    time: formatTime(event.event_time),
    badge: event.verification_badge,
  }));
}
