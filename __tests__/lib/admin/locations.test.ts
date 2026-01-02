import { getClientLocations, getLocation, addLocation, updateLocation, deleteLocation, calculateLocationPricing, calculateLocationCommission } from '@/lib/admin/locations';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { locations: [], deletes: 0, inserts: [], updates: [] };
  const locTable = {
    select: (_fields?: string) => ({
      eq: (col: string, val: any) => ({
        order: () => ({ order: () => ({ data: state.locations.filter((l: any) => l[col] === val), error: null }) }),
        single: () => {
          const row = state.locations.find((l: any) => l[col] === val) || null;
          return { data: row, error: null };
        },
      }),
      order: () => ({ order: () => ({ data: state.locations.slice(), error: null }) }),
    }),
    insert: (payload: any) => {
      const rec = { id: 'loc_new', ...payload };
      state.locations.push(rec);
      state.inserts.push(rec);
      return { select: () => ({ single: () => ({ data: rec, error: null }) }) };
    },
    update: (updates: any) => ({
      eq: (col: string, val: any) => {
        const idx = state.locations.findIndex((l: any) => l[col] === val);
        if (idx >= 0) state.locations[idx] = { ...state.locations[idx], ...updates };
        state.updates.push({ id: val, updates });
        return { select: () => ({ single: () => ({ data: state.locations[idx], error: null }) }) };
      },
    }),
    delete: () => ({
      eq: (col: string, val: any) => {
        state.locations = state.locations.filter((l: any) => l[col] !== val);
        state.deletes += 1;
        return {};
      },
    }),
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'client_locations') return locTable as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin locations: CRUD and pricing', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.locations = [
      { id: 'l1', client_id: 'c1', is_primary: true, is_addon: false, location_name: 'HQ', addon_price_cents: null },
      { id: 'l2', client_id: 'c1', is_primary: false, is_addon: true, location_name: 'Branch', addon_price_cents: 19900 },
    ];
    supabase.__state.deletes = 0;
    supabase.__state.inserts = [];
    supabase.__state.updates = [];
  });

  it('gets client locations sorted', async () => {
    const list = await getClientLocations('c1');
    expect(list.length).toBe(2);
  });

  it('getLocation returns null for PGRST116 and throws for other errors', async () => {
    const one = await getLocation('l1');
    expect(one?.id).toBe('l1');
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => ({ data: null, error: { code: 'PGRST116', message: 'not found' } }) }),
        }),
      }),
    }));
    const none = await getLocation('missing');
    expect(none).toBeNull();
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => ({ data: null, error: { code: 'OTHER', message: 'bad' } }) }),
        }),
      }),
    }));
    await expect(getLocation('missing')).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('addLocation sets primary when first and shares with primary otherwise', async () => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.locations = [];
    const first = await addLocation('cX', { location_name: 'A', city: 'X', state: 'AZ' } as any);
    expect(first.is_primary).toBe(true);
    supabase.__state.locations = [
      { id: 'p1', client_id: 'cX', is_primary: true, location_name: 'Prim' },
    ];
    const second = await addLocation('cX', { location_name: 'B', city: 'Y', state: 'AZ' } as any);
    expect(second.is_primary).toBe(false);
    expect(second.shares_nevermiss_with).toBe('p1');
  });

  it('updateLocation merges updates', async () => {
    const updated = await updateLocation('l2', { city: 'NY' } as any);
    expect(updated.city).toBe('NY');
  });

  it('deleteLocation throws for primary and deletes otherwise', async () => {
    await expect(deleteLocation('l1')).rejects.toBeTruthy();
    const supabase = require('@/lib/supabase/server');
    await deleteLocation('l2');
    expect(supabase.__state.deletes).toBeGreaterThan(0);
  });

  it('getClientLocations throws on error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ order: () => ({ data: null, error: { message: 'db' } }) }),
          }),
        }),
      }),
    }));
    await expect(getClientLocations('c1')).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('updateLocation throws on error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        update: () => ({
          eq: () => ({ select: () => ({ single: () => ({ data: null, error: { message: 'bad' } }) }) }),
        }),
      }),
    }));
    await expect(updateLocation('l2', { city: 'LA' } as any)).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('deleteLocation throws on deletion error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'client_locations') {
          return {
            select: () => ({
              eq: () => ({ single: () => ({ data: { id: 'l3', is_primary: false }, error: null }) }),
            }),
            delete: () => ({
              eq: () => ({ error: { message: 'del failed' } }),
            }),
          } as any;
        }
        return {} as any;
      },
    }));
    await expect(deleteLocation('l3')).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });
  it('calculateLocationPricing sums add-ons and count', async () => {
    const pricing = await calculateLocationPricing('c1', 29900);
    expect(pricing.addon_locations).toBe(19900);
    expect(pricing.addon_count).toBe(1);
    expect(pricing.total_monthly).toBe(49800);
  });

  it('calculateLocationCommission computes recurring and upfront', () => {
    const c = calculateLocationCommission(19900);
    expect(c.upfront).toBe(Math.round(19900 * 0.5));
    expect(c.recurring_10).toBe(Math.round(19900 * 0.1));
    expect(c.recurring_15).toBe(Math.round(19900 * 0.15));
    expect(c.max_potential).toBe(c.upfront + c.recurring_10 * 3 + c.recurring_15 * 9);
  });
});
