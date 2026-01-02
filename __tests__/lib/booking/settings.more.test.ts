import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('booking/settings additional coverage', () => {
  const state: any = {};

  beforeEach(() => {
    for (const k of Object.keys(state)) delete state[k];
    jest.resetModules();
  });

  it('isSlugAvailable returns true/false with excludeBusinessId branch', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => {
          const api: any = {};
          api.select = () => api;
          api.eq = () => api;
          api.neq = () => api;
          api.single = async () => ({ data: state.slugData || null, error: null });
          return api;
        },
      }),
    }));
    const { isSlugAvailable } = require('@/lib/booking/settings');
    state.slugData = { id: 'exists' };
    const res1 = await isSlugAvailable('acme');
    expect(res1).toBe(false);
    state.slugData = null;
    const res2 = await isSlugAvailable('acme', 'b1');
    expect(res2).toBe(true);
  });

  it('upsertBookingSettings maps provided fields and returns structured settings', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => ({
          upsert: (_data: any) => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 's1',
                  business_id: 'b1',
                  is_enabled: true,
                  booking_url_slug: 'acme',
                  lead_time_hours: 12,
                  max_days_ahead: 20,
                  buffer_minutes: 10,
                  slot_duration_minutes: 30,
                  available_days: [1, 2, 3],
                  day_start_time: '08:00',
                  day_end_time: '16:00',
                  enabled_services: ['install'],
                  welcome_message: 'hi',
                  confirmation_message: 'ok',
                  primary_color: '#000',
                  logo_url: null,
                  notify_email: 'owner@example.com',
                  auto_confirm: false,
                  calendar_integration: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));
    const { upsertBookingSettings } = require('@/lib/booking/settings');
    const result = await upsertBookingSettings('b1', {
      isEnabled: true,
      bookingUrlSlug: 'acme',
      leadTimeHours: 12,
      maxDaysAhead: 20,
      bufferMinutes: 10,
      slotDurationMinutes: 30,
      availableDays: [1, 2, 3],
      dayStartTime: '08:00',
      dayEndTime: '16:00',
      enabledServices: ['install'],
      welcomeMessage: 'hi',
      confirmationMessage: 'ok',
      primaryColor: '#000',
      logoUrl: null,
      notifyEmail: 'owner@example.com',
      autoConfirm: false,
      calendarIntegration: true,
    });
    expect(result.businessId).toBe('b1');
    expect(result.enabledServices).toEqual(['install']);
    expect(result.isEnabled).toBe(true);
  });
  
  it('upsertBookingSettings handles missing optional fields', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => ({
          upsert: (_data: any) => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 's2',
                  business_id: 'b2',
                  is_enabled: false,
                  booking_url_slug: null,
                  lead_time_hours: 6,
                  max_days_ahead: 30,
                  buffer_minutes: 30,
                  slot_duration_minutes: 60,
                  available_days: [1,2,3,4,5],
                  day_start_time: '08:00',
                  day_end_time: '17:00',
                  enabled_services: [],
                  welcome_message: null,
                  confirmation_message: null,
                  primary_color: '#2563eb',
                  logo_url: null,
                  notify_email: null,
                  auto_confirm: false,
                  calendar_integration: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));
    const { upsertBookingSettings } = require('@/lib/booking/settings');
    const result = await upsertBookingSettings('b2', {
      isEnabled: false,
      leadTimeHours: 6,
    });
    expect(result.businessId).toBe('b2');
    expect(result.leadTimeHours).toBe(6);
    expect(Array.isArray(result.availableDays)).toBe(true);
  });
  
  it('getBookingSettingsBySlug returns business name when present', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 's1',
                    business_id: 'b1',
                    is_enabled: true,
                    booking_url_slug: 'acme',
                    lead_time_hours: 24,
                    max_days_ahead: 30,
                    buffer_minutes: 15,
                    slot_duration_minutes: 60,
                    available_days: [1,2,3,4,5],
                    day_start_time: '08:00',
                    day_end_time: '17:00',
                    enabled_services: ['install'],
                    welcome_message: 'hi',
                    confirmation_message: 'ok',
                    primary_color: '#000',
                    logo_url: null,
                    notify_email: 'owner@example.com',
                    auto_confirm: false,
                    calendar_integration: true,
                    business: { name: 'Acme Plumbing' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { getBookingSettingsBySlug } = require('@/lib/booking/settings');
    const res = await getBookingSettingsBySlug('acme');
    expect(res?.businessName).toBe('Acme Plumbing');
    expect(res?.settings.isEnabled).toBe(true);
  });

  it('generateBookingSlug increments when duplicate exists', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => {
        let count = 0;
        return {
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => {
                  count += 1;
                  return { data: count === 1 ? { id: 'exists' } : null, error: null };
                },
              }),
            }),
          }),
        };
      },
    }));
    const { generateBookingSlug } = require('@/lib/booking/settings');
    const slug = await generateBookingSlug('Acme Plumbing');
    expect(slug).toMatch(/^acme-plumbing(-\d+)?$/);
    expect(slug).toBe('acme-plumbing-1');
  });

  it('getBusinessServices returns sorted unique types', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => ({
          select: () => ({
            eq: () => ({
              not: () => ({
                data: [{ type: 'install' }, { type: 'repair' }, { type: 'install' }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));
    const { getBusinessServices } = require('@/lib/booking/settings');
    const services = await getBusinessServices('b1');
    expect(services).toEqual(['install', 'repair']);
  });

  it('getBookingPageUrl builds URL from environment', () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    const { getBookingPageUrl } = require('@/lib/booking/settings');
    const url = getBookingPageUrl('acme');
    expect(url).toBe('https://app.example.com/book/acme');
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it('getBookingSettings returns null when no data', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }));
    const { getBookingSettings } = require('@/lib/booking/settings');
    const res = await getBookingSettings('b1');
    expect(res).toBeNull();
  });

  it('getBookingSettings maps fields when data present', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (_table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 's1',
                  business_id: 'b1',
                  is_enabled: true,
                  booking_url_slug: 'acme',
                  lead_time_hours: 12,
                  max_days_ahead: 20,
                  buffer_minutes: 10,
                  slot_duration_minutes: 30,
                  available_days: [1, 2, 3],
                  day_start_time: '08:00',
                  day_end_time: '16:00',
                  enabled_services: ['install'],
                  welcome_message: 'hi',
                  confirmation_message: 'ok',
                  primary_color: '#000',
                  logo_url: null,
                  notify_email: 'owner@example.com',
                  auto_confirm: false,
                  calendar_integration: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));
    const { getBookingSettings } = require('@/lib/booking/settings');
    const res = await getBookingSettings('b1');
    expect(res?.businessId).toBe('b1');
    expect(res?.enabledServices).toEqual(['install']);
  });

  it('initializeBookingSettings creates defaults via upsert', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: (table: string) => {
          if (table === 'booking_settings') {
            return {
              // Used by generateBookingSlug to check uniqueness
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }),
              // Used by upsertBookingSettings
              upsert: (_data: any) => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: 's3',
                      business_id: 'b3',
                      is_enabled: false,
                      booking_url_slug: 'acme-plumbing',
                      lead_time_hours: 24,
                      max_days_ahead: 30,
                      buffer_minutes: 30,
                      slot_duration_minutes: 60,
                      available_days: [1, 2, 3, 4, 5],
                      day_start_time: '08:00',
                      day_end_time: '17:00',
                      enabled_services: [],
                      welcome_message: 'Welcome! Book an appointment with Acme Plumbing.',
                      confirmation_message: 'Thank you for booking. We will confirm your appointment shortly.',
                      primary_color: '#2563eb',
                      logo_url: null,
                      notify_email: null,
                      auto_confirm: false,
                      calendar_integration: true,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      }),
    }));
    const { initializeBookingSettings } = require('@/lib/booking/settings');
    const settings = await initializeBookingSettings('b3', 'Acme Plumbing');
    expect(settings.isEnabled).toBe(false);
    expect(settings.slotDurationMinutes).toBe(60);
    expect(settings.availableDays).toEqual([1, 2, 3, 4, 5]);
  });
});
