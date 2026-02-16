/**
 * ETA Calculator
 *
 * Per Design Constitution Section 3.12.3 - ETA Calculation:
 * - Get current position (GPS)
 * - Calculate route to job address
 * - Estimate arrival time (using traffic data if available)
 * - Pre-fill template with rounded ETA ("around 10:30 AM")
 *
 * Fallback: If location unavailable, prompt for manual ETA input.
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface ETAResult {
  /** Estimated time of arrival as Date */
  eta: Date;
  /** Duration in minutes */
  durationMinutes: number;
  /** Distance in miles */
  distanceMiles: number;
  /** Formatted ETA string for display */
  formattedETA: string;
  /** Formatted duration string */
  formattedDuration: string;
  /** Whether this is an estimate (vs actual API data) */
  isEstimate: boolean;
}

/**
 * Get current device location
 */
export async function getCurrentLocation(): Promise<Location | null> {
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
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(from: Location, to: Location): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance
 * Uses average speed assumptions for different distance ranges
 */
export function estimateTravelTime(distanceMiles: number): number {
  // Assume different average speeds based on distance
  // Short trips (city): ~20 mph average
  // Medium trips (suburbs): ~30 mph average
  // Long trips (highway): ~45 mph average

  let avgSpeed: number;

  if (distanceMiles < 5) {
    avgSpeed = 20; // City driving
  } else if (distanceMiles < 20) {
    avgSpeed = 30; // Mixed driving
  } else {
    avgSpeed = 45; // Highway driving
  }

  // Add buffer for stops, parking, etc.
  const baseDuration = (distanceMiles / avgSpeed) * 60; // Convert to minutes
  const buffer = Math.min(10, baseDuration * 0.2); // 20% buffer, max 10 minutes

  return Math.ceil(baseDuration + buffer);
}

/**
 * Calculate ETA to a destination
 *
 * @param destination - Destination coordinates or address
 * @param currentLocation - Optional current location (will be fetched if not provided)
 */
export async function calculateETA(
  destination: Location | string,
  currentLocation?: Location | null
): Promise<ETAResult | null> {
  // Get current location if not provided
  const from = currentLocation ?? (await getCurrentLocation());
  if (!from) {
    return null;
  }

  // If destination is a string (address), we'd need to geocode it
  // For now, we'll return null for string addresses
  // In production, this would call a geocoding API
  if (typeof destination === 'string') {
    console.warn('Address geocoding not implemented. Please provide coordinates.');
    return null;
  }

  // Calculate distance
  const distanceMiles = calculateDistance(from, destination);

  // Estimate travel time
  const durationMinutes = estimateTravelTime(distanceMiles);

  // Calculate ETA
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + durationMinutes);

  // Round ETA to nearest 5 minutes
  const roundedEta = roundToNearest5Minutes(eta);

  return {
    eta: roundedEta,
    durationMinutes,
    distanceMiles,
    formattedETA: formatETA(roundedEta),
    formattedDuration: formatDuration(durationMinutes),
    isEstimate: true,
  };
}

/**
 * Round time to nearest 5 minutes
 */
function roundToNearest5Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 5;

  if (remainder >= 3) {
    rounded.setMinutes(minutes + (5 - remainder));
  } else {
    rounded.setMinutes(minutes - remainder);
  }

  rounded.setSeconds(0);
  rounded.setMilliseconds(0);

  return rounded;
}

/**
 * Format ETA for display
 * Per Constitution Section 3.12.3: "around 10:30 AM" or "in about 15 minutes"
 */
export function formatETA(eta: Date): string {
  const now = new Date();
  const diffMinutes = Math.round((eta.getTime() - now.getTime()) / 60000);

  // If less than 60 minutes, show relative time
  if (diffMinutes < 60) {
    return `in about ${diffMinutes} minutes`;
  }

  // Otherwise show absolute time
  return `around ${eta.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Create a manual ETA from user input (minutes from now)
 */
export function createManualETA(minutesFromNow: number): ETAResult {
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + minutesFromNow);
  const roundedEta = roundToNearest5Minutes(eta);

  return {
    eta: roundedEta,
    durationMinutes: minutesFromNow,
    distanceMiles: 0, // Unknown
    formattedETA: formatETA(roundedEta),
    formattedDuration: formatDuration(minutesFromNow),
    isEstimate: true,
  };
}

/**
 * Quick ETA options for manual selection
 */
export const QUICK_ETA_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
];
