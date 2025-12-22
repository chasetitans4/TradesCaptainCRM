// =====================================================
// DISPATCH DATA LAYER
// Fetching jobs and technicians for dispatch board
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface DispatchJob {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedDuration: number;
  priority: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    lat?: number;
    lng?: number;
  };
  assignedUser: {
    id: string;
    name: string;
    color: string;
  } | null;
  requiredSkills: string[];
}

export interface DispatchTechnician {
  id: string;
  name: string;
  email: string;
  phone: string;
  color: string;
  skills: Array<{ id: string; name: string; proficiency: number }>;
  status: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  todaysJobs: number;
  weeklyHours: number;
}

/**
 * Get jobs for dispatch board
 */
export async function getDispatchJobs(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<DispatchJob[]> {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      type,
      status,
      scheduled_date,
      scheduled_time,
      estimated_duration,
      priority,
      customer:customers(
        id, name, phone, address, city, state, zip, latitude, longitude
      ),
      assigned_user:users!jobs_assigned_user_id_fkey(id, name, color)
    `)
    .eq('business_id', businessId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .in('status', ['scheduled', 'in_progress', 'on_hold'])
    .order('scheduled_date')
    .order('scheduled_time');

  if (!jobs) return [];

  // Get required skills for job types
  const jobTypes = [...new Set(jobs.map((j) => j.type).filter(Boolean))];

  let skillsByType: Record<string, string[]> = {};

  if (jobTypes.length > 0) {
    const { data: skillRequirements } = await supabase
      .from('job_type_skills')
      .select(`
        job_type,
        skill:skill_definitions(name)
      `)
      .eq('business_id', businessId)
      .in('job_type', jobTypes)
      .eq('is_required', true);

    for (const sr of skillRequirements || []) {
      if (!skillsByType[sr.job_type]) skillsByType[sr.job_type] = [];
      skillsByType[sr.job_type].push((sr.skill as any)?.name || '');
    }
  }

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    type: job.type || '',
    status: job.status,
    scheduledDate: job.scheduled_date,
    scheduledTime: job.scheduled_time,
    estimatedDuration: job.estimated_duration || 60,
    priority: job.priority || 'normal',
    customer: {
      id: (job.customer as any)?.id || '',
      name: (job.customer as any)?.name || '',
      phone: (job.customer as any)?.phone || '',
      address: `${(job.customer as any)?.address || ''}, ${(job.customer as any)?.city || ''}`,
      city: (job.customer as any)?.city || '',
      lat: (job.customer as any)?.latitude,
      lng: (job.customer as any)?.longitude,
    },
    assignedUser: job.assigned_user
      ? {
          id: (job.assigned_user as any).id,
          name: (job.assigned_user as any).name,
          color: (job.assigned_user as any).color || '#3B82F6',
        }
      : null,
    requiredSkills: skillsByType[job.type || ''] || [],
  }));
}

/**
 * Get technicians for dispatch
 */
export async function getDispatchTechnicians(businessId: string): Promise<DispatchTechnician[]> {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      phone,
      color,
      user_skills(
        proficiency_level,
        skill:skill_definitions(id, name)
      )
    `)
    .eq('business_id', businessId)
    .eq('role', 'technician')
    .eq('is_active', true);

  if (!users) return [];

  // Get current locations
  const { data: locations } = await supabase
    .from('technician_locations')
    .select('*')
    .in(
      'user_id',
      users.map((u) => u.id)
    );

  const locationMap = new Map(locations?.map((l) => [l.user_id, l]) || []);

  // Get today's job counts
  const today = new Date().toISOString().split('T')[0];
  const { data: todaysJobs } = await supabase
    .from('jobs')
    .select('assigned_user_id')
    .eq('business_id', businessId)
    .eq('scheduled_date', today)
    .not('assigned_user_id', 'is', null);

  const jobCounts: Record<string, number> = {};
  for (const j of todaysJobs || []) {
    if (j.assigned_user_id) {
      jobCounts[j.assigned_user_id] = (jobCounts[j.assigned_user_id] || 0) + 1;
    }
  }

  // Get weekly hours from job_labor
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const { data: weeklyLabor } = await supabase
    .from('job_labor')
    .select('user_id, total_minutes')
    .in(
      'user_id',
      users.map((u) => u.id)
    )
    .gte('clock_in', weekStartStr)
    .not('clock_out', 'is', null);

  const weeklyMinutes: Record<string, number> = {};
  for (const l of weeklyLabor || []) {
    weeklyMinutes[l.user_id] = (weeklyMinutes[l.user_id] || 0) + (l.total_minutes || 0);
  }

  return users.map((user) => {
    const location = locationMap.get(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      color: user.color || '#3B82F6',
      skills:
        user.user_skills?.map((us: any) => ({
          id: us.skill?.id || '',
          name: us.skill?.name || '',
          proficiency: us.proficiency_level,
        })) || [],
      status: location?.status || 'offline',
      currentLocation: location
        ? {
            lat: location.latitude,
            lng: location.longitude,
            address: location.address || '',
          }
        : undefined,
      todaysJobs: jobCounts[user.id] || 0,
      weeklyHours: (weeklyMinutes[user.id] || 0) / 60,
    };
  });
}

