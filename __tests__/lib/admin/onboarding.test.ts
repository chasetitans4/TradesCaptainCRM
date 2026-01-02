import {
  getOnboardingTemplate,
  getOnboardingsInProgress,
  getClientOnboarding,
  createClientOnboarding,
  updateOnboardingTask,
  addOnboardingNote,
  markOnboardingStalled,
} from '@/lib/admin/onboarding';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__obMock || {};
    const resolveBase = (table: string) => {
      switch (table) {
        case 'onboarding_templates': return m.onboarding_templates || [];
        case 'client_onboarding': return m.client_onboarding || [];
        case 'client_onboarding_tasks': return m.client_onboarding_tasks || [];
        case 'crm_accounts': return m.crm_accounts || [];
        default: return [];
      }
    };
    const makeChain = (table: string): any => {
      const state: any = {
        filters: [],
        orders: [],
        limitN: null,
        rangeStart: null,
        rangeEnd: null,
        joinSelect: null,
      };
      const apply = (rows: any[]) => {
        let data = Array.isArray(rows) ? [...rows] : [];
        for (const f of state.filters) {
          if (f.type === 'eq') data = data.filter((r: any) => r[f.col] === f.val);
          else if (f.type === 'in') data = data.filter((r: any) => (f.val || []).includes(r[f.col]));
        }
        for (const ord of state.orders) {
          data = data.sort((a: any, b: any) => {
            const k = ord.key;
            const asc = ord.asc;
            const av = a[k];
            const bv = b[k];
            const cmp = typeof av === 'string' && typeof bv === 'string'
              ? av.localeCompare(bv)
              : (av > bv ? 1 : av < bv ? -1 : 0);
            return asc ? cmp : -cmp;
          });
        }
        if (typeof state.rangeStart === 'number' && typeof state.rangeEnd === 'number') {
          data = data.slice(state.rangeStart, state.rangeEnd + 1);
        }
        if (typeof state.limitN === 'number') data = data.slice(0, state.limitN);
        return data;
      };
      const api: any = {
        select: (fields?: string) => { state.joinSelect = fields || null; return api; },
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return api; },
        in: (col: string, val: any[]) => { state.filters.push({ type: 'in', col, val }); return api; },
        order: (key: string, opts?: any) => { state.orders.push({ key, asc: !!(opts && opts.ascending) }); return api; },
        range: (start: number, end: number) => { state.rangeStart = start; state.rangeEnd = end; return api; },
        limit: (n: number) => { state.limitN = n; return api; },
        single: () => {
          const base = resolveBase(table);
          const d = apply(base);
          const mraw: any = (globalThis as any).__obMock || {};
          if (mraw.singleError && mraw.singleTable === table) return { data: null, error: mraw.singleError };
          return { data: d[0] || null, error: null };
        },
        insert: (row: any | any[]) => {
          const mraw: any = (globalThis as any).__obMock || {};
          mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
          mraw.__state.inserts[table] = mraw.__state.inserts[table] || [];
          const base = resolveBase(table);
          if (mraw.insertError && mraw.insertTable === table) {
            return {
              then: (resolve: any) => resolve({ data: null, error: mraw.insertError }),
              select: () => ({ single: () => ({ data: null, error: mraw.insertError }) }),
              error: mraw.insertError,
            };
          }
          if (Array.isArray(row)) {
            const records = row.map((r) => ({ id: r.id || `${table.slice(0, 2)}_${Date.now()}_${Math.random()}`, ...r }));
            base.push(...records);
            mraw.__state.inserts[table].push(...records);
            (globalThis as any).__obMock = { ...mraw, [table]: base, __state: mraw.__state };
            return {
              then: (resolve: any) => resolve({ data: records, error: null }),
              select: () => ({ single: () => ({ data: records[0], error: null }) }),
              error: null,
            };
          } else {
            const id = row.id || `${table.slice(0, 2)}_${Date.now()}`;
            const record = { id, ...row };
            base.push(record);
            mraw.__state.inserts[table].push(record);
            (globalThis as any).__obMock = { ...mraw, [table]: base, __state: mraw.__state };
            return {
              then: (resolve: any) => resolve({ data: record, error: null }),
              select: () => ({ single: () => ({ data: record, error: null }) }),
              error: null,
            };
          }
        },
        update: (updates: any) => ({
          eq: (col: string, val: any) => {
            const mraw: any = (globalThis as any).__obMock || {};
            mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
            mraw.__state.updates[table] = mraw.__state.updates[table] || [];
            const base = resolveBase(table);
            let updated: any = null;
            for (let i = 0; i < base.length; i++) {
              if (base[i][col] === val) {
                base[i] = { ...base[i], ...updates };
                updated = base[i];
                break;
              }
            }
            mraw.__state.updates[table].push({ where: { col, val }, updates });
            (globalThis as any).__obMock = { ...mraw, [table]: base, __state: mraw.__state };
            return {
              select: () => ({
                single: () => ({ data: updated || { id: val, ...updates }, error: null }),
              }),
            };
          },
        }),
        then: (resolve: any) => {
          const base = resolveBase(table);
          return resolve({ data: apply(base), error: null, count: base.length });
        },
        delete: () => ({
          eq: (col: string, val: any) => {
            const mraw: any = (globalThis as any).__obMock || {};
            mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
            const base = resolveBase(table);
            const filtered = base.filter((r: any) => r[col] !== val);
            mraw.__state.deletes[table] = mraw.__state.deletes[table] || [];
            mraw.__state.deletes[table].push({ where: { col, val } });
            (globalThis as any).__obMock = { ...mraw, [table]: filtered, __state: mraw.__state };
            return { error: null };
          },
        }),
      };
      return api;
    };
    return { from: (table: string) => makeChain(table) };
  };
  return { createAdminClient: jest.fn(() => build()) };
});

