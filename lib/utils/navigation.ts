// =====================================================
// NAVIGATION UTILITIES - Address Links & Maps
// =====================================================

export function getNavigationUrl(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  // If we have coordinates, use them (more accurate)
  if (latitude && longitude) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&to=${latitude},${longitude}`;
  }

  // Fallback to address string
  const encoded = encodeURIComponent(address);
  return `https://www.openstreetmap.org/search?query=${encoded}`;
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
  const candidates: any[] = [];
  if (typeof globalThis !== 'undefined') candidates.push((globalThis as any).navigator);
  // Node global for tests
  // @ts-ignore
  if (typeof global !== 'undefined') candidates.push((global as any).navigator);
  if (typeof window !== 'undefined') candidates.push((window as any).navigator);
  if (typeof navigator !== 'undefined') candidates.push(navigator as any);
  for (const nav of candidates) {
    const ua = nav?.userAgent;
    if (typeof ua === 'string' && /iPad|iPhone|iPod/i.test(ua)) {
      return true;
    }
  }
  return false;
}

/**
 * Get smart navigation URL based on platform
 */
export function getSmartNavigationUrl(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  const ua: string =
    (typeof global !== 'undefined' && (global as any).navigator?.userAgent) ||
    (typeof globalThis !== 'undefined' && (globalThis as any).navigator?.userAgent) ||
    (typeof navigator !== 'undefined' ? (navigator as any).userAgent : '');
  if (typeof ua === 'string' && /iPad|iPhone|iPod/i.test(ua)) {
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
