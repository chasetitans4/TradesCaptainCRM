// =====================================================
// MILEAGE TRACKING LIBRARY
// Track miles per technician with "Arrive" confirmation
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getTimestamp } from '@/lib/utils/clock';
import { calculateDistance } from '@/lib/routes/geocoding';

export interface MileageEntry {
  id: string;
  business_id: string;
  user_id: string;
  job_id?: string;
  trip_date: string;
  start_address?: string;
  start_latitude?: number;
  start_longitude?: number;
  end_address?: string;
  end_latitude?: number;
  end_longitude?: number;
  estimated_miles?: number;
  confirmed_miles?: number;
  status: 'estimated' | 'confirmed' | 'manual';
  departed_at?: string;
  arrived_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MileageStats {
  totalMiles: number;
  totalTrips: number;
  avgMilesPerDay: number;
  reimbursementAmount: number;
}

export interface ArriveAtJobParams {
  jobId: string;
  userId: string;
  currentLatitude: number;
  currentLongitude: number;
}

// Default IRS mileage rate for 2024
const DEFAULT_MILEAGE_RATE = 0.67;

/**
 * Record technician departure for a job
 */
export async function departForJob(jobId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('jobs')
    .update({ departed_at: getTimestamp() })
    .eq('id', jobId);
}

/**
 * Record technician arrival at a job and calculate mileage
 */
export async function arriveAtJob(params: ArriveAtJobParams): Promise<{
  confirmedMiles: number;
  mileageEntryId: string;
}> {
  const { jobId, userId, currentLatitude, currentLongitude } = params;
  const supabase = await createClient();

  // Get job and customer location
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      business_id,
      departed_at,
      address,
      city,
      state,
      zip,
      latitude,
      longitude,
      customer:customers(
        address, city, state, zip,
        latitude, longitude
      )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error('Job not found');
  }

  // Get the previous location (last job or home base)
  const today = new Date().toISOString().split('T')[0];
  const { data: lastMileage } = await supabase
    .from('mileage_entries')
    .select('end_latitude, end_longitude, end_address')
    .eq('user_id', userId)
    .eq('trip_date', today)
    .order('arrived_at', { ascending: false })
    .limit(1)
    .single();

  let startLat: number;
  let startLng: number;
  let startAddress: string;

  if (lastMileage?.end_latitude && lastMileage?.end_longitude) {
    // Start from last job location
    startLat = lastMileage.end_latitude;
    startLng = lastMileage.end_longitude;
    startAddress = lastMileage.end_address || 'Previous location';
  } else {
    // Start from technician's home/base
    const { data: user } = await supabase
      .from('users')
      .select('home_latitude, home_longitude, home_address')
      .eq('id', userId)
      .single();

    startLat = user?.home_latitude || currentLatitude;
    startLng = user?.home_longitude || currentLongitude;
    startAddress = user?.home_address || 'Starting location';
  }

  // Get destination coordinates (prefer job address, then customer address)
  const customer = job.customer as any;
  const endLat = job.latitude || customer?.latitude || currentLatitude;
  const endLng = job.longitude || customer?.longitude || currentLongitude;

  // Build end address
  const endAddress = [
    job.address || customer?.address,
    job.city || customer?.city,
    job.state || customer?.state,
    job.zip || customer?.zip,
  ]
    .filter(Boolean)
    .join(', ');

  // Calculate driving distance
  const confirmedMiles = await getDrivingDistance(startLat, startLng, endLat, endLng);

  // Create mileage entry
  const { data: mileageEntry, error: mileageError } = await supabase
    .from('mileage_entries')
    .insert({
      business_id: job.business_id,
      user_id: userId,
      job_id: jobId,
      trip_date: today,
      start_address: startAddress,
      start_latitude: startLat,
      start_longitude: startLng,
      end_address: endAddress,
      end_latitude: endLat,
      end_longitude: endLng,
      estimated_miles: confirmedMiles,
      confirmed_miles: confirmedMiles,
      status: 'confirmed',
      departed_at: job.departed_at || getTimestamp(),
      arrived_at: getTimestamp(),
    })
    .select()
    .single();

  if (mileageError) {
    console.error('Error creating mileage entry:', mileageError);
    throw new Error('Failed to record mileage');
  }

  // Update job with arrival
  await supabase
    .from('jobs')
    .update({
      arrived_at: getTimestamp(),
      confirmed_miles: confirmedMiles,
      status: 'in_progress',
    })
    .eq('id', jobId);

  // Update daily summary
  await updateDailySummary(userId, job.business_id, today);

  return {
    confirmedMiles: Math.round(confirmedMiles * 10) / 10,
    mileageEntryId: mileageEntry.id,
  };
}

/**
 * Get driving distance using Google Distance Matrix API or fallback to haversine
 */
