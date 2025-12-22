// =====================================================
// GEOCODING LIBRARY
// Address to coordinates conversion and caching
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface GeocodedAddress {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  formatted_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  created_at: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocode an address using Google Maps API
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key not configured');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.[0]) {
      console.error('Geocoding failed:', data.status);
      return null;
    }

    const location = data.results[0].geometry.location;

    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Get cached geocoded address or geocode and cache
 */
export async function getOrGeocodeAddress(
  businessId: string,
  address: string
): Promise<GeocodedAddress | null> {
  const supabase = await createClient();

  // Normalize address for comparison
  const normalizedAddress = address.toLowerCase().trim();

  // Check cache
  const { data: cached } = await supabase
    .from('geocoded_addresses')
    .select('*')
    .eq('business_id', businessId)
    .ilike('address', normalizedAddress)
    .single();

  if (cached) {
    return cached;
  }

  // Geocode the address
  const coords = await geocodeAddress(address);

  if (!coords) {
    return null;
  }

  // Cache the result
  const { data: saved, error } = await supabase
    .from('geocoded_addresses')
    .insert({
      business_id: businessId,
      address: normalizedAddress,
      latitude: coords.latitude,
      longitude: coords.longitude,
    })
    .select()
    .single();

  if (error) {
    console.error('Error caching geocoded address:', error);
    // Return coordinates even if caching fails
    return {
      id: '',
      address: normalizedAddress,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_at: new Date().toISOString(),
    };
  }

  return saved;
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocodeAddresses(
  businessId: string,
  addresses: string[]
): Promise<Map<string, Coordinates>> {
  const results = new Map<string, Coordinates>();

  // Process in parallel with rate limiting (10 per batch)
  const batchSize = 10;

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const promises = batch.map(async (address) => {
      const result = await getOrGeocodeAddress(businessId, address);
      if (result) {
        results.set(address, {
          latitude: result.latitude,
          longitude: result.longitude,
        });
      }
    });

    await Promise.all(promises);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < addresses.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in miles
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get estimated driving time between two points (rough estimate)
 * Assumes average speed of 30 mph in urban areas
 */
export function estimateDrivingTime(distanceMiles: number): number {
  const averageSpeedMph = 30;
  return Math.round((distanceMiles / averageSpeedMph) * 60); // Returns minutes
}
