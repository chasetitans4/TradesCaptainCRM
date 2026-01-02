import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const s: any = {};

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(async () => ({
    from: (_table: string) => {
      const api: any = {};
      api.select = () => api;
      api.eq = () => api;
      api.single = async () => ({ data: s.conn || null, error: s.connError || null });
      return api;
    },
  })),
}));

jest.mock('@/lib/crypto', () => ({
  decrypt: (v: string) => v,
}));

const nylasMock = {
  calendars: { list: jest.fn(async () => ({ data: [{ id: 'cal1' }] })) },
  events: {
    list: jest.fn(async () => ({
      data: [
        { id: 'e1', title: 'A', description: 'desc', location: 'loc', when: { startTime: 1000, endTime: 2000 }, busy: false },
        { id: 'e2', title: undefined, description: undefined, location: undefined, when: { startTime: 3000, endTime: 4000 }, busy: true },
      ],
    })),
    create: jest.fn(async () => ({ data: { id: 'evt-created' } })),
    update: jest.fn(async () => ({})),
    destroy: jest.fn(async () => ({})),
  },
};

jest.mock('@/lib/nylas/client', () => ({
  nylas: nylasMock,
}));

describe('nylas/calendar', () => {
  beforeEach(() => {
    for (const k of Object.keys(s)) delete s[k];
    nylasMock.calendars.list.mockClear();
    nylasMock.events.list.mockClear();
    nylasMock.events.create.mockClear();
    nylasMock.events.update.mockClear();
    nylasMock.events.destroy.mockClear();
  });

  it('listCalendars returns data and handles error', async () => {
    const mod = require('@/lib/nylas/calendar');
    const res1 = await mod.listCalendars('g1');
    expect(res1).toEqual([{ id: 'cal1' }]);
    nylasMock.calendars.list.mockImplementationOnce(async () => { throw new Error('bad'); });
    const res2 = await mod.listCalendars('g1');
    expect(res2).toEqual([]);
  });

  it('getCalendarEvents maps events when connection exists', async () => {
    const mod = require('@/lib/nylas/calendar');
    s.conn = { nylas_grant_id: 'g1', calendar_id: 'cal1' };
    const events = await mod.getCalendarEvents('user1', new Date(0), new Date(10000));
    expect(events.length).toBe(2);
    expect(events[0].busy).toBe(false);
    expect(events[1].title).toBe('Busy');
  });

  it('getCalendarEvents returns [] on API error', async () => {
    const mod = require('@/lib/nylas/calendar');
    s.conn = { nylas_grant_id: 'g1', calendar_id: 'cal1' };
    nylasMock.events.list.mockImplementationOnce(async () => { throw new Error('fail'); });
    const events = await mod.getCalendarEvents('user2', new Date(0), new Date(10000));
    expect(events).toEqual([]);
  });

  it('createCalendarEvent returns id or null', async () => {
    const mod = require('@/lib/nylas/calendar');
    s.conn = { nylas_grant_id: 'g1', calendar_id: 'cal1' };
    const id = await mod.createCalendarEvent('u1', {
      id: 'job1',
      title: 'Install',
      scheduled_date: '2025-01-01',
      customer: { name: 'Alice' },
    });
    expect(id).toBe('evt-created');
    s.conn = null;
    const id2 = await mod.createCalendarEvent('u1', {
      id: 'job1',
      title: 'Install',
      scheduled_date: '2025-01-01',
      customer: { name: 'Alice' },
    });
    expect(id2).toBeNull();
    s.conn = { nylas_grant_id: 'g1', calendar_id: 'cal1' };
    nylasMock.events.create.mockImplementationOnce(async () => { throw new Error('x'); });
    const id3 = await mod.createCalendarEvent('u1', {
      id: 'job1',
      title: 'Install',
      scheduled_date: '2025-01-01',
      customer: { name: 'Alice' },
    });
    expect(id3).toBeNull();
  });

  it('updateCalendarEvent handles missing connection and error', async () => {
    const mod = require('@/lib/nylas/calendar');
    s.conn = null;
    await mod.updateCalendarEvent('u2', 'evt', {
      id: 'job1',
      title: 'Install',
      scheduled_date: '2025-01-01',
      customer: { name: 'Bob' },
    });
    s.conn = { nylas_grant_id: 'g1', calendar_id: 'cal1' };
    nylasMock.events.update.mockImplementationOnce(async () => { throw new Error('oops'); });
    await mod.updateCalendarEvent('u2', 'evt', {
      id: 'job1',
      title: 'Install',
      scheduled_date: '2025-01-01',
      customer: { name: 'Bob' },
    });
    expect(nylasMock.events.update).toHaveBeenCalled();
  });

  it('deleteCalendarEvent handles missing connection and error', async () => {
    const mod = require('@/lib/nylas/calendar');
    s.conn = null;
    await mod.deleteCalendarEvent('u3', 'evt');
    s.conn = { nylas_grant_id: 'g1', calendar_id: 'cal1' };
    nylasMock.events.destroy.mockImplementationOnce(async () => { throw new Error('err'); });
    await mod.deleteCalendarEvent('u3', 'evt');
    expect(nylasMock.events.destroy).toHaveBeenCalled();
  });
});

