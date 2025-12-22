// =====================================================
// NAVIGATION UTILITIES - Address Links & Maps
// =====================================================

/**
 * Get Google Maps navigation URL
 */
export function getNavigationUrl(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  // If we have coordinates, use them (more accurate)
  if (latitude && longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  // Fallback to address string
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

/**
 * Get Apple Maps URL (for iOS)
 */
export function getAppleMapsUrl(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  if (latitude && longitude) {
    return `https://maps.apple.com/?daddr=${latitude},${longitude}`;
  }
  return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
}

/**
 * Detect if running on iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Get smart navigation URL based on platform
 */
export function getSmartNavigationUrl(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  if (isIOS()) {
    return getAppleMapsUrl(address, latitude, longitude);
  }
  return getNavigationUrl(address, latitude, longitude);
}

/**
 * Format a full address from components
 */
export function formatFullAddress(components: {
  address?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const parts = [
    components.address || components.address_line1,
    components.city,
    components.state,
    components.zip,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Calculate haversine distance between two points (in miles)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
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
 * Estimate drive time based on distance (rough estimate)
 * Assumes 30 mph average speed
 */
export function estimateDriveTime(distanceMiles: number): number {
  return Math.round((distanceMiles / 30) * 60); // Minutes
}
