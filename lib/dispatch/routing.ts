// =====================================================
// SKILLS-BASED ROUTING & AUTO-ASSIGNMENT
// Find and assign best technicians for jobs
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { checkUserSkillsForJobType } from './skills';

export interface TechnicianMatch {
  id: string;
  name: string;
  color: string;
  score: number;
  qualificationStatus: 'qualified' | 'partial' | 'unqualified';
  missingSkills: string[];
  distance?: number;
  todaysJobCount: number;
  weeklyHours: number;
  currentStatus: string;
}

/**
 * Find qualified technicians for a job type
 */
export async function findQualifiedTechnicians(
  businessId: string,
  jobType: string,
  date: string
): Promise<{
  qualified: TechnicianMatch[];
  partiallyQualified: TechnicianMatch[];
  unqualified: TechnicianMatch[];
}> {
  const supabase = await createClient();

  // Get all technicians
  const { data: technicians } = await supabase
    .from('users')
    .select(`
      id,
      name,
      color
    `)
    .eq('business_id', businessId)
    .eq('role', 'technician')
    .eq('is_active', true);

  if (!technicians) {
    return { qualified: [], partiallyQualified: [], unqualified: [] };
  }

  // Get locations
  const { data: locations } = await supabase
    .from('technician_locations')
    .select('*')
    .in(
      'user_id',
      technicians.map((t) => t.id)
    );

  const locationMap = new Map(locations?.map((l) => [l.user_id, l]) || []);

  // Get today's job counts
  const { data: todaysJobs } = await supabase
    .from('jobs')
    .select('assigned_user_id')
    .eq('business_id', businessId)
    .eq('scheduled_date', date)
    .not('assigned_user_id', 'is', null);

  const jobCounts: Record<string, number> = {};
  for (const j of todaysJobs || []) {
    if (j.assigned_user_id) {
      jobCounts[j.assigned_user_id] = (jobCounts[j.assigned_user_id] || 0) + 1;
    }
  }

  // Get weekly hours
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const { data: weeklyLabor } = await supabase
    .from('job_labor')
    .select('user_id, total_minutes')
    .in(
      'user_id',
      technicians.map((t) => t.id)
    )
    .gte('clock_in', weekStartStr)
    .not('clock_out', 'is', null);

  const weeklyMinutes: Record<string, number> = {};
  for (const l of weeklyLabor || []) {
    weeklyMinutes[l.user_id] = (weeklyMinutes[l.user_id] || 0) + (l.total_minutes || 0);
  }

  // Check each technician's qualifications
  const qualified: TechnicianMatch[] = [];
  const partiallyQualified: TechnicianMatch[] = [];
  const unqualified: TechnicianMatch[] = [];

  for (const tech of technicians) {
    const skillCheck = await checkUserSkillsForJobType(tech.id, businessId, jobType);
    const location = locationMap.get(tech.id);

    const match: TechnicianMatch = {
      id: tech.id,
      name: tech.name,
      color: tech.color || '#3B82F6',
      score: 0,
      qualificationStatus: skillCheck.qualified
        ? 'qualified'
        : skillCheck.missingRequired.length < 2
        ? 'partial'
        : 'unqualified',
      missingSkills: [...skillCheck.missingRequired, ...skillCheck.expiredCertifications],
      todaysJobCount: jobCounts[tech.id] || 0,
      weeklyHours: (weeklyMinutes[tech.id] || 0) / 60,
      currentStatus: location?.status || 'offline',
    };

    // Calculate score
    match.score = calculateTechnicianScore(match, skillCheck);

    if (skillCheck.qualified) {
      qualified.push(match);
    } else if (skillCheck.missingRequired.length === 0 && skillCheck.expiredCertifications.length > 0) {
      partiallyQualified.push(match);
    } else if (skillCheck.missingRequired.length < 2) {
      partiallyQualified.push(match);
    } else {
      unqualified.push(match);
    }
  }

  // Sort by score
  qualified.sort((a, b) => b.score - a.score);
  partiallyQualified.sort((a, b) => b.score - a.score);

  return { qualified, partiallyQualified, unqualified };
}

/**
 * Calculate technician match score
 */
function calculateTechnicianScore(
  match: TechnicianMatch,
  skillCheck: { qualified: boolean; missingRequired: string[]; missingPreferred: string[] }
): number {
  let score = 100;

  // Penalize for missing skills
  score -= skillCheck.missingRequired.length * 25;
  score -= skillCheck.missingPreferred.length * 5;

  // Penalize for high workload
  score -= match.todaysJobCount * 10;

  // Penalize for high weekly hours (overtime potential)
  if (match.weeklyHours > 40) {
    score -= (match.weeklyHours - 40) * 2;
  }

  // Bonus for being available
  if (match.currentStatus === 'available') {
    score += 10;
  }

  return Math.max(0, score);
}

/**
 * Auto-assign job to best available technician
 */
