jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { nylas_grant_id: null }, error: null }),
    }),
  })),
}));

jest.mock('@/lib/crypto', () => ({
  decrypt: (s: string) => s,
}));

jest.mock('nylas', () => {
  return {
    __esModule: true,
    default: class {
      static events: any = {
        list: jest.fn(async () => ({ data: [] })),
      };
    },
  };
});

import { getCalendarEvents } from '@/lib/nylas/calendar';

describe('lib/nylas/calendar getCalendarEvents', () => {
  it('returns empty array when no grant or connection', async () => {
    const events = await getCalendarEvents('user-1', new Date(), new Date());
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(0);
  });
});