/**
 * Get unassigned jobs
 */
export async function getUnassignedJobs(businessId: string): Promise<DispatchJob[]> {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      type,
      status,
      scheduled_date,
      scheduled_time,
      estimated_duration,
      priority,
      customer:customers(id, name, phone, address, city)
    `)
    .eq('business_id', businessId)
    .is('assigned_user_id', null)
    .in('status', ['scheduled', 'on_hold'])
    .order('priority', { ascending: false })
    .order('scheduled_date');

  return (jobs || []).map((job) => ({
    id: job.id,
    title: job.title,
    type: job.type || '',
    status: job.status,
    scheduledDate: job.scheduled_date,
    scheduledTime: job.scheduled_time,
    estimatedDuration: job.estimated_duration || 60,
    priority: job.priority || 'normal',
    customer: {
      id: (job.customer as any)?.id || '',
      name: (job.customer as any)?.name || '',
      phone: (job.customer as any)?.phone || '',
      address: (job.customer as any)?.address || '',
      city: (job.customer as any)?.city || '',
    },
    assignedUser: null,
    requiredSkills: [],
  }));
}

/**
 * Get technician schedule for a date
 */
export async function getTechnicianSchedule(
  userId: string,
  date: string
): Promise<{
  available: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  jobs: DispatchJob[];
}> {
  const supabase = await createClient();

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  // Check for time off
  const { data: timeOff } = await supabase
    .from('technician_schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('schedule_type', 'time_off')
    .eq('is_active', true)
    .lte('start_date', date)
    .gte('end_date', date)
    .single();

  if (timeOff) {
    return {
      available: false,
      startTime: null,
      endTime: null,
      reason: timeOff.title || 'Time off',
      jobs: [],
    };
  }

  // Get regular schedule
  const { data: schedule } = await supabase
    .from('technician_schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('schedule_type', 'regular')
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single();

  // Get jobs for the day
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      type,
      status,
      scheduled_date,
      scheduled_time,
      estimated_duration,
      priority,
      customer:customers(id, name, phone, address, city)
    `)
    .eq('assigned_user_id', userId)
    .eq('scheduled_date', date)
    .order('scheduled_time');

  const mappedJobs: DispatchJob[] = (jobs || []).map((job) => ({
    id: job.id,
    title: job.title,
    type: job.type || '',
    status: job.status,
    scheduledDate: job.scheduled_date,
    scheduledTime: job.scheduled_time,
    estimatedDuration: job.estimated_duration || 60,
    priority: job.priority || 'normal',
    customer: {
      id: (job.customer as any)?.id || '',
      name: (job.customer as any)?.name || '',
      phone: (job.customer as any)?.phone || '',
      address: (job.customer as any)?.address || '',
      city: (job.customer as any)?.city || '',
    },
    assignedUser: null,
    requiredSkills: [],
  }));

  if (!schedule) {
    return {
      available: false,
      startTime: null,
      endTime: null,
      reason: 'Not scheduled',
      jobs: mappedJobs,
    };
  }

  return {
    available: true,
    startTime: schedule.start_time,
    endTime: schedule.end_time,
    reason: null,
    jobs: mappedJobs,
  };
}

/**
 * Get dispatch statistics
 */
export async function getDispatchStats(
  businessId: string,
  date: string
): Promise<{
  totalJobs: number;
  assignedJobs: number;
  unassignedJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  availableTechs: number;
  busyTechs: number;
}> {
  const supabase = await createClient();

  // Get job counts
  const { data: jobs } = await supabase
    .from('jobs')
    .select('status, assigned_user_id')
    .eq('business_id', businessId)
    .eq('scheduled_date', date);

  const totalJobs = jobs?.length || 0;
  const assignedJobs = jobs?.filter((j) => j.assigned_user_id).length || 0;
  const unassignedJobs = totalJobs - assignedJobs;
  const completedJobs = jobs?.filter((j) => j.status === 'completed').length || 0;
  const inProgressJobs = jobs?.filter((j) => j.status === 'in_progress').length || 0;

  // Get technician status counts
  const { data: techLocations } = await supabase
    .from('technician_locations')
    .select(`
      status,
      user:users(business_id)
    `);

  const businessTechLocations = techLocations?.filter(
    (l) => (l.user as any)?.business_id === businessId
  );

  const availableTechs = businessTechLocations?.filter((l) => l.status === 'available').length || 0;
  const busyTechs = businessTechLocations?.filter(
    (l) => l.status === 'on_job' || l.status === 'en_route'
  ).length || 0;

  return {
    totalJobs,
    assignedJobs,
    unassignedJobs,
    completedJobs,
    inProgressJobs,
    availableTechs,
    busyTechs,
  };
}
