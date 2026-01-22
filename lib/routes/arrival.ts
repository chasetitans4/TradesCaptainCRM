// =====================================================
// ARRIVAL PING LIBRARY
// "I'm Here" feature for technicians
// Tracks arrival at job sites + optional SMS to customer
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { reverseGeocode, getDirections } from './geocoding';
import { sendSMS } from '@/lib/notifications/sms';

const arrivalLogger = logger.child({ context: 'arrival' });

export interface ArrivalPingInput {
  jobId: string;
  latitude: number;
  longitude: number;
}

export interface ArrivalPingResult {
  id: string;
  address: string | null;
  smsSent: boolean;
  smsError?: string;
}

export interface MileageLogInput {
  fromJobId?: string;
  toJobId?: string;
  fromLatitude: number;
  fromLongitude: number;
  fromAddress?: string;
  toLatitude: number;
  toLongitude: number;
  toAddress?: string;
  purpose?: 'job_travel' | 'start_of_day' | 'end_of_day' | 'between_jobs';
}

/**
 * Record an arrival ping when technician presses "I'm Here"
 * Optionally sends SMS to customer if enabled in settings
 */
export async function recordArrivalPing(
  userId: string,
  businessId: string,
  input: ArrivalPingInput
): Promise<ArrivalPingResult> {
  const supabase = await createClient();

  // Get job details for customer info
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      address,
      city,
      state,
      customer_id,
      customers(name, phone)
    `)
    .eq('id', input.jobId)
    .single();

  if (jobError || !job) {
    arrivalLogger.error({
      msg: 'Job not found for arrival ping',
      jobId: input.jobId,
      error: jobError?.message,
    });
    throw new Error('Job not found');
  }

  // Reverse geocode for address (or use job address as fallback)
  let arrivalAddress = await reverseGeocode(input.latitude, input.longitude);
  if (!arrivalAddress) {
    arrivalAddress = [job.address, job.city, job.state].filter(Boolean).join(', ');
  }

  // Create arrival ping record
  const { data: ping, error: pingError } = await supabase
    .from('arrival_pings')
    .insert({
      business_id: businessId,
      user_id: userId,
      job_id: input.jobId,
      latitude: input.latitude,
      longitude: input.longitude,
      address: arrivalAddress,
    })
    .select('id')
    .single();

  if (pingError || !ping) {
    arrivalLogger.error({
      msg: 'Failed to record arrival ping',
      error: pingError?.message,
    });
    throw new Error('Failed to record arrival');
  }

  // Check if arrival SMS is enabled
  const { data: settings } = await supabase
    .from('feature_settings')
    .select('send_arrival_sms')
    .eq('business_id', businessId)
    .single();

  let smsSent = false;
  let smsError: string | undefined;

  // Handle both object and array formats for customers relation
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;

  if (settings?.send_arrival_sms && customer?.phone) {
    // Get technician name
    const { data: technician } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    const technicianName = technician?.name || 'Your technician';
    const customerName = customer.name || 'there';

    const message = `Hi ${customerName}! ${technicianName} has arrived for your ${job.title} appointment. They're ready to help you!`;

    try {
      const smsResult = await sendSMS(customer.phone, message, businessId);

      if (smsResult.success) {
        smsSent = true;

        // Update ping with SMS info
        await supabase
          .from('arrival_pings')
          .update({
            sms_sent: true,
            sms_sent_at: new Date().toISOString(),
            sms_message_id: smsResult.messageId,
          })
          .eq('id', ping.id);

        arrivalLogger.info({
          msg: 'Arrival SMS sent to customer',
          jobId: input.jobId,
          customerId: job.customer_id,
        });
      } else {
        smsError = smsResult.error;
      }
    } catch (error) {
      smsError = error instanceof Error ? error.message : 'Failed to send SMS';
      arrivalLogger.warn({
        msg: 'Failed to send arrival SMS',
        error: smsError,
        jobId: input.jobId,
      });
    }
  }

  arrivalLogger.info({
    msg: 'Arrival ping recorded',
    pingId: ping.id,
    userId,
    jobId: input.jobId,
    smsSent,
  });

  return {
    id: ping.id,
    address: arrivalAddress,
    smsSent,
    smsError,
  };
}

/**
 * Log mileage between two points
 */
