// =====================================================
// PHOTO VERIFICATION SERVICE
//
// Verifies photo metadata (GPS, time, source) and assigns
// verification levels for Proof of Work
//
// Verification Levels:
//   0 = Unverified
//   1 = Time verified only
//   2 = Time + location verified
//   3 = Fully verified (time + location + source)
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type {
  PhotoVerificationLevel,
  PhotoVerificationResult,
  VerifiedJobPhoto,
  PhotoUploadSource,
} from '@/types/proof-of-work';
import { LOCATION_VERIFICATION_RADIUS_METERS } from '@/types/proof-of-work';

interface JobWithLocation {
  id: string;
  job_address_latitude?: number;
  job_address_longitude?: number;
  arrived_at?: string;
  departed_at?: string;
}

interface PhotoVerificationSummary {
  hasVerifiedPhotos: boolean;
  hasLocationVerified: boolean;
  totalPhotos: number;
  verifiedPhotos: number;
  photosByLevel: Record<PhotoVerificationLevel, number>;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verify time - check if photo was taken during the job window
 */
function verifyTime(
  photoTakenAt: string | null,
  jobArrivedAt: string | null,
  jobDepartedAt: string | null
): boolean {
  if (!photoTakenAt || !jobArrivedAt) return false;

  const photoTime = new Date(photoTakenAt).getTime();
  const arrivedTime = new Date(jobArrivedAt).getTime();

  // Allow 15 minutes before arrival (traveling/setup)
  const windowStart = arrivedTime - 15 * 60 * 1000;

  // If departed, use that as window end + 15 min buffer
  // If not departed yet, use current time + 2 hours
  const windowEnd = jobDepartedAt
    ? new Date(jobDepartedAt).getTime() + 15 * 60 * 1000
    : Date.now() + 2 * 60 * 60 * 1000;

  return photoTime >= windowStart && photoTime <= windowEnd;
}

/**
 * Verify location - check if photo was taken within radius of job site
 */
function verifyLocation(
  photoLat: number | null,
  photoLon: number | null,
  jobLat: number | null,
  jobLon: number | null
): { verified: boolean; distanceMeters: number | null } {
  if (!photoLat || !photoLon || !jobLat || !jobLon) {
    return { verified: false, distanceMeters: null };
  }

  const distance = calculateDistanceMeters(photoLat, photoLon, jobLat, jobLon);
  return {
    verified: distance <= LOCATION_VERIFICATION_RADIUS_METERS,
    distanceMeters: Math.round(distance),
  };
}

/**
 * Verify source - check if photo was captured directly from mobile app
 */
function verifySource(uploadSource: PhotoUploadSource | null): boolean {
  return uploadSource === 'MOBILE_APP';
}

/**
 * Calculate verification level based on individual verification results
 */
function calculateVerificationLevel(
  timeVerified: boolean,
  locationVerified: boolean,
  sourceVerified: boolean
): PhotoVerificationLevel {
  if (timeVerified && locationVerified && sourceVerified) {
    return 3;
  } else if (timeVerified && locationVerified) {
    return 2;
  } else if (timeVerified) {
    return 1;
  }
  return 0;
}

/**
 * Verify a single photo and return verification result
 */
export function verifyPhoto(
  photo: {
    taken_at?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    upload_source?: PhotoUploadSource | null;
  },
  job: JobWithLocation
): PhotoVerificationResult {
  const flags: string[] = [];

  // Time verification
  const timeVerified = verifyTime(
    photo.taken_at || null,
    job.arrived_at || null,
    job.departed_at || null
  );
  if (!timeVerified && photo.taken_at) {
    flags.push('time_outside_window');
  }
  if (!photo.taken_at) {
    flags.push('no_timestamp');
  }

  // Location verification
  const locationResult = verifyLocation(
    photo.latitude || null,
    photo.longitude || null,
    job.job_address_latitude || null,
    job.job_address_longitude || null
  );
  if (!locationResult.verified && photo.latitude && photo.longitude) {
    flags.push('location_outside_radius');
  }
  if (!photo.latitude || !photo.longitude) {
    flags.push('no_gps');
  }
  if (!job.job_address_latitude || !job.job_address_longitude) {
    flags.push('no_job_location');
  }

  // Source verification
  const sourceVerified = verifySource(photo.upload_source || null);
  if (!sourceVerified) {
    if (photo.upload_source === 'DESKTOP') {
      flags.push('desktop_upload');
    } else if (photo.upload_source === 'API') {
      flags.push('api_upload');
    } else {
      flags.push('unknown_source');
    }
  }

  const verificationLevel = calculateVerificationLevel(
    timeVerified,
    locationResult.verified,
    sourceVerified
  );

  return {
    verification_level: verificationLevel,
    source_verified: sourceVerified,
    time_verified: timeVerified,
    location_verified: locationResult.verified,
    distance_meters: locationResult.distanceMeters ?? undefined,
    flags,
  };
}

/**
 * Verify all photos for a job and update their verification fields
 */
export async function verifyJobPhotos(jobId: string): Promise<PhotoVerificationSummary> {
  const supabase = createAdminClient();

  // Get job with location
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      arrived_at,
      departed_at,
      job_address_latitude:customers!inner(
        addresses:customer_addresses(latitude, longitude)
      )
    `)
    .eq('id', jobId)
    .single();

  // Also try to get job location from a simpler query
  const { data: jobSimple } = await supabase
    .from('jobs')
    .select('id, arrived_at, departed_at')
    .eq('id', jobId)
    .single();

  if (jobError || !jobSimple) {
    logger.error({
      msg: 'Failed to get job for photo verification',
      jobId,
      error: jobError,
    });
    return {
      hasVerifiedPhotos: false,
      hasLocationVerified: false,
      totalPhotos: 0,
      verifiedPhotos: 0,
      photosByLevel: { 0: 0, 1: 0, 2: 0, 3: 0 },
    };
  }

  // For now, use job without precise location (location verification will fail gracefully)
  const jobWithLocation: JobWithLocation = {
    id: jobSimple.id,
    arrived_at: jobSimple.arrived_at,
    departed_at: jobSimple.departed_at,
    // Location would come from job address or customer address
    // This requires schema that stores lat/lon on jobs
    job_address_latitude: undefined,
    job_address_longitude: undefined,
  };

  // Get all photos for this job
  const { data: photos, error: photosError } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .is('locked_at', null);

  if (photosError) {
    logger.error({
      msg: 'Failed to get job photos for verification',
      jobId,
      error: photosError,
    });
    return {
      hasVerifiedPhotos: false,
      hasLocationVerified: false,
      totalPhotos: 0,
      verifiedPhotos: 0,
      photosByLevel: { 0: 0, 1: 0, 2: 0, 3: 0 },
    };
  }

  if (!photos || photos.length === 0) {
    return {
      hasVerifiedPhotos: false,
      hasLocationVerified: false,
      totalPhotos: 0,
      verifiedPhotos: 0,
      photosByLevel: { 0: 0, 1: 0, 2: 0, 3: 0 },
    };
  }

  const summary: PhotoVerificationSummary = {
    hasVerifiedPhotos: false,
    hasLocationVerified: false,
    totalPhotos: photos.length,
    verifiedPhotos: 0,
    photosByLevel: { 0: 0, 1: 0, 2: 0, 3: 0 },
  };

  // Verify each photo and update in database
  for (const photo of photos) {
    const result = verifyPhoto(
      {
        taken_at: photo.taken_at,
        latitude: photo.latitude,
        longitude: photo.longitude,
        upload_source: photo.upload_source as PhotoUploadSource,
      },
      jobWithLocation
    );

    // Update photo with verification results
    await supabase
      .from('job_photos')
      .update({
        verification_level: result.verification_level,
        source_verified: result.source_verified,
        time_verified: result.time_verified,
        location_verified: result.location_verified,
        distance_meters: result.distance_meters,
        capture_time: photo.taken_at,
      })
      .eq('id', photo.id);

    // Update summary
    summary.photosByLevel[result.verification_level]++;
    if (result.verification_level > 0) {
      summary.verifiedPhotos++;
      summary.hasVerifiedPhotos = true;
    }
    if (result.location_verified) {
      summary.hasLocationVerified = true;
    }
  }

  logger.info({
    msg: 'Job photos verified',
    jobId,
    totalPhotos: summary.totalPhotos,
    verifiedPhotos: summary.verifiedPhotos,
    photosByLevel: summary.photosByLevel,
  });

  return summary;
}

/**
 * Get verified photos for a Proof of Work (for public display)
 */
export async function getVerifiedPhotosForPow(
  jobId: string
): Promise<VerifiedJobPhoto[]> {
  const supabase = createAdminClient();

  const { data: photos, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .gte('verification_level', 1) // Only verified photos
    .order('display_order', { ascending: true });

  if (error) {
    logger.error({
      msg: 'Failed to get verified photos for PoW',
      jobId,
      error,
    });
    return [];
  }

  return photos as VerifiedJobPhoto[];
}

/**
 * Check for duplicate photos using perceptual hash
 * Returns IDs of photos that appear to be duplicates
 */
export async function findDuplicatePhotos(
  businessId: string,
  perceptualHash: string,
  excludePhotoId?: string
): Promise<string[]> {
  const supabase = createAdminClient();

  // Note: This is a simplified check - true perceptual hash comparison
  // would use Hamming distance, but for exact matches we can use equality
  let query = supabase
    .from('job_photos')
    .select('id')
    .eq('business_id', businessId)
    .eq('perceptual_hash', perceptualHash);

  if (excludePhotoId) {
    query = query.neq('id', excludePhotoId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({
      msg: 'Failed to find duplicate photos',
      businessId,
      error,
    });
    return [];
  }

  return data?.map((p) => p.id) || [];
}

/**
 * Generate perceptual hash for an image
 * This is a placeholder - actual implementation would use sharp + custom phash
 */
export async function generatePerceptualHash(
  _imageUrl: string
): Promise<string | null> {
  // TODO: Implement actual perceptual hashing using sharp
  // For now, return null to indicate no hash
  // Real implementation would:
  // 1. Fetch image from URL
  // 2. Resize to 8x8 grayscale
  // 3. Compute DCT
  // 4. Generate 64-bit hash from DCT coefficients
  return null;
}
