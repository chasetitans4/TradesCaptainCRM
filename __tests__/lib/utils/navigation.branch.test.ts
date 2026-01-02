/**
 * Navigation Utils Branch Coverage Tests
 *
 * Tests for edge cases and branches to achieve 85%+ branch coverage.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('utils/navigation branch coverage', () => {
  let originalGlobal: any;
  let originalGlobalThis: any;
  let originalWindow: any;
  let originalNavigator: any;

  beforeEach(() => {
    // Save all navigator references
    originalGlobal = (global as any).navigator;
    originalGlobalThis = (globalThis as any).navigator;
    if (typeof window !== 'undefined') {
      originalWindow = (window as any).navigator?.userAgent;
    }
    if (typeof navigator !== 'undefined') {
      originalNavigator = (navigator as any).userAgent;
    }
    // Reset modules for fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore all navigator references
    if (originalGlobal !== undefined) {
      (global as any).navigator = originalGlobal;
    } else {
      delete (global as any).navigator;
    }
    if (originalGlobalThis !== undefined) {
      (globalThis as any).navigator = originalGlobalThis;
    } else {
      delete (globalThis as any).navigator;
    }
    if (typeof window !== 'undefined' && originalWindow !== undefined) {
      Object.defineProperty((window as any).navigator, 'userAgent', { value: originalWindow, configurable: true });
    }
    jest.resetModules();
  });

  describe('getNavigationUrl', () => {
    it('uses coordinates when both lat and lng are provided', () => {
      const { getNavigationUrl } = require('@/lib/utils/navigation');
      const url = getNavigationUrl('123 Main St', 40.7128, -74.0060);
      expect(url).toContain('directions');
      expect(url).toContain('40.7128,-74.006');
    });

    it('falls back to address when coordinates are not provided', () => {
      const { getNavigationUrl } = require('@/lib/utils/navigation');
      const url = getNavigationUrl('123 Main St');
      expect(url).toContain('search?query=123%20Main%20St');
    });

    it('falls back to address when only latitude is provided', () => {
      const { getNavigationUrl } = require('@/lib/utils/navigation');
      const url = getNavigationUrl('123 Main St', 40.7128);
      expect(url).toContain('search?query=123%20Main%20St');
    });

    it('falls back to address when only longitude is provided', () => {
      const { getNavigationUrl } = require('@/lib/utils/navigation');
      const url = getNavigationUrl('123 Main St', undefined, -74.0060);
      expect(url).toContain('search?query=123%20Main%20St');
    });
  });

  describe('getAppleMapsUrl', () => {
    it('uses coordinates when both lat and lng are provided', () => {
      const { getAppleMapsUrl } = require('@/lib/utils/navigation');
      const url = getAppleMapsUrl('123 Main St', 40.7128, -74.0060);
      expect(url).toContain('daddr=40.7128,-74.006');
    });

    it('falls back to address when coordinates not provided', () => {
      const { getAppleMapsUrl } = require('@/lib/utils/navigation');
      const url = getAppleMapsUrl('123 Main St');
      expect(url).toContain('daddr=123%20Main%20St');
    });
  });

  describe('isIOS', () => {
    it('returns false when no navigator is defined', () => {
      delete (global as any).navigator;
      delete (globalThis as any).navigator;
      const { isIOS } = require('@/lib/utils/navigation');
      expect(isIOS()).toBe(false);
    });

    it('returns false when navigator.userAgent is not a string', () => {
      (global as any).navigator = { userAgent: 123 };
      (globalThis as any).navigator = { userAgent: 123 };
      const { isIOS } = require('@/lib/utils/navigation');
      expect(isIOS()).toBe(false);
    });

    it('returns false for Android device', () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 10)' };
      (globalThis as any).navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 10)' };
      if (typeof window !== 'undefined' && (window as any).navigator) {
        Object.defineProperty((window as any).navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10)', configurable: true });
      }
      const { isIOS } = require('@/lib/utils/navigation');
      expect(isIOS()).toBe(false);
    });

    it('returns true for iPhone', () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' };
      (globalThis as any).navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' };
      if (typeof window !== 'undefined' && (window as any).navigator) {
        Object.defineProperty((window as any).navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)', configurable: true });
      }
      const { isIOS } = require('@/lib/utils/navigation');
      expect(isIOS()).toBe(true);
    });
  });

  describe('getSmartNavigationUrl', () => {
    it('returns OpenStreetMap URL for non-iOS device with coordinates', () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' };
      (globalThis as any).navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' };
      if (typeof window !== 'undefined' && (window as any).navigator) {
        Object.defineProperty((window as any).navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0)', configurable: true });
      }
      const { getSmartNavigationUrl } = require('@/lib/utils/navigation');
      const url = getSmartNavigationUrl('123 Main St', 40.7128, -74.0060);
      expect(url).toContain('openstreetmap.org');
      expect(url).toContain('directions');
    });

    it('returns Apple Maps URL for iOS device', () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0)' };
      (globalThis as any).navigator = { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0)' };
      if (typeof window !== 'undefined' && (window as any).navigator) {
        Object.defineProperty((window as any).navigator, 'userAgent', { value: 'Mozilla/5.0 (iPad; CPU OS 14_0)', configurable: true });
      }
      const { getSmartNavigationUrl } = require('@/lib/utils/navigation');
      const url = getSmartNavigationUrl('123 Main St', 40.7128, -74.0060);
      expect(url).toContain('maps.apple.com');
    });

    it('returns OpenStreetMap URL when navigator is undefined', () => {
      delete (global as any).navigator;
      delete (globalThis as any).navigator;
      const { getSmartNavigationUrl } = require('@/lib/utils/navigation');
      const url = getSmartNavigationUrl('123 Main St');
      expect(url).toContain('openstreetmap.org');
    });

    it('returns OpenStreetMap URL when userAgent is not a string', () => {
      (global as any).navigator = { userAgent: null };
      (globalThis as any).navigator = { userAgent: null };
      const { getSmartNavigationUrl } = require('@/lib/utils/navigation');
      const url = getSmartNavigationUrl('123 Main St');
      expect(url).toContain('openstreetmap.org');
    });
  });

  describe('formatFullAddress', () => {
    it('uses address when both address and address_line1 are provided', () => {
      const { formatFullAddress } = require('@/lib/utils/navigation');
      const result = formatFullAddress({
        address: '456 Oak Ave',
        address_line1: '123 Main St',
        city: 'City',
        state: 'CA',
        zip: '90210',
      });
      expect(result).toBe('456 Oak Ave, City, CA, 90210');
    });

    it('uses address_line1 when address is not provided', () => {
      const { formatFullAddress } = require('@/lib/utils/navigation');
      const result = formatFullAddress({
        address_line1: '123 Main St',
        city: 'City',
        state: 'CA',
        zip: '90210',
      });
      expect(result).toBe('123 Main St, City, CA, 90210');
    });

    it('filters out null and undefined components', () => {
      const { formatFullAddress } = require('@/lib/utils/navigation');
      const result = formatFullAddress({
        address: '123 Main St',
        city: null,
        state: 'CA',
        zip: undefined,
      });
      expect(result).toBe('123 Main St, CA');
    });

    it('returns empty string when all components are null', () => {
      const { formatFullAddress } = require('@/lib/utils/navigation');
      const result = formatFullAddress({
        address: null,
        address_line1: null,
        city: null,
        state: null,
        zip: null,
      });
      expect(result).toBe('');
    });
  });

  describe('haversineDistance', () => {
    it('calculates distance between two points', () => {
      const { haversineDistance } = require('@/lib/utils/navigation');
      // Distance from NYC to LA is roughly 2,451 miles
      const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('returns 0 for same point', () => {
      const { haversineDistance } = require('@/lib/utils/navigation');
      const distance = haversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBeCloseTo(0, 5);
    });
  });

  describe('estimateDriveTime', () => {
    it('estimates drive time based on distance', () => {
      const { estimateDriveTime } = require('@/lib/utils/navigation');
      // 30 miles at 30 mph = 60 minutes
      const time = estimateDriveTime(30);
      expect(time).toBe(60);
    });

    it('rounds to nearest minute', () => {
      const { estimateDriveTime } = require('@/lib/utils/navigation');
      // 35 miles at 30 mph = 70 minutes
      const time = estimateDriveTime(35);
      expect(time).toBe(70);
    });

    it('returns 0 for 0 distance', () => {
      const { estimateDriveTime } = require('@/lib/utils/navigation');
      const time = estimateDriveTime(0);
      expect(time).toBe(0);
    });
  });
});
