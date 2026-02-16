// =====================================================
// SPOKE - JOB MATCHING SIGNAL STACK
//
// Per Spoke Spec Section 6 & Beta Gate Addendum:
// Match voice updates to correct job using signals.
//
// Beta Constraint:
// - NO route prediction
// - Only use: GPS proximity, schedule window, explicit name, last-viewed
//
// Signal Weights (Beta):
// - Explicit customer name: 1.0
// - GPS within 500ft: 0.8
// - Schedule window ±2 hours: 0.6
// - Last-viewed job: 0.3
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { MATCHING_CONFIG } from '../config';
import { findCustomerMatches } from './customer-matcher';
import type { MatchSignals, MatchSignal } from '../types';

const signalLogger = smsLogger.child({ context: 'spoke.signal-stack' });

// =====================================================
// TYPES
// =====================================================

export interface JobCandidate {
  jobId: string;
  customerId: string;
  customerName: string;
  serviceType: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  status: string;
  addressLat: number | null;
  addressLng: number | null;
}

export interface SignalResult {
  signal: MatchSignal['type'];
  score: number;
  weight: number;
  weightedScore: number;
  evidence: string;
}

export interface JobMatchCandidate {
  job: JobCandidate;
  signals: SignalResult[];
  totalScore: number;
  normalizedScore: number;
  confidence: number;
}

export interface SignalStackResult {
  candidates: JobMatchCandidate[];
  bestMatch: JobMatchCandidate | null;
  isAmbiguous: boolean;
  needsClarification: boolean;
  matchedSignals: string[];
}

// =====================================================
// SIGNAL WEIGHTS (Beta - Fixed, No Adaptation)
// =====================================================

const SIGNAL_WEIGHTS: Record<MatchSignal['type'], number> = {
  customer_name: MATCHING_CONFIG.WEIGHTS.customer_name,  // 1.0
  gps_proximity: MATCHING_CONFIG.WEIGHTS.gps_proximity,           // 0.8
  schedule_window: MATCHING_CONFIG.WEIGHTS.schedule_window,       // 0.6
  last_viewed: MATCHING_CONFIG.WEIGHTS.last_viewed,            // 0.3
  route_prediction: 0, // Not used in beta
  recent_activity: 0.2,  // Bonus signal for recent activity
};

// =====================================================
// GPS CALCULATIONS
// =====================================================

/**
 * Calculate distance between two GPS coordinates in feet
 * Uses Haversine formula
 */
