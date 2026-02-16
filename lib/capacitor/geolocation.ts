/**
 * Native Geolocation Wrapper
 *
 * Provides a unified interface for GPS access across native and web platforms.
 * On native platforms, uses Capacitor Geolocation plugin.
 * On web, falls back to standard Geolocation API.
 */

import { Geolocation, type Position } from '@capacitor/geolocation';
import { isNative, isPluginAvailable } from './platform';

export interface GeoPosition {
  /** Latitude in degrees */
  latitude: number;
  /** Longitude in degrees */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
  /** Altitude in meters (if available) */
  altitude?: number;
  /** Altitude accuracy in meters (if available) */
  altitudeAccuracy?: number;
  /** Heading in degrees (if available) */
  heading?: number;
  /** Speed in m/s (if available) */
  speed?: number;
  /** Timestamp of the position */
  timestamp: number;
}

export interface GeoError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
}

export interface GeoResult {
  success: boolean;
  position?: GeoPosition;
  error?: GeoError;
}

export interface GeoOptions {
  /** Enable high accuracy mode (uses more battery) */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position in ms */
  maximumAge?: number;
  /** Timeout in ms */
  timeout?: number;
}

const defaultOptions: GeoOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

/**
 * Check if native geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  if (isNative()) {
    return isPluginAvailable('Geolocation');
  }
  return 'geolocation' in navigator;
}

/**
 * Request geolocation permissions
 * @returns Whether permission was granted
 */
export async function requestGeolocationPermission(): Promise<boolean> {
  if (isNative() && isPluginAvailable('Geolocation')) {
    try {
      const permission = await Geolocation.requestPermissions();
      return permission.location === 'granted';
    } catch (error) {
      console.error('[Geolocation] Permission request failed:', error);
      return false;
    }
  }

  // On web, permission is requested when we try to get position
  // Try to get position to trigger permission prompt
  try {
    await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check geolocation permission status
 */
export async function checkGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (isNative() && isPluginAvailable('Geolocation')) {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location === 'prompt-with-rationale') {
        return 'prompt';
      }
      return permission.location;
    } catch (error) {
      console.error('[Geolocation] Permission check failed:', error);
      return 'prompt';
    }
  }

  // Web API check
  if ('permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch {
      return 'prompt';
    }
  }

  return 'prompt';
}

/**
 * Get current position
 */
export async function getCurrentPosition(options: GeoOptions = {}): Promise<GeoResult> {
  const mergedOptions = { ...defaultOptions, ...options };

  if (!isGeolocationAvailable()) {
    return {
      success: false,
      error: {
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not available on this device',
      },
    };
  }

  // Native geolocation
  if (isNative() && isPluginAvailable('Geolocation')) {
    return getNativePosition(mergedOptions);
  }

  // Web fallback
  return getWebPosition(mergedOptions);
}

/**
 * Native geolocation using Capacitor
 */
async function getNativePosition(options: GeoOptions): Promise<GeoResult> {
  try {
    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy,
      maximumAge: options.maximumAge,
      timeout: options.timeout,
    });

    return {
      success: true,
      position: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ?? undefined,
        timestamp: position.timestamp,
      },
    };
  } catch (error) {
    console.error('[Geolocation] Native position failed:', error);
    return {
      success: false,
      error: parseGeolocationError(error),
    };
  }
}

/**
 * Web fallback using navigator.geolocation
 */
async function getWebPosition(options: GeoOptions): Promise<GeoResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: position.timestamp,
          },
        });
      },
      (error) => {
        resolve({
          success: false,
          error: parseGeolocationError(error),
        });
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        maximumAge: options.maximumAge,
        timeout: options.timeout,
      }
    );
  });
}

/**
 * Parse geolocation error to standardized format
 */
function parseGeolocationError(error: unknown): GeoError {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return { code: 'PERMISSION_DENIED', message: 'User denied geolocation permission' };
      case error.POSITION_UNAVAILABLE:
        return { code: 'POSITION_UNAVAILABLE', message: 'Position unavailable' };
      case error.TIMEOUT:
        return { code: 'TIMEOUT', message: 'Geolocation request timed out' };
    }
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }

  return { code: 'UNKNOWN', message: 'Unknown geolocation error' };
}

/**
 * Watch position changes (continuous tracking)
 * @returns Callback ID to stop watching
 */
export async function watchPosition(
  callback: (result: GeoResult) => void,
  options: GeoOptions = {}
): Promise<string | null> {
  const mergedOptions = { ...defaultOptions, ...options };

  if (!isGeolocationAvailable()) {
    callback({
      success: false,
      error: {
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not available on this device',
      },
    });
    return null;
  }

  // Native watch
  if (isNative() && isPluginAvailable('Geolocation')) {
    try {
      const watchId = await Geolocation.watchPosition(mergedOptions, (position, err) => {
        if (err) {
          callback({
            success: false,
            error: parseGeolocationError(err),
          });
        } else if (position) {
          callback({
            success: true,
            position: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? undefined,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
              heading: position.coords.heading ?? undefined,
              speed: position.coords.speed ?? undefined,
              timestamp: position.timestamp,
            },
          });
        }
      });
      return watchId;
    } catch (error) {
      callback({
        success: false,
        error: parseGeolocationError(error),
      });
      return null;
    }
  }

  // Web fallback
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        success: true,
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: position.timestamp,
        },
      });
    },
    (error) => {
      callback({
        success: false,
        error: parseGeolocationError(error),
      });
    },
    {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      maximumAge: mergedOptions.maximumAge,
      timeout: mergedOptions.timeout,
    }
  );

  return watchId.toString();
}

/**
 * Stop watching position
 */
export async function clearWatch(watchId: string): Promise<void> {
  if (isNative() && isPluginAvailable('Geolocation')) {
    await Geolocation.clearWatch({ id: watchId });
  } else {
    navigator.geolocation.clearWatch(parseInt(watchId, 10));
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
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
 * Check if a position is within a radius of a target
 * @returns true if within radius
 */
export function isWithinRadius(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= radiusMeters;
}
