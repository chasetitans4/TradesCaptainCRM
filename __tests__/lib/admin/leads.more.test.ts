import {
  getLead,
  updateLead,
  updateLeadStatus,
  reassignLead,
  bulkReassignLeads,
  logLeadContact,
  getLeadActivities,
  convertLead,
} from '@/lib/admin/leads';

jest.mock('@/lib/supabase/server', () => {
  const state: any = {
    leads: [
      { id: 'l1', agent_id: 'a1', status: 'new', email: 'X@E.com' },
      { id: 'l2', agent_id: 'a2', status: 'new' },
    ],
    activities: [
      { id: 'act1', lead_id: 'l1', created_at: '2024-01-02T00:00:00.000Z' },
      { id: 'act2', lead_id: 'l1', created_at: '2024-01-03T00:00:00.000Z' },
      { id: 'act3', lead_id: 'l2', created_at: '2024-01-01T00:00:00.000Z' },
    ],
    reassignments: [] as any[],
    activityInserts: 0,
  };
  const resolveBase = (table: string) => {
    switch (table) {
      case 'tc_leads': return state.leads;
      case 'lead_activities': return state.activities;
      case 'lead_reassignments': return state.reassignments;
      default: return [];
    }
  };
  const makeChain = (table: string) => {
    const q: any = { filters: [], orders: [], selectFields: null };
    const apply = () => {
      let rows = [...resolveBase(table)];
      for (const f of q.filters) {
        if (f.type === 'eq') rows = rows.filter((r: any) => r[f.col] === f.val);
        else if (f.type === 'is') {
          if (f.val === null) rows = rows.filter((r: any) => r[f.col] == null);
          else rows = rows.filter((r: any) => r[f.col] !== null);
        }
      }
      for (const ord of q.orders) {
        rows.sort((a: any, b: any) => {
          const av = a[ord.key]; const bv = b[ord.key];
          const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av > bv ? 1 : av < bv ? -1 : 0);
          return ord.asc ? cmp : -cmp;
        });
      }
      return rows;
    };
    const api: any = {
      select: (fields?: string) => { q.selectFields = fields || null; return api; },
      eq: (col: string, val: any) => { q.filters.push({ type: 'eq', col, val }); return api; },
      is: (col: string, val: any) => { q.filters.push({ type: 'is', col, val }); return api; },
      order: (key: string, opts?: any) => { q.orders.push({ key, asc: !!opts?.ascending }); return api; },
      range: (_s: number, _e: number) => Promise.resolve({ data: apply(), error: null, count: apply().length }),
      single: () => ({ data: apply()[0] || null, error: apply()[0] ? null : { message: 'not found' } }),
    };
    return api;
  };
  const leadsTable = {
    select: (fields?: any) => makeChain('tc_leads').select(fields),
    update: (updates: any) => ({
      eq: (col: string, val: any) => ({
        select: () => ({
          single: () => {
            const arr = resolveBase('tc_leads');
            const idx = arr.findIndex((r: any) => r[col] === val);
            if (idx === -1) return { data: null, error: new Error('not found') };
            arr[idx] = { ...arr[idx], ...updates, email: updates.email || arr[idx].email };
            return { data: arr[idx], error: null };
          },
        }),
        is: (_c: string, _v: any) => ({
          select: () => ({
            single: () => {
              const arr = resolveBase('tc_leads');
              const idx = arr.findIndex((r: any) => r[col] === val);
              if (idx === -1) return { data: null, error: new Error('not found') };
              arr[idx] = { ...arr[idx], ...updates, email: updates.email || arr[idx].email };
              return { data: arr[idx], error: null };
            },
          }),
        }),
      }),
    }),
    insert: (payload: any) => ({
      select: () => ({
        single: () => {
          const arr = resolveBase('tc_leads');
          const record = { id: 'new_' + (arr.length + 1), ...payload };
          arr.push(record);
          return { data: record, error: null };
        },
      }),
    }),
  };
  const reassignmentsTable = {
    insert: (payload: any) => { state.reassignments.push(payload); return {}; },
  };
  const activitiesTable = {
    select: () => ({
      eq: (col: string, val: any) => ({
        order: (key: string, opts?: any) => {
          const rows = resolveBase('lead_activities').filter((r: any) => r[col] === val)
            .sort((a: any, b: any) => opts?.ascending ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]));
          return { data: rows, error: null };
        },
      }),
    }),
    insert: (payload: any) => { state.activityInserts++; state.activities.push({ id: 'newact', ...payload, created_at: new Date().toISOString() }); return {}; },
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'tc_leads') return leadsTable as any;
        if (table === 'lead_reassignments') return reassignmentsTable as any;
        if (table === 'lead_activities') return activitiesTable as any;
        return {} as any;
      },
      rpc: (_fn: string, _params: any) => 1,
    })),
    __state: state,
  };
});

