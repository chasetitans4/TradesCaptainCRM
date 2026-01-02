// =====================================================
// BOOKING SETTINGS TESTS
// Tests for lib/booking/settings.ts
// =====================================================


// Mock the supabase client
jest.mock('@/lib/supabase/server', () => {
  const mockData: any = { current: null };
  const mockError: any = { current: null };

  return {
    createClient: jest.fn(async () => ({
      from: (table: string) => {
        const api: any = {
          _table: table,
          _mockData: mockData,
          _mockError: mockError,
        };

        api.select = jest.fn(() => api);
        api.eq = jest.fn(() => api);
        api.neq = jest.fn(() => api);
        api.not = jest.fn(() => api);
        api.upsert = jest.fn(() => api);

        api.single = jest.fn(async () => ({
          data: mockData.current,
          error: mockError.current,
        }));

        api.then = async (resolve: any) => resolve({
          data: mockData.current,
          error: mockError.current,
        });

        return api;
      },
    })),
    __setMockData: (data: any) => { mockData.current = data; },
    __setMockError: (error: any) => { mockError.current = error; },
    __reset: () => { mockData.current = null; mockError.current = null; },
  };
});

const supabaseMock = require('@/lib/supabase/server');

describe('booking/settings', () => {
  beforeEach(() => {
    supabaseMock.__reset();
  });

  describe('getBookingSettings', () => {
    it('returns null when no data', async () => {
      supabaseMock.__setMockData(null);
      const { getBookingSettings } = require('@/lib/booking/settings');
      const result = await getBookingSettings('b1');
      expect(result).toBeNull();
    });

    it('returns structured settings when data exists', async () => {
      supabaseMock.__setMockData({
        id: 's1',
        business_id: 'b1',
        is_enabled: true,
        booking_url_slug: 'acme',
        lead_time_hours: 24,
        max_days_ahead: 30,
        buffer_minutes: 15,
        slot_duration_minutes: 60,
        available_days: [1, 2, 3, 4, 5],
        day_start_time: '08:00',
        day_end_time: '17:00',
        enabled_services: ['install', 'repair'],
        welcome_message: 'hi',
        confirmation_message: 'ok',
        primary_color: '#000',
        logo_url: null,
        notify_email: 'owner@example.com',
        auto_confirm: false,
        calendar_integration: true,
      });

      const { getBookingSettings } = require('@/lib/booking/settings');
      const s = await getBookingSettings('b1');

      expect(s).not.toBeNull();
      expect(s?.businessId).toBe('b1');
      expect(s?.isEnabled).toBe(true);
      expect(s?.bookingUrlSlug).toBe('acme');
      expect(s?.leadTimeHours).toBe(24);
      expect(s?.availableDays).toEqual([1, 2, 3, 4, 5]);
      expect(s?.enabledServices).toEqual(['install', 'repair']);
    });

    it('returns empty array for enabled_services when null', async () => {
      supabaseMock.__setMockData({
        id: 's1',
        business_id: 'b1',
        is_enabled: false,
        booking_url_slug: 'test',
        lead_time_hours: 24,
        max_days_ahead: 30,
        buffer_minutes: 15,
        slot_duration_minutes: 60,
        available_days: [],
        day_start_time: '08:00',
        day_end_time: '17:00',
        enabled_services: null, // null case
        welcome_message: null,
        confirmation_message: null,
        primary_color: '#000',
        logo_url: null,
        notify_email: null,
        auto_confirm: false,
        calendar_integration: false,
      });

      const { getBookingSettings } = require('@/lib/booking/settings');
      const s = await getBookingSettings('b1');

      expect(s?.enabledServices).toEqual([]);
    });
  });

  describe('getBookingSettingsBySlug', () => {
    it('returns null when no data', async () => {
      supabaseMock.__setMockData(null);
      const { getBookingSettingsBySlug } = require('@/lib/booking/settings');
      const result = await getBookingSettingsBySlug('nonexistent');
      expect(result).toBeNull();
    });

    it('returns settings and business name when data exists', async () => {
      supabaseMock.__setMockData({
        id: 's1',
        business_id: 'b1',
        is_enabled: true,
        booking_url_slug: 'acme',
        lead_time_hours: 24,
        max_days_ahead: 30,
        buffer_minutes: 15,
        slot_duration_minutes: 60,
        available_days: [1, 2, 3, 4, 5],
        day_start_time: '08:00',
        day_end_time: '17:00',
        enabled_services: ['install'],
        welcome_message: 'Welcome',
        confirmation_message: 'Thanks',
        primary_color: '#2563eb',
        logo_url: 'https://example.com/logo.png',
        notify_email: 'notify@example.com',
        auto_confirm: true,
        calendar_integration: true,
        business: { name: 'Acme Plumbing' },
      });

      const { getBookingSettingsBySlug } = require('@/lib/booking/settings');
      const result = await getBookingSettingsBySlug('acme');

      expect(result).not.toBeNull();
      expect(result?.settings.bookingUrlSlug).toBe('acme');
      expect(result?.settings.isEnabled).toBe(true);
      expect(result?.businessName).toBe('Acme Plumbing');
    });

    it('returns empty business name when business is null', async () => {
      supabaseMock.__setMockData({
        id: 's1',
        business_id: 'b1',
        is_enabled: true,
        booking_url_slug: 'orphan',
        lead_time_hours: 24,
        max_days_ahead: 30,
        buffer_minutes: 15,
        slot_duration_minutes: 60,
        available_days: [1],
        day_start_time: '09:00',
        day_end_time: '18:00',
        enabled_services: [],
        welcome_message: null,
        confirmation_message: null,
        primary_color: '#000',
        logo_url: null,
        notify_email: null,
        auto_confirm: false,
        calendar_integration: false,
        business: null,
      });

      const { getBookingSettingsBySlug } = require('@/lib/booking/settings');
      const result = await getBookingSettingsBySlug('orphan');

      expect(result?.businessName).toBe('');
    });
  });

  describe('upsertBookingSettings', () => {
    it('maps fields correctly and returns structured settings', async () => {
      supabaseMock.__setMockData({
        id: 's1',
        business_id: 'b1',
        is_enabled: true,
        booking_url_slug: 'acme',
        lead_time_hours: 12,
        max_days_ahead: 14,
        buffer_minutes: 30,
        slot_duration_minutes: 45,
        available_days: [1, 2, 3],
        day_start_time: '09:00',
        day_end_time: '16:00',
        enabled_services: ['repair'],
        welcome_message: 'Hello',
        confirmation_message: 'Confirmed',
        primary_color: '#ff0000',
        logo_url: 'https://logo.url',
        notify_email: 'test@test.com',
        auto_confirm: true,
        calendar_integration: false,
      });

      const { upsertBookingSettings } = require('@/lib/booking/settings');
      const result = await upsertBookingSettings('b1', {
        isEnabled: true,
        leadTimeHours: 12,
        maxDaysAhead: 14,
        bufferMinutes: 30,
        slotDurationMinutes: 45,
        availableDays: [1, 2, 3],
        dayStartTime: '09:00',
        dayEndTime: '16:00',
        enabledServices: ['repair'],
        welcomeMessage: 'Hello',
        confirmationMessage: 'Confirmed',
        primaryColor: '#ff0000',
        logoUrl: 'https://logo.url',
        notifyEmail: 'test@test.com',
        autoConfirm: true,
        calendarIntegration: false,
      });

      expect(result.businessId).toBe('b1');
      expect(result.isEnabled).toBe(true);
      expect(result.leadTimeHours).toBe(12);
      expect(result.autoConfirm).toBe(true);
    });

    it('throws on database error', async () => {
      supabaseMock.__setMockData(null);
      supabaseMock.__setMockError({ message: 'Database error' });

      const { upsertBookingSettings } = require('@/lib/booking/settings');

      await expect(upsertBookingSettings('b1', { isEnabled: true }))
        .rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('generateBookingSlug', () => {
    it('generates slug from business name', async () => {
      // First call returns null (slug available)
      supabaseMock.__setMockData(null);

      const { generateBookingSlug } = require('@/lib/booking/settings');
      const slug = await generateBookingSlug('Acme Plumbing');

      expect(slug).toBe('acme-plumbing');
    });

    it('sanitizes special characters', async () => {
      supabaseMock.__setMockData(null);

      const { generateBookingSlug } = require('@/lib/booking/settings');
      const slug = await generateBookingSlug('Joe\'s Plumbing & HVAC!');

      expect(slug).toBe('joe-s-plumbing-hvac');
    });

    it('handles empty and edge cases', async () => {
      supabaseMock.__setMockData(null);

      const { generateBookingSlug } = require('@/lib/booking/settings');

      // Test with leading/trailing special chars
      const slug1 = await generateBookingSlug('---Test Business---');
      expect(slug1).toBe('test-business');

      // Test with numbers
      const slug2 = await generateBookingSlug('24/7 Plumbing Services');
      expect(slug2).toBe('24-7-plumbing-services');
    });
  });

  describe('isSlugAvailable', () => {
    it('returns true when slug is not taken', async () => {
      supabaseMock.__setMockData(null);

      const { isSlugAvailable } = require('@/lib/booking/settings');
      const available = await isSlugAvailable('new-slug');

      expect(available).toBe(true);
    });

    it('returns false when slug is taken', async () => {
      supabaseMock.__setMockData({ id: 's1' });

      const { isSlugAvailable } = require('@/lib/booking/settings');
      const available = await isSlugAvailable('taken-slug');

      expect(available).toBe(false);
    });

    it('supports excludeBusinessId parameter', async () => {
      supabaseMock.__setMockData(null);

      const { isSlugAvailable } = require('@/lib/booking/settings');
      const available = await isSlugAvailable('my-slug', 'b1');

      expect(available).toBe(true);
    });
  });

  describe('getBusinessServices', () => {
    it('returns unique sorted service types', async () => {
      supabaseMock.__setMockData([
        { type: 'repair' },
        { type: 'install' },
        { type: 'repair' }, // duplicate
        { type: 'maintenance' },
      ]);

      const { getBusinessServices } = require('@/lib/booking/settings');
      const services = await getBusinessServices('b1');

      expect(services).toEqual(['install', 'maintenance', 'repair']);
    });

    it('returns empty array when no jobs', async () => {
      supabaseMock.__setMockData([]);

      const { getBusinessServices } = require('@/lib/booking/settings');
      const services = await getBusinessServices('b1');

      expect(services).toEqual([]);
    });

    it('filters out null types', async () => {
      supabaseMock.__setMockData([
        { type: 'repair' },
        { type: null },
        { type: 'install' },
      ]);

      const { getBusinessServices } = require('@/lib/booking/settings');
      const services = await getBusinessServices('b1');

      expect(services).toEqual(['install', 'repair']);
    });

    it('handles null data response', async () => {
      supabaseMock.__setMockData(null);

      const { getBusinessServices } = require('@/lib/booking/settings');
      const services = await getBusinessServices('b1');

      expect(services).toEqual([]);
    });
  });

  describe('getBookingPageUrl', () => {
    it('composes URL using environment variable', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.tradescaptain.com';

      const { getBookingPageUrl } = require('@/lib/booking/settings');
      const url = getBookingPageUrl('acme-plumbing');

      expect(url).toBe('https://app.tradescaptain.com/book/acme-plumbing');

      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });

    it('uses localhost fallback when env not set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      const { getBookingPageUrl } = require('@/lib/booking/settings');
      const url = getBookingPageUrl('test-business');

      expect(url).toBe('http://localhost:3000/book/test-business');

      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });
  });
});