async function getDrivingDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?` +
          `origins=${startLat},${startLng}&` +
          `destinations=${endLat},${endLng}&` +
          `mode=driving&` +
          `key=${apiKey}`
      );

      const data = await response.json();

      if (data.rows?.[0]?.elements?.[0]?.distance?.value) {
        // Convert meters to miles
        return data.rows[0].elements[0].distance.value / 1609.34;
      }
    } catch (error) {
      console.error('Google Distance Matrix error:', error);
    }
  }

  // Fallback to haversine (straight line) * 1.3 for road factor
  return calculateDistance(startLat, startLng, endLat, endLng) * 1.3;
}

/**
 * Update daily mileage summary for a user
 */
async function updateDailySummary(
  userId: string,
  businessId: string,
  date: string
): Promise<void> {
  const supabase = await createClient();

  // Calculate totals for today
  const { data: entries } = await supabase
    .from('mileage_entries')
    .select('estimated_miles, confirmed_miles')
    .eq('user_id', userId)
    .eq('trip_date', date);

  const totals = (entries || []).reduce(
    (acc, entry) => ({
      estimated: acc.estimated + (entry.estimated_miles || 0),
      confirmed: acc.confirmed + (entry.confirmed_miles || 0),
      trips: acc.trips + 1,
    }),
    { estimated: 0, confirmed: 0, trips: 0 }
  );

  await supabase.from('mileage_daily_summaries').upsert(
    {
      business_id: businessId,
      user_id: userId,
      summary_date: date,
      total_estimated_miles: totals.estimated,
      total_confirmed_miles: totals.confirmed,
      total_trips: totals.trips,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,summary_date' }
  );
}

/**
 * Get mileage statistics for a technician
 */
export async function getTechnicianMileageStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MileageStats> {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('mileage_entries')
    .select('confirmed_miles, trip_date')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .gte('trip_date', startDate.toISOString().split('T')[0])
    .lte('trip_date', endDate.toISOString().split('T')[0]);

  const totalMiles = (entries || []).reduce((sum, e) => sum + (e.confirmed_miles || 0), 0);
  const totalTrips = entries?.length || 0;

  // Get unique days
  const uniqueDays = new Set(entries?.map((e) => e.trip_date)).size || 1;
  const avgMilesPerDay = totalMiles / uniqueDays;

  // Get business mileage rate
  const { data: user } = await supabase
    .from('users')
    .select('business:businesses(mileage_rate_per_mile)')
    .eq('id', userId)
    .single();

  const rate = (user?.business as any)?.mileage_rate_per_mile || DEFAULT_MILEAGE_RATE;
  const reimbursementAmount = totalMiles * rate;

  return {
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalTrips,
    avgMilesPerDay: Math.round(avgMilesPerDay * 10) / 10,
    reimbursementAmount: Math.round(reimbursementAmount * 100) / 100,
  };
}

/**
 * Get business-wide mileage statistics
 */
export async function getBusinessMileageStats(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalMiles: number;
  totalTrips: number;
  byTechnician: Array<{
    userId: string;
    userName: string;
    miles: number;
    trips: number;
  }>;
  totalReimbursement: number;
}> {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('mileage_entries')
    .select(`
      confirmed_miles,
      user_id,
      user:users(name)
    `)
    .eq('business_id', businessId)
    .eq('status', 'confirmed')
    .gte('trip_date', startDate.toISOString().split('T')[0])
    .lte('trip_date', endDate.toISOString().split('T')[0]);

  // Group by technician
  const byTech = new Map<string, { name: string; miles: number; trips: number }>();

  (entries || []).forEach((entry: any) => {
    const existing = byTech.get(entry.user_id) || {
      name: entry.user?.name || 'Unknown',
      miles: 0,
      trips: 0,
    };
    existing.miles += entry.confirmed_miles || 0;
    existing.trips += 1;
    byTech.set(entry.user_id, existing);
  });

  const totalMiles = (entries || []).reduce((sum, e: any) => sum + (e.confirmed_miles || 0), 0);

  // Get rate
  const { data: business } = await supabase
    .from('businesses')
    .select('mileage_rate_per_mile')
    .eq('id', businessId)
    .single();

  const rate = business?.mileage_rate_per_mile || DEFAULT_MILEAGE_RATE;

  return {
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalTrips: entries?.length || 0,
    byTechnician: Array.from(byTech.entries()).map(([userId, data]) => ({
      userId,
      userName: data.name,
      miles: Math.round(data.miles * 10) / 10,
      trips: data.trips,
    })),
    totalReimbursement: Math.round(totalMiles * rate * 100) / 100,
  };
}

/**
 * Add a manual mileage entry
 */
export async function addManualMileageEntry(
  userId: string,
  businessId: string,
  data: {
    tripDate: Date;
    startAddress?: string;
    endAddress?: string;
    miles: number;
    jobId?: string;
    notes?: string;
  }
): Promise<MileageEntry> {
  const supabase = await createClient();

  const { data: entry, error } = await supabase
    .from('mileage_entries')
    .insert({
      business_id: businessId,
      user_id: userId,
      job_id: data.jobId || null,
      trip_date: data.tripDate.toISOString().split('T')[0],
      start_address: data.startAddress || null,
      end_address: data.endAddress || null,
      confirmed_miles: data.miles,
      status: 'manual',
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding manual mileage entry:', error);
    throw new Error('Failed to add mileage entry');
  }

  // Update daily summary
  await updateDailySummary(userId, businessId, data.tripDate.toISOString().split('T')[0]);

  return entry;
}

/**
 * Get mileage entries for a user or business
 */
export async function getMileageEntries(
  businessId: string,
  options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    jobId?: string;
  }
): Promise<MileageEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('mileage_entries')
    .select(`
      *,
      user:users(id, name),
      job:jobs(id, title)
    `)
    .eq('business_id', businessId)
    .order('trip_date', { ascending: false })
    .order('arrived_at', { ascending: false });

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options?.startDate) {
    query = query.gte('trip_date', options.startDate.toISOString().split('T')[0]);
  }

  if (options?.endDate) {
    query = query.lte('trip_date', options.endDate.toISOString().split('T')[0]);
  }

  if (options?.jobId) {
    query = query.eq('job_id', options.jobId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching mileage entries:', error);
    throw new Error('Failed to fetch mileage entries');
  }

  return data || [];
}