export async function logMileage(
  userId: string,
  businessId: string,
  input: MileageLogInput
): Promise<{ id: string; distanceMiles: number; durationMinutes: number }> {
  const supabase = await createClient();

  // Get directions/distance from Mapbox (or Haversine fallback)
  const directions = await getDirections(
    input.fromLatitude,
    input.fromLongitude,
    input.toLatitude,
    input.toLongitude
  );

  if (!directions) {
    throw new Error('Unable to calculate distance');
  }

  // Get addresses if not provided
  let fromAddress = input.fromAddress;
  let toAddress = input.toAddress;

  if (!fromAddress) {
    fromAddress = await reverseGeocode(input.fromLatitude, input.fromLongitude) || undefined;
  }
  if (!toAddress) {
    toAddress = await reverseGeocode(input.toLatitude, input.toLongitude) || undefined;
  }

  const { data: mileageLog, error } = await supabase
    .from('mileage_logs')
    .insert({
      business_id: businessId,
      user_id: userId,
      log_date: new Date().toISOString().split('T')[0],
      from_job_id: input.fromJobId,
      to_job_id: input.toJobId,
      from_latitude: input.fromLatitude,
      from_longitude: input.fromLongitude,
      from_address: fromAddress,
      to_latitude: input.toLatitude,
      to_longitude: input.toLongitude,
      to_address: toAddress,
      distance_miles: Math.round(directions.distanceMiles * 100) / 100,
      duration_minutes: directions.durationMinutes,
      calculation_source: process.env.MAPBOX_ACCESS_TOKEN ? 'mapbox' : 'haversine',
      purpose: input.purpose || 'job_travel',
    })
    .select('id')
    .single();

  if (error || !mileageLog) {
    arrivalLogger.error({
      msg: 'Failed to log mileage',
      error: error?.message,
    });
    throw new Error('Failed to log mileage');
  }

  arrivalLogger.info({
    msg: 'Mileage logged',
    mileageId: mileageLog.id,
    userId,
    distanceMiles: directions.distanceMiles,
    durationMinutes: directions.durationMinutes,
  });

  return {
    id: mileageLog.id,
    distanceMiles: Math.round(directions.distanceMiles * 100) / 100,
    durationMinutes: directions.durationMinutes,
  };
}

/**
 * Get daily route summary for a technician
 */
export async function getDailyRouteSummary(
  userId: string,
  date: Date
): Promise<{
  totalMiles: number;
  totalDriveMinutes: number;
  jobsCompleted: number;
  arrivalPingsCount: number;
  stopsVisited: Array<{ address: string; jobId: string; arrivedAt: string }>;
  firstStopTime: string | null;
  lastStopTime: string | null;
} | null> {
  const supabase = await createClient();
  const dateStr = date.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_route_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('summary_date', dateStr)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    totalMiles: parseFloat(data.total_miles) || 0,
    totalDriveMinutes: data.total_drive_minutes || 0,
    jobsCompleted: data.jobs_completed || 0,
    arrivalPingsCount: data.arrival_pings_count || 0,
    stopsVisited: (data.stops_visited as Array<{ address: string; job_id: string; arrived_at: string }> || []).map(s => ({
      address: s.address,
      jobId: s.job_id,
      arrivedAt: s.arrived_at,
    })),
    firstStopTime: data.first_stop_time,
    lastStopTime: data.last_stop_time,
  };
}

/**
 * Get daily route summaries for all technicians in a business
 * Used for the daily route summary admin page
 */
export async function getBusinessDailyRouteSummaries(
  businessId: string,
  date: Date
): Promise<Array<{
  userId: string;
  userName: string;
  totalMiles: number;
  totalDriveMinutes: number;
  arrivalPingsCount: number;
  stopsVisited: Array<{ address: string; jobId: string; arrivedAt: string }>;
  firstStopTime: string | null;
  lastStopTime: string | null;
}>> {
  const supabase = createAdminClient();
  const dateStr = date.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_route_summaries')
    .select(`
      user_id,
      total_miles,
      total_drive_minutes,
      arrival_pings_count,
      stops_visited,
      first_stop_time,
      last_stop_time,
      users!inner(name)
    `)
    .eq('business_id', businessId)
    .eq('summary_date', dateStr);

  if (error || !data) {
    arrivalLogger.error({
      msg: 'Failed to fetch business daily route summaries',
      error: error?.message,
      businessId,
      date: dateStr,
    });
    return [];
  }

  return data.map((d: any) => ({
    userId: d.user_id,
    userName: d.users?.name || 'Unknown',
    totalMiles: parseFloat(d.total_miles) || 0,
    totalDriveMinutes: d.total_drive_minutes || 0,
    arrivalPingsCount: d.arrival_pings_count || 0,
    stopsVisited: (d.stops_visited as Array<{ address: string; job_id: string; arrived_at: string }> || []).map(s => ({
      address: s.address,
      jobId: s.job_id,
      arrivedAt: s.arrived_at,
    })),
    firstStopTime: d.first_stop_time,
    lastStopTime: d.last_stop_time,
  }));
}

/**
 * Get mileage report for date range (for tax/audit purposes)
 */
export async function getMileageReport(
  businessId: string,
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<{
  totalMiles: number;
  trips: Array<{
    date: string;
    userId: string;
    userName: string;
    fromAddress: string | null;
    toAddress: string | null;
    distanceMiles: number;
    purpose: string;
  }>;
}> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mileage_logs')
    .select(`
      log_date,
      user_id,
      from_address,
      to_address,
      distance_miles,
      purpose,
      users!inner(name)
    `)
    .eq('business_id', businessId)
    .gte('log_date', startDate.toISOString().split('T')[0])
    .lte('log_date', endDate.toISOString().split('T')[0])
    .order('log_date', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    arrivalLogger.error({
      msg: 'Failed to fetch mileage report',
      error: error.message,
    });
    return { totalMiles: 0, trips: [] };
  }

  const trips = (data || []).map((d: any) => ({
    date: d.log_date,
    userId: d.user_id,
    userName: d.users?.name || 'Unknown',
    fromAddress: d.from_address,
    toAddress: d.to_address,
    distanceMiles: parseFloat(d.distance_miles) || 0,
    purpose: d.purpose,
  }));

  const totalMiles = trips.reduce((sum, t) => sum + t.distanceMiles, 0);

  return {
    totalMiles: Math.round(totalMiles * 100) / 100,
    trips,
  };
}