function calculateDistanceFeet(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 20902231; // Earth's radius in feet
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate GPS proximity signal score
 * Within 500ft = 1.0, degrades linearly to 2000ft = 0
 */
function calculateGPSSignal(distanceFeet: number): number {
  const threshold = MATCHING_CONFIG.GPS_PROXIMITY_THRESHOLD_FT; // 500ft
  if (distanceFeet <= threshold) {
    // Linear decay: 1.0 at 0ft -> 0.5 at threshold
    return 0.5 + (0.5 * (1 - (distanceFeet / threshold)));
  }
  return 0;
}

// =====================================================
// SCHEDULE CALCULATIONS
// =====================================================

/**
 * Calculate schedule window signal score
 * Within ±2 hours = 1.0, degrades to ±6 hours = 0
 */
function calculateScheduleSignal(
  scheduledDate: string | null,
  scheduledTime: string | null,
  currentTime: Date = new Date()
): number {
  if (!scheduledDate) {
    return 0;
  }

  // Parse scheduled datetime
  let scheduledDateTime: Date;
  if (scheduledTime) {
    scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  } else {
    // If no time specified, assume middle of day
    scheduledDateTime = new Date(`${scheduledDate}T12:00:00`);
  }

  const diffMs = Math.abs(currentTime.getTime() - scheduledDateTime.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);

  const threshold = MATCHING_CONFIG.SCHEDULE_WINDOW_HOURS; // 2 hours
  const maxWindow = 6; // 6 hours = no signal

  if (diffHours <= threshold) {
    return 1.0;
  }
  if (diffHours >= maxWindow) {
    return 0;
  }

  // Linear degradation
  return 1 - ((diffHours - threshold) / (maxWindow - threshold));
}

// =====================================================
// MAIN SIGNAL STACK FUNCTION
// =====================================================

/**
 * Calculate match signals for a voice update
 *
 * @param businessId - Business to search within
 * @param contractorPhoneId - Contractor making the update
 * @param parsedData - Extracted data from transcript
 * @param contractorLocation - Current GPS location (if available)
 */
export async function calculateMatchSignals(
  businessId: string,
  contractorPhoneId: string,
  parsedData: {
    customerName?: string;
    customerConfidence?: number;
  },
  contractorLocation?: {
    latitude: number;
    longitude: number;
  }
): Promise<SignalStackResult> {
  const startTime = Date.now();

  try {
    const supabase = createAdminClient();

    // Fetch candidate jobs (scheduled or in-progress for this business)
    const { data: candidateJobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        scheduled_date,
        scheduled_time,
        service_type,
        customers!inner (
          id,
          name,
          address_lat,
          address_lng
        )
      `)
      .eq('business_id', businessId)
      .in('status', ['SCHEDULED', 'IN_PROGRESS', 'PENDING'])
      .order('scheduled_date', { ascending: true })
      .limit(50);

    if (jobsError) {
      signalLogger.error({
        msg: 'Failed to fetch candidate jobs',
        error: jobsError,
        businessId,
      });
      return emptyResult();
    }

    if (!candidateJobs || candidateJobs.length === 0) {
      signalLogger.info({
        msg: 'No candidate jobs found',
        businessId,
      });
      return emptyResult();
    }

    // Transform to JobCandidate format
    const candidates: JobCandidate[] = candidateJobs.map(job => ({
      jobId: job.id,
      customerId: (job.customers as any).id,
      customerName: (job.customers as any).name,
      serviceType: job.service_type,
      scheduledDate: job.scheduled_date,
      scheduledTime: job.scheduled_time,
      status: job.status,
      addressLat: (job.customers as any).address_lat,
      addressLng: (job.customers as any).address_lng,
    }));

    // Get last-viewed job for this contractor
    const lastViewedJobId = await getLastViewedJob(contractorPhoneId);

    // Get recent activity (jobs updated in last 4 hours by this contractor)
    const recentJobIds = await getRecentActivityJobs(contractorPhoneId);

    // Calculate signals for each candidate
    const scoredCandidates: JobMatchCandidate[] = [];

    for (const job of candidates) {
      const signals: SignalResult[] = [];

      // Signal 1: Customer name match
      if (parsedData.customerName) {
        const nameMatch = await findCustomerMatches(
          parsedData.customerName,
          businessId,
          [job.customerId]
        );

        if (nameMatch.bestMatch?.customerId === job.customerId) {
          const nameScore = nameMatch.bestMatch.score;
          signals.push({
            signal: 'customer_name',
            score: nameScore,
            weight: SIGNAL_WEIGHTS.customer_name,
            weightedScore: nameScore * SIGNAL_WEIGHTS.customer_name,
            evidence: `Customer name "${parsedData.customerName}" matches "${job.customerName}" (${Math.round(nameScore * 100)}%)`,
          });
        }
      }

      // Signal 2: GPS proximity
      if (contractorLocation && job.addressLat && job.addressLng) {
        const distanceFeet = calculateDistanceFeet(
          contractorLocation.latitude,
          contractorLocation.longitude,
          job.addressLat,
          job.addressLng
        );

        const gpsScore = calculateGPSSignal(distanceFeet);
        if (gpsScore > 0) {
          signals.push({
            signal: 'gps_proximity',
            score: gpsScore,
            weight: SIGNAL_WEIGHTS.gps_proximity,
            weightedScore: gpsScore * SIGNAL_WEIGHTS.gps_proximity,
            evidence: `GPS within ${Math.round(distanceFeet)}ft of job site`,
          });
        }
      }

      // Signal 3: Schedule window
      const scheduleScore = calculateScheduleSignal(
        job.scheduledDate,
        job.scheduledTime
      );
      if (scheduleScore > 0) {
        signals.push({
          signal: 'schedule_window',
          score: scheduleScore,
          weight: SIGNAL_WEIGHTS.schedule_window,
          weightedScore: scheduleScore * SIGNAL_WEIGHTS.schedule_window,
          evidence: `Job scheduled for ${job.scheduledDate}${job.scheduledTime ? ' ' + job.scheduledTime : ''}`,
        });
      }

      // Signal 4: Last viewed job
      if (lastViewedJobId === job.jobId) {
        signals.push({
          signal: 'last_viewed',
          score: 1.0,
          weight: SIGNAL_WEIGHTS.last_viewed,
          weightedScore: SIGNAL_WEIGHTS.last_viewed,
          evidence: 'Job was last viewed in app',
        });
      }

      // Signal 5: Recent activity (bonus)
      if (recentJobIds.includes(job.jobId)) {
        signals.push({
          signal: 'recent_activity',
          score: 0.8,
          weight: SIGNAL_WEIGHTS.recent_activity,
          weightedScore: 0.8 * SIGNAL_WEIGHTS.recent_activity,
          evidence: 'Job has recent activity from this contractor',
        });
      }

      // Calculate total and normalized scores
      const totalScore = signals.reduce((sum, s) => sum + s.weightedScore, 0);
      const maxPossibleScore = Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
      const normalizedScore = totalScore / maxPossibleScore;

      // Only include candidates with some signal
      if (signals.length > 0) {
        scoredCandidates.push({
          job,
          signals,
          totalScore,
          normalizedScore,
          confidence: normalizedScore,
        });
      }
    }

    // Sort by total score descending
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

    // Determine best match and ambiguity
    const bestMatch = scoredCandidates[0] || null;
    const isAmbiguous = scoredCandidates.length > 1 &&
      scoredCandidates[1].totalScore >= MATCHING_CONFIG.AUTO_MATCH_THRESHOLD &&
      (scoredCandidates[0].totalScore - scoredCandidates[1].totalScore) < 0.15;

    const needsClarification = !bestMatch ||
      bestMatch.confidence < MATCHING_CONFIG.AUTO_MATCH_THRESHOLD ||
      isAmbiguous;

    // Collect matched signal types
    const matchedSignals = bestMatch
      ? [...new Set(bestMatch.signals.map(s => s.signal))]
      : [];

    signalLogger.info({
      msg: 'Signal stack calculation complete',
      candidateCount: scoredCandidates.length,
      bestMatchJobId: bestMatch?.job.jobId,
      bestMatchScore: bestMatch?.totalScore,
      isAmbiguous,
      needsClarification,
      matchedSignals,
      latencyMs: Date.now() - startTime,
    });

    return {
      candidates: scoredCandidates.slice(0, 5), // Top 5
      bestMatch,
      isAmbiguous,
      needsClarification,
      matchedSignals,
    };

  } catch (error) {
    signalLogger.error({
      msg: 'Signal stack calculation error',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    });
    return emptyResult();
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the last job viewed by this contractor in the app
 */
async function getLastViewedJob(contractorPhoneId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    // Check customer_activity for recent job views
    // This assumes we track job views in customer_activity
    const { data } = await supabase
      .from('customer_activity')
      .select('metadata')
      .eq('metadata->>contractor_phone_id', contractorPhoneId)
      .eq('activity_type', 'JOB_VIEWED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return (data?.metadata as any)?.job_id || null;
  } catch {
    return null;
  }
}

/**
 * Get jobs with recent activity from this contractor (last 4 hours)
 */
async function getRecentActivityJobs(contractorPhoneId: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    // Check spoke_updates for recent activity
    const { data } = await supabase
      .from('spoke_updates')
      .select('job_id')
      .eq('contractor_phone_id', contractorPhoneId)
      .gte('created_at', fourHoursAgo)
      .not('job_id', 'is', null);

    return data?.map(d => d.job_id).filter(Boolean) as string[] || [];
  } catch {
    return [];
  }
}

/**
 * Return empty result structure
 */
function emptyResult(): SignalStackResult {
  return {
    candidates: [],
    bestMatch: null,
    isAmbiguous: false,
    needsClarification: true,
    matchedSignals: [],
  };
}

/**
 * Get contractor's current GPS location from technician_locations table
 */
export async function getContractorLocation(
  contractorPhoneId: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const supabase = createAdminClient();

    // First, get the user_id associated with this phone
    const { data: phoneData } = await supabase
      .from('contractor_phones')
      .select('business_id')
      .eq('id', contractorPhoneId)
      .single();

    if (!phoneData) return null;

    // Check technician_locations for recent location (within 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: locationData } = await supabase
      .from('technician_locations')
      .select('latitude, longitude')
      .eq('business_id', phoneData.business_id)
      .gte('updated_at', thirtyMinutesAgo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (locationData?.latitude && locationData?.longitude) {
      return {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      };
    }

    return null;
  } catch {
    return null;
  }
}
