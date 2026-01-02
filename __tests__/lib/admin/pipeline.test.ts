import {
  getPipelineOverview,
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadActivities,
  logActivity,
  getLeadTasks,
  getTodaysTasks,
  getOverdueTasks,
  createTask,
  completeTask,
  updateTask,
  getPipelineStats,
} from '@/lib/admin/pipeline';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const mGlobal: any = (globalThis as any).__pipeMock || {};
    const resolveBase = (table: string) => {
      const m: any = (globalThis as any).__pipeMock || {};
      switch (table) {
        case 'pipeline_leads': return m.pipeline_leads || [];
        case 'pipeline_tasks': return m.pipeline_tasks || [];
        case 'pipeline_activities': return m.pipeline_activities || [];
        default: return [];
      }
    };
    const makeChain = (table: string) => {
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
          else if (f.type === 'gte') data = data.filter((r: any) => r[f.col] >= f.val);
          else if (f.type === 'lte') data = data.filter((r: any) => r[f.col] <= f.val);
          else if (f.type === 'lt') data = data.filter((r: any) => r[f.col] < f.val);
          else if (f.type === 'in') data = data.filter((r: any) => f.val.includes(r[f.col]));
          else if (f.type === 'not_is_null') data = data.filter((r: any) => r[f.col] !== null && r[f.col] !== undefined);
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
        if (state.joinSelect && state.joinSelect.includes('lead:pipeline_leads') && Array.isArray(data)) {
          const leads = resolveBase('pipeline_leads');
          data = data.map((t: any) => ({ ...t, lead: leads.find((l: any) => l.id === t.lead_id) || t.lead }));
        }
        return data;
      };
      const chain: any = {
        select: (fields?: string) => { state.joinSelect = fields || null; return chain; },
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return chain; },
        in: (col: string, val: any[]) => { state.filters.push({ type: 'in', col, val }); return chain; },
        gte: (col: string, val: any) => { state.filters.push({ type: 'gte', col, val }); return chain; },
        lte: (col: string, val: any) => { state.filters.push({ type: 'lte', col, val }); return chain; },
        lt: (col: string, val: any) => { state.filters.push({ type: 'lt', col, val }); return chain; },
        order: (key: string, opts: any) => { state.orders.push({ key, asc: !!(opts && opts.ascending) }); return chain; },
        range: (start: number, end: number) => { state.rangeStart = start; state.rangeEnd = end; return chain; },
        limit: (n: number) => { state.limitN = n; return chain; },
        single: () => {
          const base = resolveBase(table);
          const d = apply(base);
          const mraw: any = (globalThis as any).__pipeMock || {};
          if (mraw.singleError && mraw.singleTable === table) return { data: null, error: mraw.singleError };
          return { data: d[0] || null, error: null };
        },
        insert: (row: any) => ({
          select: () => ({
            single: () => {
              const mraw: any = (globalThis as any).__pipeMock || {};
              mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
              mraw.__state.inserts[table] = mraw.__state.inserts[table] || [];
              const id = row.id || `${table.slice(0, 2)}_${Date.now()}`;
              const record = { id, ...row };
              const base = resolveBase(table);
              base.push(record);
              (globalThis as any).__pipeMock = { ...mraw, [table]: base, __state: mraw.__state };
              mraw.__state.inserts[table].push(record);
              return { data: record, error: null };
            },
          }),
        }),
        update: (updates: any) => ({
          eq: (col: string, val: any) => {
            const mraw: any = (globalThis as any).__pipeMock || {};
            mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
            const base = resolveBase(table);
            let updated: any = null;
            for (let i = 0; i < base.length; i++) {
              if (base[i][col] === val) {
                base[i] = { ...base[i], ...updates };
                updated = base[i];
                break;
              }
            }
            (globalThis as any).__pipeMock = { ...mraw, [table]: base, __state: mraw.__state };
            mraw.__state.updates[table] = mraw.__state.updates[table] || [];
            mraw.__state.updates[table].push({ where: { col, val }, updates });
            return {
              select: () => ({
                single: () => ({ data: updated || { id: val, ...updates }, error: null }),
              }),
            };
          },
        }),
        delete: () => ({
          eq: (col: string, val: any) => {
            const mraw: any = (globalThis as any).__pipeMock || {};
            mraw.__state = mraw.__state || { inserts: {}, updates: {}, deletes: {} };
            const base = resolveBase(table);
            const filtered = base.filter((r: any) => r[col] !== val);
            (globalThis as any).__pipeMock = { ...mraw, [table]: filtered, __state: mraw.__state };
            mraw.__state.deletes[table] = mraw.__state.deletes[table] || [];
            mraw.__state.deletes[table].push({ where: { col, val } });
            return { error: null };
          },
        }),
        or: (_expr: string) => chain,
        not: (col: string, op: string, val: any) => { if (op === 'is' && val === null) state.filters.push({ type: 'not_is_null', col }); return chain; },
        then: (resolve: any) => {
          const base = resolveBase(table);
          return resolve({ data: apply(base), error: null, count: base.length });
        },
      };
      return chain;
    };
    return { from: (table: string) => makeChain(table) };
  };
  return { createAdminClient: jest.fn(() => build()) };
});

