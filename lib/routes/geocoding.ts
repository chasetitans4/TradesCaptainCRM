// =====================================================
// GEOCODING LIBRARY - MAPBOX INTEGRATION
// Address geocoding utilities for route optimization
// Uses caching to minimize API calls and reduce costs
// =====================================================

import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

const geocodingLogger = logger.child({ context: 'geocoding' });

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
}

export interface GeocodingOptions {
  country?: string;
  proximity?: {
    latitude: number;
    longitude: number;
  };
  skipCache?: boolean;
}

export interface DirectionsResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
}

// Mapbox configuration
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

/**
 * Check if Mapbox is configured
 */
export function isMapboxConfigured(): boolean {
  return !!MAPBOX_ACCESS_TOKEN;
}

/**
 * Generate a hash for address caching
 */
function hashAddress(address: string): string {
  const normalized = normalizeAddress(address).toLowerCase();
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Check geocode cache for existing result
 */
async function checkGeocodeCache(addressHash: string): Promise<GeocodingResult | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('geocode_cache')
      .select('latitude, longitude, formatted_address, place_id, hit_count')
      .eq('address_hash', addressHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (data) {
      // Increment hit count (fire and forget)
      supabase
        .from('geocode_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('address_hash', addressHash)
        .then(() => {});

      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        formattedAddress: data.formatted_address,
        placeId: data.place_id,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save geocode result to cache
 */
async function saveToGeocodeCache(
  addressHash: string,
  originalAddress: string,
  result: GeocodingResult
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('geocode_cache').upsert({
      address_hash: addressHash,
      original_address: originalAddress,
      latitude: result.latitude,
      longitude: result.longitude,
      formatted_address: result.formattedAddress,
      place_id: result.placeId,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    });
  } catch (error) {
    geocodingLogger.warn({
      msg: 'Failed to cache geocode result',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Geocode an address to coordinates using Mapbox
 */
export async function geocodeAddress(
  address: string,
  options?: GeocodingOptions
): Promise<GeocodingResult | null> {
  if (!isMapboxConfigured()) {
    geocodingLogger.warn({ msg: 'Mapbox not configured - geocoding unavailable' });
    return null;
  }

  if (!address || !isValidAddress(address)) {
    return null;
  }

  const addressHash = hashAddress(address);

  // Check cache first (unless skipped)
  if (!options?.skipCache) {
    const cached = await checkGeocodeCache(addressHash);
    if (cached) {
      geocodingLogger.debug({ msg: 'Geocode cache hit', address });
      return cached;
    }
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    let url = `${MAPBOX_GEOCODING_URL}/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

    // Add country filter if provided
    if (options?.country) {
      url += `&country=${options.country}`;
    }

    // Add proximity bias if provided (helps with local searches)
    if (options?.proximity) {
      url += `&proximity=${options.proximity.longitude},${options.proximity.latitude}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      geocodingLogger.error({
        msg: 'Mapbox geocoding API error',
        status: response.status,
        address,
      });
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      geocodingLogger.warn({ msg: 'No geocoding results found', address });
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;

    const result: GeocodingResult = {
      latitude,
      longitude,
      formattedAddress: feature.place_name,
      placeId: feature.id,
    };

    // Cache the result
    await saveToGeocodeCache(addressHash, address, result);

    geocodingLogger.debug({
      msg: 'Geocoded address via Mapbox',
      address,
      latitude,
      longitude,
    });

    return result;
  } catch (error) {
    geocodingLogger.error({
      msg: 'Geocoding error',
      error: error instanceof Error ? error.message : 'Unknown error',
      address,
    });
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address using Mapbox
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!isMapboxConfigured()) {
    geocodingLogger.warn({ msg: 'Mapbox not configured - reverse geocoding unavailable' });
    return null;
  }

  try {
    const url = `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1&types=address`;

    const response = await fetch(url);

    if (!response.ok) {
      geocodingLogger.error({
        msg: 'Mapbox reverse geocoding API error',
        status: response.status,
      });
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      // Try with broader types if no address found
      const fallbackUrl = `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();

      if (fallbackData.features && fallbackData.features.length > 0) {
        return fallbackData.features[0].place_name;
      }
      return null;
    }

    return data.features[0].place_name;
  } catch (error) {
    geocodingLogger.error({
      msg: 'Reverse geocoding error',
      error: error instanceof Error ? error.message : 'Unknown error',
      latitude,
      longitude,
    });
    return null;
  }
}

/**
 * Get driving directions between two points using Mapbox
 * Returns distance and duration
 */
export async function getDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DirectionsResult | null> {
  if (!isMapboxConfigured()) {
    // Fall back to Haversine calculation
    const haversineDistance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
    return {
      distanceMeters: haversineDistance * 1609.34,
      distanceMiles: haversineDistance,
      durationSeconds: Math.round((haversineDistance / 30) * 3600), // Assume 30mph average
      durationMinutes: Math.round((haversineDistance / 30) * 60),
    };
  }

  try {
    const coordinates = `${fromLng},${fromLat};${toLng},${toLat}`;
    const url = `${MAPBOX_DIRECTIONS_URL}/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&overview=false`;

    const response = await fetch(url);

    if (!response.ok) {
      geocodingLogger.error({
        msg: 'Mapbox directions API error',
        status: response.status,
      });
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = route.distance;
    const durationSeconds = route.duration;

    return {
      distanceMeters,
      distanceMiles: distanceMeters / 1609.34,
      durationSeconds,
      durationMinutes: Math.round(durationSeconds / 60),
    };
  } catch (error) {
    geocodingLogger.error({
      msg: 'Directions error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Calculate distance using Haversine formula (fallback when Mapbox unavailable)
 * Returns distance in miles
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Validate an address format
 */
export function isValidAddress(address: string): boolean {
  if (!address || address.trim().length < 5) return false;
  // Basic validation - check if address has minimum required parts
  const parts = address.split(',').map((p) => p.trim());
  return parts.length >= 2 && parts.every((p) => p.length > 0);
}

/**
 * Normalize an address string
 */
export function normalizeAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\s*,\s*/g, ', ');
}

/**
 * Build full address string from parts
 */
export function buildAddressString(parts: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const components = [];
  if (parts.address) components.push(parts.address);
  if (parts.city) components.push(parts.city);
  if (parts.state) components.push(parts.state);
  if (parts.zip) components.push(parts.zip);
  return components.join(', ');
}