describe('admin onboarding: templates', () => {
  beforeEach(() => { (globalThis as any).__obMock = {}; });

  it('gets onboarding template with tasks sorted by display_order', async () => {
    (globalThis as any).__obMock = {
      onboarding_templates: [
        {
          id: 't1',
          plan_track: 'gold',
          phase_number: 1,
          phase_name: 'Account Setup',
          tasks: [
            { id: 'tt2', task_name: 'B', display_order: 2 },
            { id: 'tt1', task_name: 'A', display_order: 1 },
          ],
        },
      ],
    };
    const res = await getOnboardingTemplate('gold');
    expect(res.length).toBe(1);
    expect(res[0]?.tasks?.[0]?.task_name).toBe('A');
  });
});

describe('admin onboarding: listing and detail', () => {
  beforeEach(() => { (globalThis as any).__obMock = {}; });

  it('gets onboardings in progress filtered by agent clients', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [
        { id: 'o1', client_id: 'c1', status: 'in_progress', started_at: '2025-01-02', client: { id: 'c1', business_name: 'ACME', plan_type: 'gold' }, tasks: [] },
        { id: 'o2', client_id: 'c2', status: 'stalled', started_at: '2025-01-03', client: { id: 'c2', business_name: 'Beta', plan_type: 'nevermiss' }, tasks: [] },
        { id: 'o3', client_id: 'c3', status: 'completed', started_at: '2025-01-01', client: { id: 'c3', business_name: 'Gamma', plan_type: 'blue' }, tasks: [] },
      ],
      crm_accounts: [
        { id: 'c1', agent_id: 'a1' },
        { id: 'c2', agent_id: 'a1' },
      ],
    };
    const res = await getOnboardingsInProgress('a1');
    expect(res.map(o => o.id)).toEqual(expect.arrayContaining(['o1', 'o2']));
    expect(res.map(o => o.client_name)).toContain('ACME');
  });

  it('gets client onboarding and sorts tasks, returns null on PGRST116', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [
        {
          id: 'o1',
          client_id: 'c1',
          client: { id: 'c1', business_name: 'ACME', plan_type: 'gold' },
          tasks: [
            { id: 'k1', phase_name: 'B', created_at: '2025-01-03' },
            { id: 'k2', phase_name: 'A', created_at: '2025-01-02' },
          ],
        },
      ],
    };
    const onboarding = await getClientOnboarding('c1');
    expect(onboarding?.client_name).toBe('ACME');
    expect(onboarding?.tasks?.[0]?.phase_name).toBe('A');
    (globalThis as any).__obMock.singleError = { code: 'PGRST116', message: 'not found' };
    (globalThis as any).__obMock.singleTable = 'client_onboarding';
    const none = await getClientOnboarding('missing');
    expect(none).toBeNull();
  });

  it('throws when getClientOnboarding returns non-PGRST116 error', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [],
      singleError: { code: 'X', message: 'bad' },
      singleTable: 'client_onboarding',
    };
    await expect(getClientOnboarding('cX')).rejects.toThrow('Failed to get onboarding: bad');
  });
});