describe('pipeline: overview and leads', () => {
  beforeEach(() => { (globalThis as any).__pipeMock = {}; });

  it('groups leads by stage, attaches next_task, and computes stats', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [
        { id: 'l1', agent_id: 'a1', stage: 'new', stage_changed_at: new Date().toISOString(), estimated_value_cents: 10000 },
        { id: 'l2', agent_id: 'a1', stage: 'qualified', stage_changed_at: new Date().toISOString(), estimated_value_cents: 20000 },
        { id: 'l3', agent_id: 'a1', stage: 'won', stage_changed_at: new Date().toISOString(), estimated_value_cents: 30000 },
        { id: 'l4', agent_id: 'a1', stage: 'lost', stage_changed_at: new Date().toISOString(), estimated_value_cents: 40000 },
      ],
      pipeline_tasks: [
        { id: 't1', lead_id: 'l1', is_completed: false, due_date: new Date().toISOString().split('T')[0] },
      ],
    };
    const res = await getPipelineOverview('a1');
    expect(res.stages.new.length).toBe(1);
    expect(res.stages.qualified.length).toBe(1);
    expect(res.stages.won.length).toBe(1);
    expect(res.stages.lost.length).toBe(1);
    expect(res.stages.new[0].next_task?.id).toBe('t1');
    expect(res.stats.total_leads).toBe(2);
    expect(res.stats.win_rate).toBe(50);
    const newStageStats = res.stats.stages.find(s => s.stage === 'new');
    expect(newStageStats?.value_cents).toBe(10000);
  });

  it('throws when overview query errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              then: (resolve: any) => resolve({ data: null, error: new Error('bad'), count: 0 }),
            }),
          }),
        }),
      }),
    }));
    await expect(getPipelineOverview('a1')).rejects.toThrow(/Failed to get pipeline: bad/);
    supabase.createAdminClient = original;
  });

  it('filters leads by stage, source, and supports pagination', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [
        { id: 'l1', agent_id: 'a1', stage: 'new', source: 'web', stage_changed_at: new Date().toISOString(), created_at: '2025-01-02' },
        { id: 'l2', agent_id: 'a1', stage: 'qualified', source: 'referral', stage_changed_at: new Date().toISOString(), created_at: '2025-01-03' },
      ],
    };
    const qualified = await getLeads('a1', { stage: 'qualified' as any });
    expect(qualified.length).toBe(1);
    expect(qualified[0].id).toBe('l2');
    const web = await getLeads('a1', { source: 'web' });
    expect(web.length).toBe(1);
    expect(web[0].id).toBe('l1');
    const paged = await getLeads('a1', { limit: 1 });
    expect(paged.length).toBe(1);
  });
});

