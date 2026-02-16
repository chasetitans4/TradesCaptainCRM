/**
 * Photo Metadata Utilities
 *
 * Per Design Constitution Section 3.10.2 - Automatic Metadata Tagging:
 * Every photo is automatically tagged with:
 * - Job ID (from context) - Not editable
 * - Timestamp (device clock) - Not editable
 * - GPS coordinates (device location) - Not editable
 * - Technician ID (logged-in user) - Not editable
 * - Equipment ID (if applicable) - Editable
 * - Photo type (Before/After/Issue/Resolution) - Editable
 *
 * No manual entry required for core metadata.
 */

export type PhotoType = 'before' | 'after' | 'during' | 'issue' | 'resolution' | 'general';

export interface PhotoMetadata {
  /** Job ID from context */
  jobId: string;
  /** ISO timestamp when photo was taken */
  timestamp: string;
  /** GPS coordinates if available */
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  /** ID of the technician who took the photo */
  technicianId: string;
  /** Technician name for display */
  technicianName?: string;
  /** Equipment ID if photo is of specific equipment */
  equipmentId?: string;
  /** Type of photo for categorization */
  photoType: PhotoType;
  /** ID of paired "before" photo (for "after" photos) */
  pairedWithId?: string;
  /** Optional caption */
  caption?: string;
}

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Get current GPS location
 * Returns null if location is not available or denied
 */
export async function getCurrentLocation(): Promise<LocationResult | null> {
  // Check if geolocation is available
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation not available');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    );
  });
}

/**
 * Create photo metadata with auto-populated fields
 *
 * Per Constitution Section 3.10.2:
 * "No manual entry required for core metadata"
 */
export async function createPhotoMetadata(
  context: {
    jobId: string;
    technicianId: string;
    technicianName?: string;
    photoType?: PhotoType;
    equipmentId?: string;
    pairedWithId?: string;
  },
  captureLocation: boolean = true
): Promise<PhotoMetadata> {
  // Get location in parallel if requested
  const locationPromise = captureLocation ? getCurrentLocation() : Promise.resolve(null);

  const location = await locationPromise;

  return {
    jobId: context.jobId,
    timestamp: new Date().toISOString(),
    location: location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        }
      : undefined,
    technicianId: context.technicianId,
    technicianName: context.technicianName,
    equipmentId: context.equipmentId,
    photoType: context.photoType || 'general',
    pairedWithId: context.pairedWithId,
  };
}

/**
 * Photo type labels for UI display
 */
export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: 'Before',
  after: 'After',
  during: 'During Work',
  issue: 'Issue Found',
  resolution: 'Resolution',
  general: 'General',
};

/**
 * Photo type descriptions for UI
 */
export const PHOTO_TYPE_DESCRIPTIONS: Record<PhotoType, string> = {
  before: 'Photo taken before starting work',
  after: 'Photo taken after completing work',
  during: 'Photo taken during the job',
  issue: 'Photo documenting an issue or problem',
  resolution: 'Photo showing how an issue was resolved',
  general: 'General job documentation',
};

/**
 * Check if a photo type should be paired (before/after)
 */
export function isPairedPhotoType(type: PhotoType): boolean {
  return type === 'before' || type === 'after';
}

/**
 * Get the complementary photo type for pairing
 */
export function getComplementaryType(type: PhotoType): PhotoType | null {
  if (type === 'before') return 'after';
  if (type === 'after') return 'before';
  return null;
}

/**
 * Format location for display
 */
export function formatLocation(
  location: { latitude: number; longitude: number } | undefined
): string {
  if (!location) {
    return 'Location not available';
  }
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

/**
 * Create a Google Maps URL for a location
 */
export function getLocationMapUrl(
  location: { latitude: number; longitude: number }
): string {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

/**
 * Validate metadata before upload
 */
export function validateMetadata(metadata: PhotoMetadata): string[] {
  const errors: string[] = [];

  if (!metadata.jobId) {
    errors.push('Job ID is required');
  }

  if (!metadata.technicianId) {
    errors.push('Technician ID is required');
  }

  if (!metadata.timestamp) {
    errors.push('Timestamp is required');
  }

  if (!metadata.photoType) {
    errors.push('Photo type is required');
  }

  return errors;
}