describe('admin leads: detail and updates', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.leads = [
      { id: 'l1', agent_id: 'a1', status: 'new', deleted_at: null, email: 'X@E.com' },
      { id: 'l2', agent_id: 'a2', status: 'new', deleted_at: null },
    ];
    supabase.__state.activities = [
      { id: 'act1', lead_id: 'l1', created_at: '2024-01-02T00:00:00.000Z' },
      { id: 'act2', lead_id: 'l1', created_at: '2024-01-03T00:00:00.000Z' },
    ];
    supabase.__state.reassignments = [];
    supabase.__state.activityInserts = 0;
  });

  it('gets single lead and enforces agent ownership when provided', async () => {
    const l1 = await getLead('l1');
    expect(l1?.id).toBe('l1');
    const mismatch = await getLead('l1', 'a2');
    expect(mismatch).toBeNull();
  });

  it('updates lead merges and lowercases email', async () => {
    const updated = await updateLead('l1', { email: 'NEW@EXAMPLE.COM', notes: 'updated' } as any);
    expect(updated.email).toBe('new@example.com');
    expect(updated.notes).toBe('updated');
  });

  it('updates lead status and logs activity', async () => {
    const supabase = require('@/lib/supabase/server');
    const before = supabase.__state.activityInserts;
    const updated = await updateLeadStatus('l1', 'qualified', 'a1' as any);
    expect(updated.status).toBe('qualified');
    expect(supabase.__state.activityInserts).toBeGreaterThan(before);
  });

  it('reassigns lead, records reassignment and activity', async () => {
    const res = await reassignLead('l1', { to_agent_id: 'a3', reason: 'workload', notes: 'urgent' } as any, 'mgr-1');
    expect(res.agent_id).toBe('a3');
    const supabase = require('@/lib/supabase/server');
    expect(supabase.__state.reassignments.length).toBe(1);
    expect(supabase.__state.activityInserts).toBeGreaterThan(0);
  });

  it('bulk reassign counts success and failure', async () => {
    const supabase = require('@/lib/supabase/server');
    // Simulate failure for lX by removing from leads
    supabase.__state.leads = supabase.__state.leads.filter((l: any) => l.id !== 'l2');
    const res = await bulkReassignLeads(['l1', 'l2'], 'a9', 'redistribute', 'mgr-1');
    expect(res.success).toBe(1);
    expect(res.failed).toBe(1);
  });

  it('logs lead contact and inserts activity', async () => {
    const supabase = require('@/lib/supabase/server');
    const before = supabase.__state.activityInserts;
    await logLeadContact('l1', 'a1', 'called', 'spoke briefly', '2025-01-10T00:00:00.000Z');
    expect(supabase.__state.activityInserts).toBeGreaterThan(before);
  });

  it('logs activity directly via logLeadActivity', async () => {
    const supabase = require('@/lib/supabase/server');
    const before = supabase.__state.activityInserts;
    const mod = require('@/lib/admin/leads');
    await mod.logLeadActivity('l1', 'a1', 'status_changed', 'changed status to qualified', { old_status: 'new', new_status: 'qualified' });
    expect(supabase.__state.activityInserts).toBeGreaterThan(before);
  });

  it('converts lead to CRM customer and logs activity', async () => {
    const supabase = require('@/lib/supabase/server');
    const before = supabase.__state.activityInserts;
    const converted = await convertLead('l1', 'a1', 'acct-1', 'crm');
    expect(converted.status).toBe('won');
    // ensure CRM account id set on stored lead
    const stored = supabase.__state.leads.find((l: any) => l.id === 'l1');
    expect(stored.crm_account_id).toBe('acct-1');
    expect(supabase.__state.activityInserts).toBeGreaterThan(before);
  });

  it('gets lead activities ordered desc by created_at', async () => {
    const acts = await getLeadActivities('l1');
    expect(acts.map(a => a.id)).toEqual(['act2', 'act1']);
  });

  it('returns empty lead activities when data is null', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({ data: null, error: null }),
          }),
        }),
      }),
    }));
    const mod = require('@/lib/admin/leads');
    const acts = await mod.getLeadActivities('lX');
    expect(Array.isArray(acts)).toBe(true);
    expect(acts.length).toBe(0);
    supabase.createAdminClient = original;
  });

  it('returns empty array on getLeadActivities query error', async () => {
    // Note: getLeadActivities handles errors gracefully and returns empty array
    // instead of throwing, to support cases where the table might not exist
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({ data: null, error: new Error('bad') }),
          }),
        }),
      }),
    }));
    const mod = require('@/lib/admin/leads');
    const result = await mod.getLeadActivities('lX');
    expect(result).toEqual([]);
    supabase.createAdminClient = original;
  });

  it('getLeadStats returns zeros when data null', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    const makeChain = () => {
      const chain: any = {
        is: () => chain,
        eq: () => chain,
        then: (resolve: any) => resolve({ data: null }),
      };
      return chain;
    };
    supabase.createAdminClient = jest.fn(() => ({
      from: (_table: string) => ({
        select: () => makeChain(),
      }),
    }));
    const mod = require('@/lib/admin/leads');
    const stats = await mod.getLeadStats('aZ');
    expect(stats.total).toBe(0);
    expect(stats.won).toBe(0);
    supabase.createAdminClient = original;
  });
  it('createLead throws when insert select returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => {
        if (table === 'tc_leads') {
          return {
            insert: (_row: any) => ({
              select: () => ({
                single: () => ({ data: null, error: new Error('insert failed') }),
              }),
            }),
          };
        }
        if (table === 'lead_activities') {
          return { insert: () => ({}) };
        }
        return {} as any;
      },
    }));
    const mod = require('@/lib/admin/leads');
    await expect(mod.createLead('ag1', { company_name: 'Co', contact_name: 'Alice' } as any)).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });
  it('updateLead throws when agent filter mismatches', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (_table: string) => ({
        update: (_updates: any) => ({
          eq: (_col1: string, _val1: any) => ({
            is: (_col2: string, _val2: any) => ({
              eq: (_col3: string, _val3: any) => ({
                select: () => ({
                  single: () => ({ data: null, error: new Error('not found') }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    const mod = require('@/lib/admin/leads');
    await expect(mod.updateLead('u1', { email: 'X@E.com' } as any, 'mismatch-agent')).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('updateLeadStatus throws when update returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (_table: string) => ({
        select: (_fields?: any) => ({
          eq: (_c: string, _v: any) => ({
            single: () => ({ data: { status: 'new' }, error: null }),
          }),
        }),
        update: (_updates: any) => ({
          eq: (_c: string, _v: any) => ({
            select: () => ({
              single: () => ({ data: null, error: new Error('bad') }),
            }),
          }),
        }),
      }),
    }));
    const mod = require('@/lib/admin/leads');
    await expect(mod.updateLeadStatus('lX', 'qualified' as any, 'a1')).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });

  it('convertLead throws when update returns error', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (_table: string) => ({
        update: (_updates: any) => ({
          eq: (_c: string, _v: any) => ({
            select: () => ({
              single: () => ({ data: null, error: new Error('fail') }),
            }),
          }),
        }),
      }),
    }));
    const mod = require('@/lib/admin/leads');
    await expect(mod.convertLead('lY', 'a1', 'acct-9', 'crm')).rejects.toBeTruthy();
    supabase.createAdminClient = original;
  });
});