describe('pipeline: lead detail and CRUD', () => {
  beforeEach(() => { (globalThis as any).__pipeMock = {}; });

  it('gets single lead with next_task, returns null on PGRST116', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [{ id: 'l1', agent_id: 'a1', stage: 'new', stage_changed_at: new Date().toISOString() }],
      pipeline_tasks: [{ id: 't1', lead_id: 'l1', is_completed: false, due_date: '2025-01-10' }],
    };
    const lead = await getLead('l1');
    expect(lead?.next_task?.id).toBe('t1');
    (globalThis as any).__pipeMock.singleError = { code: 'PGRST116', message: 'not found' };
    (globalThis as any).__pipeMock.singleTable = 'pipeline_leads';
    const none = await getLead('missing');
    expect(none).toBeNull();
  });

  it('throws when getLead returns non-PGRST116 error', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [],
    };
    (globalThis as any).__pipeMock.singleError = { code: 'OTHER', message: 'oops' };
    (globalThis as any).__pipeMock.singleTable = 'pipeline_leads';
    await expect(getLead('missing')).rejects.toThrow(/Failed to get lead: oops/);
  });

  it('creates lead, logs activity, and creates initial follow-up task', async () => {
    (globalThis as any).__pipeMock = { pipeline_leads: [], pipeline_tasks: [], pipeline_activities: [] };
    const res = await createLead('a1', { company_name: 'ACME', email: 'c@acme.com' });
    expect(res.stage).toBe('new');
    const state = (globalThis as any).__pipeMock.__state;
    expect(state.inserts.pipeline_activities.length).toBeGreaterThanOrEqual(1);
    expect(state.inserts.pipeline_tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('updates lead stage and logs stage_change activity', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [{ id: 'l1', stage: 'new', stage_changed_at: new Date().toISOString() }],
      pipeline_activities: [],
    };
    const res = await updateLead('l1', 'a1', { stage: 'qualified' as any });
    expect(res.stage).toBe('qualified');
    const state = (globalThis as any).__pipeMock.__state;
    expect(state.updates.pipeline_leads.length).toBeGreaterThanOrEqual(1);
  });

  it('deletes a lead and dependent records', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [{ id: 'l1' }],
      pipeline_tasks: [{ id: 't1', lead_id: 'l1' }],
      pipeline_activities: [{ id: 'a1', lead_id: 'l1' }],
    };
    await expect(deleteLead('l1')).resolves.toBeUndefined();
    const mock = (globalThis as any).__pipeMock;
    expect(mock.pipeline_leads.find((l: any) => l.id === 'l1')).toBeUndefined();
    expect(mock.pipeline_tasks.find((t: any) => t.lead_id === 'l1')).toBeUndefined();
  });
});