export async function autoAssignJob(
  jobId: string,
  businessId: string,
  preferences?: {
    preferClosest?: boolean;
    preferLeastBusy?: boolean;
    preferHighestRated?: boolean;
    excludeTechnicianIds?: string[];
  }
): Promise<{
  success: boolean;
  assignedTo?: TechnicianMatch;
  reason?: string;
}> {
  const supabase = await createClient();

  // Get job details
  const { data: job } = await supabase
    .from('jobs')
    .select(`
      type,
      scheduled_date,
      customer:customers(latitude, longitude)
    `)
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, reason: 'Job not found' };
  }

  // Find qualified technicians
  const { qualified } = await findQualifiedTechnicians(
    businessId,
    job.type || '',
    job.scheduled_date
  );

  // Filter out excluded technicians
  let candidates = qualified;
  if (preferences?.excludeTechnicianIds?.length) {
    candidates = candidates.filter((t) => !preferences.excludeTechnicianIds!.includes(t.id));
  }

  // Filter to only available technicians
  candidates = candidates.filter((t) => t.currentStatus !== 'offline');

  if (candidates.length === 0) {
    return { success: false, reason: 'No qualified technicians available' };
  }

  // Apply preference scoring
  if (preferences?.preferClosest && (job.customer as any)?.latitude) {
    candidates = await scoreByDistance(
      candidates,
      (job.customer as any).latitude,
      (job.customer as any).longitude
    );
  }

  if (preferences?.preferLeastBusy) {
    candidates.sort((a, b) => a.todaysJobCount - b.todaysJobCount);
  }

  // Get best match
  const bestMatch = candidates[0];

  // Assign the job
  const { assignJob } = await import('./actions');
  const result = await assignJob(jobId, bestMatch.id, {
    notifyTechnician: true,
  });

  if (!result.success) {
    return { success: false, reason: result.error };
  }

  return { success: true, assignedTo: bestMatch };
}

/**
 * Score technicians by distance to job
 */
async function scoreByDistance(
  technicians: TechnicianMatch[],
  jobLat: number,
  jobLng: number
): Promise<TechnicianMatch[]> {
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from('technician_locations')
    .select('user_id, latitude, longitude')
    .in(
      'user_id',
      technicians.map((t) => t.id)
    );

  const locationMap = new Map(
    locations?.map((l) => [l.user_id, { lat: l.latitude, lng: l.longitude }]) || []
  );

  return technicians
    .map((tech) => {
      const location = locationMap.get(tech.id);
      if (location?.lat && location?.lng) {
        tech.distance = calculateDistance(jobLat, jobLng, location.lat, location.lng);
        // Adjust score based on distance
        tech.score -= tech.distance * 0.5;
      }
      return tech;
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Suggest optimal technician assignments for multiple jobs
 */
export async function suggestBulkAssignments(
  businessId: string,
  jobIds: string[]
): Promise<
  Array<{
    jobId: string;
    jobTitle: string;
    suggestedTechnician: TechnicianMatch | null;
    alternativeTechnicians: TechnicianMatch[];
    reason?: string;
  }>
> {
  const supabase = await createClient();

  // Get job details
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, type, scheduled_date')
    .in('id', jobIds);

  if (!jobs) return [];

  const suggestions: Array<{
    jobId: string;
    jobTitle: string;
    suggestedTechnician: TechnicianMatch | null;
    alternativeTechnicians: TechnicianMatch[];
    reason?: string;
  }> = [];

  // Track assigned technicians to balance workload
  const assignedCounts: Record<string, number> = {};

  for (const job of jobs) {
    const { qualified, partiallyQualified } = await findQualifiedTechnicians(
      businessId,
      job.type || '',
      job.scheduled_date
    );

    // Adjust scores based on already suggested assignments
    const adjustedQualified = qualified.map((t) => ({
      ...t,
      score: t.score - (assignedCounts[t.id] || 0) * 15,
    }));

    adjustedQualified.sort((a, b) => b.score - a.score);

    const suggested = adjustedQualified[0] || partiallyQualified[0] || null;

    if (suggested) {
      assignedCounts[suggested.id] = (assignedCounts[suggested.id] || 0) + 1;
    }

    suggestions.push({
      jobId: job.id,
      jobTitle: job.title,
      suggestedTechnician: suggested,
      alternativeTechnicians: adjustedQualified.slice(1, 4),
      reason: suggested
        ? undefined
        : 'No qualified technicians available',
    });
  }

  return suggestions;
}

/**
 * Auto-assign the best technician for a job
 * Wrapper for autoAssignJob with sensible defaults
 */
export async function autoAssignBestTechnician(
  jobId: string,
  businessId: string
): Promise<{
  success: boolean;
  assignedTo?: TechnicianMatch;
  reason?: string;
}> {
  return autoAssignJob(jobId, businessId, {
    preferLeastBusy: true,
    preferClosest: true,
  });
}

/**
 * Get workload distribution across technicians
 */
export async function getWorkloadDistribution(
  businessId: string,
  date: string
): Promise<
  Array<{
    technicianId: string;
    technicianName: string;
    scheduledJobs: number;
    estimatedHours: number;
    isOverloaded: boolean;
  }>
> {
  const supabase = await createClient();

  const { data: technicians } = await supabase
    .from('users')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('role', 'technician')
    .eq('is_active', true);

  if (!technicians) return [];

  const { data: jobs } = await supabase
    .from('jobs')
    .select('assigned_user_id, estimated_duration')
    .eq('business_id', businessId)
    .eq('scheduled_date', date)
    .not('assigned_user_id', 'is', null);

  const workloads: Record<string, { jobs: number; minutes: number }> = {};

  for (const job of jobs || []) {
    if (!job.assigned_user_id) continue;

    if (!workloads[job.assigned_user_id]) {
      workloads[job.assigned_user_id] = { jobs: 0, minutes: 0 };
    }

    workloads[job.assigned_user_id].jobs++;
    workloads[job.assigned_user_id].minutes += job.estimated_duration || 60;
  }

  return technicians.map((tech) => {
    const workload = workloads[tech.id] || { jobs: 0, minutes: 0 };
    const estimatedHours = workload.minutes / 60;

    return {
      technicianId: tech.id,
      technicianName: tech.name,
      scheduledJobs: workload.jobs,
      estimatedHours,
      isOverloaded: estimatedHours > 8,
    };
  });
}