describe('admin onboarding: create and update', () => {
  beforeEach(() => { (globalThis as any).__obMock = {}; });

  it('creates client onboarding and tasks from template', async () => {
    (globalThis as any).__obMock = {
      onboarding_templates: [
        { id: 't1', plan_track: 'gold', phase_name: 'Phase 1', phase_number: 1, tasks: [{ id: 'tt1', task_name: 'Task A', assigned_to: 'agent' }] },
        { id: 't2', plan_track: 'gold', phase_name: 'Phase 2', phase_number: 2, tasks: [{ id: 'tt2', task_name: 'Task B', assigned_to: 'client' }] },
      ],
      client_onboarding: [],
      client_onboarding_tasks: [],
    };
    const onboarding = await createClientOnboarding('client-1', 'gold');
    expect(onboarding.status).toBe('in_progress');
    const state = (globalThis as any).__obMock.__state;
    expect(state.inserts.client_onboarding_tasks.length).toBeGreaterThanOrEqual(2);
  });

  it('handles tasks insert error without throwing', async () => {
    (globalThis as any).__obMock = {
      onboarding_templates: [
        { id: 't1', plan_track: 'gold', phase_name: 'Phase 1', phase_number: 1, tasks: [{ id: 'tt1', task_name: 'Task A', assigned_to: 'agent' }] },
      ],
      client_onboarding: [],
      client_onboarding_tasks: [],
      insertError: new Error('insert failed'),
      insertTable: 'client_onboarding_tasks',
    };
    const onboarding = await createClientOnboarding('client-2', 'gold');
    expect(onboarding.status).toBe('in_progress');
    const state = (globalThis as any).__obMock.__state;
    const inserts = state.inserts.client_onboarding_tasks || [];
    expect(inserts.length).toBe(0);
  });
  it('throws when onboarding insert fails', async () => {
    (globalThis as any).__obMock = {
      onboarding_templates: [],
      client_onboarding: [],
      insertError: new Error('create failed'),
      insertTable: 'client_onboarding',
    };
    await expect(createClientOnboarding('client-3', 'gold')).rejects.toThrow('Failed to create onboarding: create failed');
  });

  it('updates onboarding task and recalculates progress to completed when 100%', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [{ id: 'o1', progress_percent: 0, status: 'in_progress' }],
      client_onboarding_tasks: [
        { id: 'k1', onboarding_id: 'o1', status: 'completed' },
        { id: 'k2', onboarding_id: 'o1', status: 'pending' },
      ],
    };
    const updated = await updateOnboardingTask('k2', { status: 'completed' as any });
    expect(updated.status).toBe('completed');
    const state = (globalThis as any).__obMock.__state;
    const clientUpdates = state.updates.client_onboarding || [];
    const last = clientUpdates[clientUpdates.length - 1]?.updates || {};
    expect(last.progress_percent).toBe(100);
    expect(last.status).toBe('completed');
  });

  it('skips progress recalculation when no tasks exist', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [{ id: 'oX', progress_percent: 0, status: 'in_progress' }],
      client_onboarding_tasks: [],
    };
    const updated = await updateOnboardingTask('missing-task', { status: 'completed' as any });
    expect(updated.status).toBe('completed');
    const state = (globalThis as any).__obMock.__state;
    expect(state.updates.client_onboarding).toBeUndefined();
  });
});

describe('admin onboarding: notes and status', () => {
  beforeEach(() => { (globalThis as any).__obMock = {}; });

  it('adds onboarding note as completed task', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [{ id: 'o1', client_id: 'c1', client: { id: 'c1', business_name: 'ACME', plan_type: 'gold' }, tasks: [] }],
      client_onboarding_tasks: [],
    };
    await addOnboardingNote('c1', 'Great progress', 'Agent Smith');
    const state = (globalThis as any).__obMock.__state;
    const inserted = state.inserts.client_onboarding_tasks?.[0];
    expect(inserted.task_name).toBe('Note');
    expect(inserted.status).toBe('completed');
    expect(inserted.completed_by).toBe('Agent Smith');
  });

  it('marks onboarding stalled', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [{ id: 'o1', client_id: 'c1', status: 'in_progress' }],
    };
    await markOnboardingStalled('c1', 'Waiting on client');
    const state = (globalThis as any).__obMock.__state;
    const updates = state.updates.client_onboarding || [];
    expect(updates.length).toBeGreaterThanOrEqual(1);
    expect(updates[updates.length - 1].updates.status).toBe('stalled');
  });

  it('throws when adding note for missing onboarding', async () => {
    (globalThis as any).__obMock = {
      client_onboarding: [],
      client_onboarding_tasks: [],
      singleError: { code: 'PGRST116', message: 'not found' },
      singleTable: 'client_onboarding',
    };
    await expect(addOnboardingNote('missing', 'Note', 'Agent')).rejects.toThrow('Onboarding not found');
  });
});