describe('pipeline: activities and tasks', () => {
  beforeEach(() => { (globalThis as any).__pipeMock = {}; });

  it('logs activity and updates last_contact_at for contact activities', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_activities: [],
      pipeline_leads: [{ id: 'l1' }],
    };
    const activity = await logActivity('l1', 'a1', 'call' as any, 'Called customer');
    expect(activity.activity_type).toBe('call');
    const state = (globalThis as any).__pipeMock.__state;
    expect(state.updates.pipeline_leads.length).toBeGreaterThanOrEqual(1);
  });

  it('logs note activity without updating lead', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_activities: [],
      pipeline_leads: [{ id: 'l1' }],
    };
    const activity = await logActivity('l1', 'a1', 'note' as any, 'Left note');
    expect(activity.activity_type).toBe('note');
    const state = (globalThis as any).__pipeMock.__state;
    const updates = state?.updates?.pipeline_leads || [];
    expect(updates.length).toBe(0);
  });

  it('gets lead activities ordered by created_at', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_activities: [
        { id: 'a1', lead_id: 'l1', created_at: '2025-01-02' },
        { id: 'a2', lead_id: 'l1', created_at: '2025-01-03' },
      ],
    };
    const list = await getLeadActivities('l1');
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('a2');
  });

  it('throws when activities query errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ then: (resolve: any) => resolve({ data: null, error: new Error('bad') }) }),
          }),
        }),
      }),
    }));
    await expect(getLeadActivities('l1')).rejects.toThrow(/Failed to get activities: bad/);
    supabase.createAdminClient = original;
  });

  it('gets lead tasks, today tasks, and overdue tasks', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    (globalThis as any).__pipeMock = {
      pipeline_tasks: [
        { id: 't1', lead_id: 'l1', agent_id: 'a1', is_completed: false, due_date: today },
        { id: 't2', lead_id: 'l1', agent_id: 'a1', is_completed: false, due_date: yesterday },
        { id: 't3', lead_id: 'l1', agent_id: 'a1', is_completed: true, due_date: today },
      ],
      pipeline_leads: [{ id: 'l1' }],
    };
    const tasks = await getLeadTasks('l1');
    expect(tasks.map(t => t.id)).toContain('t1');
    expect(tasks.map(t => t.id)).not.toContain('t3');
    const todayTasks = await getTodaysTasks('a1');
    expect(todayTasks.find(t => t.id === 't1')).toBeTruthy();
    const overdue = await getOverdueTasks('a1');
    expect(overdue.find(t => t.id === 't2')).toBeTruthy();
  });
  it('includes completed tasks when flag enabled', async () => {
    const today = new Date().toISOString().split('T')[0];
    (globalThis as any).__pipeMock = {
      pipeline_tasks: [
        { id: 't1', lead_id: 'l1', agent_id: 'a1', is_completed: true, due_date: today },
      ],
      pipeline_leads: [{ id: 'l1' }],
    };
    const tasks = await getLeadTasks('l1', true);
    expect(tasks.map(t => t.id)).toContain('t1');
  });

  it('creates, completes, and updates tasks', async () => {
    (globalThis as any).__pipeMock = { pipeline_tasks: [], pipeline_activities: [] };
    const due = new Date().toISOString().split('T')[0];
    const created = await createTask('l1', 'a1', { task_type: 'call' as any, description: 'Follow-up', due_date: due });
    expect(created.task_type).toBe('call');
    const completed = await completeTask(created.id, 'a1');
    expect(completed.is_completed).toBeTruthy();
    const updated = await updateTask(created.id, { description: 'Updated desc' });
    expect(updated.description).toBe('Updated desc');
  });

  it('throws when createTask insert errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => ({ data: null, error: { message: 'insert bad' } }),
          }),
        }),
      }),
    }));
    await expect(createTask('l1', 'a1', { task_type: 'call' as any, due_date: '2025-01-01' })).rejects.toThrow(/Failed to create task: insert bad/);
    supabase.createAdminClient = original;
  });

  it('throws when updateTask update errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => ({ data: null, error: { message: 'update bad' } }),
            }),
          }),
        }),
      }),
    }));
    await expect(updateTask('t1', { description: 'x' })).rejects.toThrow(/Failed to update task: update bad/);
    supabase.createAdminClient = original;
  });

  it('throws when completeTask update errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => ({ data: null, error: { message: 'complete bad' } }),
            }),
          }),
        }),
      }),
    }));
    await expect(completeTask('t1', 'a1')).rejects.toThrow(/Failed to complete task: complete bad/);
    supabase.createAdminClient = original;
  });

  it('throws when logActivity insert errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: (table: string) => ({
        insert: () => ({
          select: () => ({
            single: () => ({ data: null, error: { message: 'activity bad' } }),
          }),
        }),
        update: () => ({ eq: () => ({}) }),
      }),
    }));
    await expect(logActivity('l1', 'a1', 'call' as any, 'x')).rejects.toThrow(/Failed to log activity: activity bad/);
    supabase.createAdminClient = original;
  });

  it('throws when todaysTasks query errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              lte: () => ({
                order: () => ({ then: (resolve: any) => resolve({ data: null, error: new Error('bad') }) }),
              }),
            }),
          }),
        }),
      }),
    }));
    await expect(getTodaysTasks('a1')).rejects.toThrow(/Failed to get today's tasks: bad/);
    supabase.createAdminClient = original;
  });

  it('throws when overdueTasks query errors', async () => {
    const supabase = require('@/lib/supabase/server');
    const original = supabase.createAdminClient;
    supabase.createAdminClient = jest.fn(() => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              lt: () => ({
                order: () => ({ then: (resolve: any) => resolve({ data: null, error: new Error('bad') }) }),
              }),
            }),
          }),
        }),
      }),
    }));
    await expect(getOverdueTasks('a1')).rejects.toThrow(/Failed to get overdue tasks: bad/);
    supabase.createAdminClient = original;
  });

  it('moves lead to lost with reason and to won sets converted_at', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [{ id: 'l1', stage: 'new', stage_changed_at: new Date().toISOString() }],
      pipeline_activities: [],
    };
    const lost = await (await import('@/lib/admin/pipeline')).moveLeadToStage('l1', 'a1', 'lost' as any, { lost_reason: 'price' });
    expect(lost.stage).toBe('lost');
    expect(lost.lost_reason).toBe('price');
    const won = await (await import('@/lib/admin/pipeline')).moveLeadToStage('l1', 'a1', 'won' as any);
    expect(won.stage).toBe('won');
    expect(won.converted_at).toBeDefined();
  });
});

describe('pipeline: stats proxy', () => {
  beforeEach(() => { (globalThis as any).__pipeMock = {}; });
  it('returns stats from overview', async () => {
    (globalThis as any).__pipeMock = {
      pipeline_leads: [{ id: 'l1', agent_id: 'a1', stage: 'new', stage_changed_at: new Date().toISOString(), estimated_value_cents: 100 }],
      pipeline_tasks: [],
    };
    const stats = await getPipelineStats('a1');
    expect(stats.total_leads).toBeGreaterThanOrEqual(0);
  });
});
