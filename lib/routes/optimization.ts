// =====================================================
// ROUTE OPTIMIZATION LIBRARY
// Optimizes job routes for technicians
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { calculateDistance, getOrGeocodeAddress, Coordinates } from './geocoding';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface JobWithLocation {
  id: string;
  title: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  scheduled_start: string;
  scheduled_end?: string;
  latitude?: number;
  longitude?: number;
  customer_name?: string;
  time_window?: {
    start: string;
    end: string;
  };
}

export interface OptimizedStop {
  job: JobWithLocation;
  order: number;
  arrivalTime?: string;
  distanceFromPrevious: number;
  drivingTimeMinutes: number;
}

export interface OptimizedRoute {
  technicianId: string;
  date: string;
  stops: OptimizedStop[];
  totalDistanceMiles: number;
  totalDrivingMinutes: number;
  startLocation?: Coordinates;
}

export interface DailyRoute {
  id: string;
  business_id: string;
  technician_id: string;
  route_date: string;
  stops: OptimizedStop[];
  total_distance: number;
  total_driving_time: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

/**
 * Get jobs for a technician on a specific date
 */
export async function getTechnicianJobsForDate(
  technicianId: string,
  date: Date
): Promise<JobWithLocation[]> {
  const supabase = await createClient();

  const dayStart = startOfDay(date).toISOString();
  const dayEnd = endOfDay(date).toISOString();

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      address,
      city,
      state,
      zip,
      scheduled_start,
      scheduled_end,
      latitude,
      longitude,
      customer:customers(name)
    `)
    .eq('assigned_to', technicianId)
    .gte('scheduled_start', dayStart)
    .lte('scheduled_start', dayEnd)
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }

  return (jobs || []).map((job: any) => ({
    id: job.id,
    title: job.title,
    address: job.address,
    city: job.city,
    state: job.state,
    zip: job.zip,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
    latitude: job.latitude,
    longitude: job.longitude,
    customer_name: job.customer?.name,
  }));
}

/**
 * Optimize route using nearest neighbor algorithm
 * Simple but effective for small number of stops
 */
export function optimizeRouteNearestNeighbor(
  jobs: JobWithLocation[],
  startLocation?: Coordinates
): OptimizedStop[] {
  if (jobs.length === 0) return [];
  if (jobs.length === 1) {
    return [{
      job: jobs[0],
      order: 1,
      distanceFromPrevious: 0,
      drivingTimeMinutes: 0,
    }];
  }

  // Filter jobs with valid coordinates
  const jobsWithCoords = jobs.filter(
    (j) => j.latitude !== undefined && j.longitude !== undefined
  );

  if (jobsWithCoords.length === 0) {
    // No geocoded jobs, return in original order
    return jobs.map((job, index) => ({
      job,
      order: index + 1,
      distanceFromPrevious: 0,
      drivingTimeMinutes: 0,
    }));
  }

  const optimizedStops: OptimizedStop[] = [];
  const remaining = [...jobsWithCoords];
  let currentLocation = startLocation || {
    latitude: jobsWithCoords[0].latitude!,
    longitude: jobsWithCoords[0].longitude!,
  };

  while (remaining.length > 0) {
    // Find nearest unvisited job
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((job, index) => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        job.latitude!,
        job.longitude!
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nearestJob = remaining.splice(nearestIndex, 1)[0];
    const drivingTime = Math.round((nearestDistance / 30) * 60); // Assume 30 mph average

    optimizedStops.push({
      job: nearestJob,
      order: optimizedStops.length + 1,
      distanceFromPrevious: Math.round(nearestDistance * 10) / 10,
      drivingTimeMinutes: drivingTime,
    });

    currentLocation = {
      latitude: nearestJob.latitude!,
      longitude: nearestJob.longitude!,
    };
  }

  // Add any jobs without coordinates at the end
  const jobsWithoutCoords = jobs.filter(
    (j) => j.latitude === undefined || j.longitude === undefined
  );
  jobsWithoutCoords.forEach((job) => {
    optimizedStops.push({
      job,
      order: optimizedStops.length + 1,
      distanceFromPrevious: 0,
      drivingTimeMinutes: 0,
    });
  });

  return optimizedStops;
}

/**
 * Create or update an optimized route for a technician
 */
export async function createOptimizedRoute(
  businessId: string,
  technicianId: string,
  date: Date,
  startLocation?: Coordinates
): Promise<OptimizedRoute | null> {
  const supabase = await createClient();

  // Get jobs for the day
  const jobs = await getTechnicianJobsForDate(technicianId, date);

  if (jobs.length === 0) {
    return null;
  }

  // Geocode any missing addresses
  for (const job of jobs) {
    if (job.latitude === undefined && job.address) {
      const fullAddress = [job.address, job.city, job.state, job.zip]
        .filter(Boolean)
        .join(', ');
      const geocoded = await getOrGeocodeAddress(businessId, fullAddress);
      if (geocoded) {
        job.latitude = geocoded.latitude;
        job.longitude = geocoded.longitude;

        // Update job with coordinates
        await supabase
          .from('jobs')
          .update({ latitude: geocoded.latitude, longitude: geocoded.longitude })
          .eq('id', job.id);
      }
    }
  }

  // Optimize the route
  const stops = optimizeRouteNearestNeighbor(jobs, startLocation);

  // Calculate totals
  const totalDistanceMiles = stops.reduce((sum, s) => sum + s.distanceFromPrevious, 0);
  const totalDrivingMinutes = stops.reduce((sum, s) => sum + s.drivingTimeMinutes, 0);

  const dateStr = format(date, 'yyyy-MM-dd');

  // Save or update the route
  const { data: existingRoute } = await supabase
    .from('daily_routes')
    .select('id')
    .eq('technician_id', technicianId)
    .eq('route_date', dateStr)
    .single();

  if (existingRoute) {
    await supabase
      .from('daily_routes')
      .update({
        stops: stops as any,
        total_distance: totalDistanceMiles,
        total_driving_time: totalDrivingMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRoute.id);
  } else {
    await supabase
      .from('daily_routes')
      .insert({
        business_id: businessId,
        technician_id: technicianId,
        route_date: dateStr,
        stops: stops as any,
        total_distance: totalDistanceMiles,
        total_driving_time: totalDrivingMinutes,
        status: 'draft',
      });
  }

  return {
    technicianId,
    date: dateStr,
    stops,
    totalDistanceMiles: Math.round(totalDistanceMiles * 10) / 10,
    totalDrivingMinutes: Math.round(totalDrivingMinutes),
    startLocation,
  };
}

/**
 * Get saved route for a technician on a date
 */
export async function getDailyRoute(
  technicianId: string,
  date: Date
): Promise<DailyRoute | null> {
  const supabase = await createClient();
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('daily_routes')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('route_date', dateStr)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update route status
 */
export async function updateRouteStatus(
  routeId: string,
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed'
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('daily_routes')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', routeId);
}

/**
 * Reorder stops manually
 */
export async function reorderStops(
  routeId: string,
  newOrder: string[] // Array of job IDs in new order
): Promise<OptimizedStop[]> {
  const supabase = await createClient();

  const { data: route } = await supabase
    .from('daily_routes')
    .select('stops')
    .eq('id', routeId)
    .single();

  if (!route) {
    throw new Error('Route not found');
  }

  const stops = route.stops as OptimizedStop[];
  const reorderedStops = newOrder.map((jobId, index) => {
    const stop = stops.find((s) => s.job.id === jobId);
    if (!stop) {
      throw new Error(`Job ${jobId} not found in route`);
    }
    return {
      ...stop,
      order: index + 1,
    };
  });

  // Recalculate distances
  for (let i = 1; i < reorderedStops.length; i++) {
    const prev = reorderedStops[i - 1];
    const curr = reorderedStops[i];

    if (prev.job.latitude && prev.job.longitude && curr.job.latitude && curr.job.longitude) {
      const distance = calculateDistance(
        prev.job.latitude,
        prev.job.longitude,
        curr.job.latitude,
        curr.job.longitude
      );
      curr.distanceFromPrevious = Math.round(distance * 10) / 10;
      curr.drivingTimeMinutes = Math.round((distance / 30) * 60);
    }
  }

  // Update totals
  const totalDistance = reorderedStops.reduce((sum, s) => sum + s.distanceFromPrevious, 0);
  const totalDrivingTime = reorderedStops.reduce((sum, s) => sum + s.drivingTimeMinutes, 0);

  await supabase
    .from('daily_routes')
    .update({
      stops: reorderedStops as any,
      total_distance: totalDistance,
      total_driving_time: totalDrivingTime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', routeId);

  return reorderedStops;
}
