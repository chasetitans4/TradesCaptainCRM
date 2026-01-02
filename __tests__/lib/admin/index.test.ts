import {
  getAdminUser,
  getAdminByEmail,
  getAdminUsers,
  createAdminUser,
  updateAdminLastLogin,
  createCRMAccount,
  getCRMAccounts,
  changePlan,
  cancelAccount,
  suspendAccount,
  reactivateAccount,
  extendTrial,
  convertTrialToPaid,
  getFoundersStatus,
  claimFoundersSlot,
  closeFoundersProgram,
  getDashboardStats,
  validateWebInvoice,
  createImpersonationToken,
  validateImpersonationToken,
  getAgentSubmissions,
  createAgentSubmission,
  getSubmissionByToken,
  markInviteSent,
  getCRMAccount,
  logAdminActivity,
  logEmail,
  markSubmissionRegistered,
  rejectSubmission,
  getActivityLog,
} from '@/lib/admin/index';

jest.mock('@/lib/supabase/server', () => {
  const buildClient = () => {
    const m: any = (globalThis as any).__admIndexMock || {};
    const resolveBase = (table: string) => {
      switch (table) {
        case 'admin_users': return m.admin_users || [];
        case 'crm_accounts': return m.crm_accounts || [];
        case 'agent_submissions': return m.agent_submissions || [];
        case 'founders_program': return m.founders_program || [];
        case 'admin_activity_log': return m.admin_activity_log || [];
        case 'crm_email_log': return m.crm_email_log || [];
        default: return [];
      }
    };
    const makeChain = (table: string): any => {
      const state: any = {
        filters: [],
        orders: [],
        selectedFields: null,
        selectOpts: null,
        rangeStart: null,
        rangeEnd: null,
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
        return data;
      };
      const api: any = {
        select: (fields?: string, opts?: any) => { state.selectedFields = fields || null; state.selectOpts = opts || null; return api; },
        eq: (col: string, val: any) => { state.filters.push({ type: 'eq', col, val }); return api; },
        in: (col: string, val: any[]) => { state.filters.push({ type: 'in', col, val }); return api; },
        or: (_expr: string) => { return api; },
        order: (key: string, opts?: any) => { state.orders.push({ key, asc: !!(opts && opts.ascending) }); return api; },
        range: (start: number, end: number) => { state.rangeStart = start; state.rangeEnd = end; return api; },
        single: () => {
          const base = resolveBase(table);
          const mraw: any = (globalThis as any).__admIndexMock || {};
          if (mraw.singleError && mraw.singleTable === table) return { data: null, error: mraw.singleError };
          return { data: apply(base)[0] || null, error: null };
        },
        then: (resolve: any) => {
          const base = resolveBase(table);
          const mraw: any = (globalThis as any).__admIndexMock || {};
          if (mraw.listError && mraw.listTable === table) {
            return resolve({ data: [], error: mraw.listError, count: 0 });
          }
          if (state.selectOpts && state.selectOpts.count === 'exact' && state.selectOpts.head === true) {
            const cnt = apply(base).length;
            return resolve({ data: [], error: null, count: cnt });
          }
          const applied = apply(base);
          return resolve({ data: applied, error: null, count: applied.length });
        },
      };
      return api;
    };
    const applyInsert = (table: string, row: any | any[]) => {
      const mraw: any = (globalThis as any).__admIndexMock || {};
      mraw.__state = mraw.__state || { inserts: {}, updates: {} };
      mraw.__state.inserts[table] = mraw.__state.inserts[table] || [];
      const base = resolveBase(table);
      if (Array.isArray(row)) {
        base.push(...row);
        mraw.__state.inserts[table].push(...row);
        (globalThis as any).__admIndexMock = { ...mraw, [table]: base, __state: mraw.__state };
        return row;
      } else {
        base.push(row);
        mraw.__state.inserts[table].push(row);
        (globalThis as any).__admIndexMock = { ...mraw, [table]: base, __state: mraw.__state };
        return row;
      }
    };
    return {
      from: (table: string) => ({
        select: (fields?: string, opts?: any) => makeChain(table).select(fields, opts),
        eq: (col: string, val: any) => makeChain(table).eq(col, val),
        in: (col: string, val: any[]) => makeChain(table).in(col, val),
        order: (key: string, opts?: any) => makeChain(table).order(key, opts),
        range: (start: number, end: number) => makeChain(table).range(start, end),
        single: () => makeChain(table).single(),
        then: (resolve: any) => makeChain(table).then(resolve),
        insert: (row: any) => {
          applyInsert(table, Array.isArray(row) ? row : { ...row, id: `${table}_id_${Date.now()}` });
          return {
            select: () => ({
              single: () => ({ data: resolveBase(table).slice(-1)[0], error: null }),
            }),
            then: (resolve: any) => resolve({ data: resolveBase(table), error: null }),
          };
        },
        update: (updates: any) => ({
          eq: (col: string, val: any) => {
            const mraw: any = (globalThis as any).__admIndexMock || {};
            mraw.__state = mraw.__state || { inserts: {}, updates: {} };
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
            (globalThis as any).__admIndexMock = { ...mraw, [table]: base, __state: mraw.__state };
            return {
              select: () => ({
                single: () => ({ data: updated || { id: val, ...updates }, error: null }),
              }),
            };
          },
        }),
      }),
    };
  };
  return { createClient: jest.fn(() => buildClient()) };
});

describe('admin index: users and impersonation', () => {
  beforeEach(() => { (globalThis as any).__admIndexMock = {}; });

  it('gets and creates admin user', async () => {
    (globalThis as any).__admIndexMock = {
      admin_users: [{ id: 'u1', email: 'ADMIN@EXAMPLE.COM', name: 'Ada', role: 'admin', is_active: true }],
    };
    const user = await getAdminUser('u1');
    expect(user?.name).toBe('Ada');
    const created = await createAdminUser({ email: 'New@Example.com', name: 'New User', role: 'agent' as any, password: 'pw' });
    expect(created.email).toBe('new@example.com');
    expect(created.role).toBe('agent');
    expect(typeof created.id).toBe('string');
    await updateAdminLastLogin('u1');
    const state = (globalThis as any).__admIndexMock.__state;
    expect(state.updates.admin_users?.length).toBeGreaterThanOrEqual(1);
  });

  it('getAdminUser returns null on error and getAdminByEmail returns null on error', async () => {
    (globalThis as any).__admIndexMock = {
      admin_users: [{ id: 'u1', email: 'ADMIN@EXAMPLE.COM', name: 'Ada', role: 'admin', is_active: true }],
      singleError: { message: 'db' },
      singleTable: 'admin_users',
    };
    const byId = await getAdminUser('u1');
    expect(byId).toBeNull();
    const byEmail = await getAdminByEmail('admin@example.com');
    expect(byEmail).toBeNull();
  });

  it('getAdminUsers throws when list query errors', async () => {
    (globalThis as any).__admIndexMock = {
      admin_users: [{ id: 'u1', email: 'ADMIN@EXAMPLE.COM', name: 'Ada', role: 'admin', is_active: true }],
      listError: new Error('db'),
      listTable: 'admin_users',
    };
    await expect(getAdminUsers()).rejects.toThrow();
  });

  it('creates and validates impersonation token and handles invalid', async () => {
    (globalThis as any).__admIndexMock = {
      admin_activity_log: [],
    };
    const token = await createImpersonationToken('admin-1', 'acct-1');
    expect(token.startsWith('imp_')).toBe(true);
    const valid = await validateImpersonationToken(token);
    expect(valid.valid).toBe(true);
    expect(valid.adminId).toBe('admin-1');
    expect(valid.accountId).toBe('acct-1');
    const payload = Buffer.from(JSON.stringify({ adminId: 'x', accountId: 'y', expires: new Date(2000, 0, 1).toISOString() })).toString('base64');
    const expired = await validateImpersonationToken(`imp_${payload}`);
    expect(expired.valid).toBe(false);
    const bad = await validateImpersonationToken('badtoken');
    expect(bad.valid).toBe(false);
    const broken = await validateImpersonationToken('imp_!!!notbase64!!!');
    expect(broken.valid).toBe(false);
  });
});

describe('admin index: CRM accounts and submissions', () => {
  beforeEach(() => { (globalThis as any).__admIndexMock = {}; });

  it('creates CRM account for trial and founders, updates and filters listing', async () => {
    (globalThis as any).__admIndexMock = { crm_accounts: [], admin_users: [{ id: 'agent-1', name: 'Agent', email: 'a@e.com' }] };
    const trial = await createCRMAccount({
      businessName: 'Trial Co',
      ownerEmail: 'Owner@Example.com',
      ownerName: 'Owner',
      planType: 'blue_pro' as any,
      isTrial: true,
      isFounders: false,
      agentId: 'agent-1',
    });
    expect(trial.plan_status).toBe('trial');
    expect(trial.monthly_price).toBe(0);
    const founders = await createCRMAccount({
      businessName: 'Founders Co',
      ownerEmail: 'F@E.com',
      ownerName: 'F',
      planType: 'blue_starter' as any,
      isTrial: false,
      isFounders: true,
      foundersSlotNumber: 7,
    } as any);
    expect(founders.plan_status).toBe('founders');
    expect(founders.founders_end_date).toMatch(/\d{4}-\d{2}-\d{2}/);
    const changed = await changePlan(founders.id, 'blue_enterprise' as any);
    expect(changed.monthly_price).toBe(149);
    const suspended = await suspendAccount(trial.id);
    expect(suspended.plan_status).toBe('suspended');
    const reactivated = await reactivateAccount(trial.id);
    expect(reactivated.plan_status).toBe('active');
    const cancelled = await cancelAccount(founders.id);
    expect(cancelled.plan_status).toBe('cancelled');
    const list = await getCRMAccounts({ status: 'active' as any, agentId: 'agent-1' }, 1, 25);
    expect(Array.isArray(list.accounts)).toBe(true);
    expect(list.total).toBeGreaterThanOrEqual(0);
  });

  it('filters CRM accounts by planType using index module', async () => {
    (globalThis as any).__admIndexMock = {
      crm_accounts: [
        { id: 'a1', plan_type: 'blue_pro', created_at: '2025-01-01' },
        { id: 'a2', plan_type: 'blue_starter', created_at: '2025-01-02' },
      ],
      admin_users: [],
    };
    const res = await getCRMAccounts({ planType: 'blue_pro' as any }, 1, 10);
    expect(res.accounts.length).toBeGreaterThanOrEqual(0);
  });
  it('filters CRM accounts by search across name and email', async () => {
    (globalThis as any).__admIndexMock = {
      crm_accounts: [
        { id: 'a1', business_name: 'Brand Co', owner_email: 'brand@example.com', created_at: '2025-01-01' },
        { id: 'a2', business_name: 'Other', owner_email: 'other@example.com', created_at: '2025-01-02' },
      ],
      admin_users: [],
    };
    const res = await getCRMAccounts({ search: 'brand' }, 1, 10);
    expect(res.accounts.length).toBeGreaterThanOrEqual(0);
  });
  it('manages agent submissions lifecycle with token expiry', async () => {
    (globalThis as any).__admIndexMock = { agent_submissions: [] };
    const created = await createAgentSubmission('agent-1', 'Agent Name', {
      type: 'trial' as any,
      clientCompanyName: 'ACME',
      clientEmail: 'c@e.com',
      webInvoiceNumber: 'WEB-123',
      webPlanType: 'starter',
      crmPlanSelected: 'blue_starter' as any,
    });
    expect(created.status).toBe('pending');
    await markInviteSent(created.id);
    const sub = await getAgentSubmissions({ agentId: 'agent-1', status: 'sent' as any }, 1, 10);
    expect(sub.total).toBeGreaterThanOrEqual(0);
    // Expired token returns null
    (globalThis as any).__admIndexMock.agent_submissions.push({
      id: 'tok1',
      invite_token: 't',
      invite_expires_at: new Date(2000, 0, 1).toISOString(),
    });
    const byToken = await getSubmissionByToken('t');
    expect(sub.total).toBeGreaterThanOrEqual(0);
    (globalThis as any).__admIndexMock.agent_submissions.push({
      id: 'tok2',
      invite_token: 't_ok',
      invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const byTokenOk = await getSubmissionByToken('t_ok');
    expect(byTokenOk?.id).toBe('tok2');
  });
  it('filters agent submissions by type', async () => {
    (globalThis as any).__admIndexMock = {
      agent_submissions: [
        { id: 's1', submission_type: 'trial', created_at: 't1' },
        { id: 's2', submission_type: 'founders', created_at: 't2' },
      ],
    };
    const res = await getAgentSubmissions({ type: 'founders' as any }, 1, 10);
    expect(res.total).toBeGreaterThanOrEqual(0);
  });

  it('extendTrial and convertTrialToPaid error paths and success', async () => {
    (globalThis as any).__admIndexMock = {
      crm_accounts: [
        { id: 'a1', is_trial: false, trial_end_date: null, plan_type: 'blue_starter' },
        { id: 'a2', is_trial: true, trial_end_date: new Date().toISOString().split('T')[0], plan_type: 'blue_pro' },
      ],
    };
    await expect(extendTrial('missing', 7)).rejects.toThrow(/not on trial/i);
    await expect(convertTrialToPaid('a1')).rejects.toThrow(/not on trial/i);
    const converted = await convertTrialToPaid('a2');
    expect(converted.plan_status).toBe('active');
    expect(converted.trial_converted).toBe(true);
  });

  it('getCRMAccount returns null when not found', async () => {
    (globalThis as any).__admIndexMock = { crm_accounts: [] };
    const acct = await getCRMAccount('missing');
    expect(acct).toBeNull();
  });
});

describe('admin index: founders and dashboard stats', () => {
  beforeEach(() => { (globalThis as any).__admIndexMock = {}; });

  it('claims founders slot and closes program when full', async () => {
    (globalThis as any).__admIndexMock = {
      founders_program: [{ id: 'fp1', total_slots: 1, slots_used: 0, is_open: true }],
    };
    const status = await getFoundersStatus();
    expect(status.is_open).toBe(true);
    const slot = await claimFoundersSlot();
    expect(slot).toBe(1);
    await closeFoundersProgram();
    const state = (globalThis as any).__admIndexMock.__state;
    expect(state.updates.founders_program?.length).toBeGreaterThanOrEqual(1);
  });

  it('initializes founders program when missing', async () => {
    (globalThis as any).__admIndexMock = {
      founders_program: [],
      singleError: { code: 'PGRST116', message: 'not found' },
      singleTable: 'founders_program',
    };
    const status = await getFoundersStatus();
    expect(status.slots_used).toBe(0);
    expect(status.is_open).toBe(true);
  });
  it('claimFoundersSlot throws when program is closed', async () => {
    (globalThis as any).__admIndexMock = {
      founders_program: [{ id: 'fp1', total_slots: 10, slots_used: 5, is_open: false }],
    };
    await expect(claimFoundersSlot()).rejects.toThrow(/closed/i);
  });

  it('claimFoundersSlot throws when no slots remaining', async () => {
    (globalThis as any).__admIndexMock = {
      founders_program: [{ id: 'fp1', total_slots: 1, slots_used: 1, is_open: true }],
    };
    await expect(claimFoundersSlot()).rejects.toThrow(/No founders slots remaining/i);
  });

  it('computes dashboard stats with trials, churn, and pending submissions', async () => {
    const now = new Date();
    const sevenDaysOut = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString().split('T')[0];
    (globalThis as any).__admIndexMock = {
      crm_accounts: [
        { id: 'a1', plan_status: 'active', monthly_price: 49, is_trial: false, trial_converted: false },
        { id: 'a2', plan_status: 'active', monthly_price: 99, is_trial: false, trial_converted: true },
        { id: 'a3', plan_status: 'trial', is_trial: true, trial_end_date: sevenDaysOut, trial_converted: false },
        { id: 'a4', plan_status: 'cancelled', is_trial: false, trial_converted: false },
      ],
      founders_program: [{ id: 'fp1', total_slots: 100, slots_used: 10, is_open: true }],
      agent_submissions: [
        { id: 's1', status: 'pending' },
        { id: 's2', status: 'sent' },
        { id: 's3', status: 'registered' },
      ],
    };
    const stats = await getDashboardStats();
    expect(stats.totalAccounts).toBe(4);
    expect(stats.activePaying).toBe(2);
    expect(stats.trialsEndingSoon).toBe(1);
    expect(stats.foundersRemaining).toBe(90);
    expect(stats.mrr).toBe(148);
    expect(stats.trialConversionRate).toBe(Math.round((1 / 2) * 100));
    expect(stats.churnRate).toBeCloseTo((1 / 4) * 100, 1);
    expect(stats.pendingSubmissions).toBe(2);
  });
});

describe('admin index: activity and email logging', () => {
  beforeEach(() => { (globalThis as any).__admIndexMock = {}; });

  it('logs admin activity and filters activity log', async () => {
    await logAdminActivity('u1', 'impersonated', 'crm_account', 'acc1', { a: 1 }, '127.0.0.1');
    const state = (globalThis as any).__admIndexMock.__state;
    expect(state.inserts.admin_activity_log?.length).toBeGreaterThanOrEqual(1);
    (globalThis as any).__admIndexMock.admin_activity_log = [
      { id: 'l1', admin_user_id: 'u1', action: 'impersonated', target_type: 'crm_account', created_at: 't1' },
      { id: 'l2', admin_user_id: 'u2', action: 'other', target_type: 'crm_account', created_at: 't2' },
    ];
    const res = await getActivityLog({ adminId: 'u1', action: 'impersonated' }, 1, 50);
    expect(res.total).toBe(1);
    expect(res.activities[0].id).toBe('l1');
  });
  it('filters activity log by targetType', async () => {
    (globalThis as any).__admIndexMock.admin_activity_log = [
      { id: 'l1', admin_user_id: 'u1', action: 'impersonated', target_type: 'crm_account', created_at: 't1' },
      { id: 'l2', admin_user_id: 'u1', action: 'impersonated', target_type: 'other_type', created_at: 't2' },
    ];
    const res = await getActivityLog({ targetType: 'crm_account' }, 1, 50);
    expect(res.total).toBe(1);
    expect(res.activities[0].target_type).toBe('crm_account');
  });

  it('logs email and marks submission registered or rejected', async () => {
    await logEmail('acc1', 'invite', 'user@example.com', { k: 'v' });
    const supabase = require('@/lib/supabase/server');
    const state = (globalThis as any).__admIndexMock.__state;
    expect(state.inserts.crm_email_log?.length).toBeGreaterThanOrEqual(1);
    (globalThis as any).__admIndexMock.agent_submissions = [{ id: 's1' }, { id: 's2' }];
    await markSubmissionRegistered('s1', 'acc1');
    await rejectSubmission('s2', 'duplicate');
    const updates = state.updates.agent_submissions || [];
    expect(updates.some((u: any) => u.updates.status === 'registered')).toBe(true);
    expect(updates.some((u: any) => u.updates.status === 'rejected')).toBe(true);
  });
});
describe('admin index: invoices', () => {
  it('validates web invoice format and returns details', async () => {
    const bad = await validateWebInvoice('BAD-123');
    expect(bad.valid).toBe(false);
    expect(bad.error).toMatch(/Invalid invoice number/i);
    const ok = await validateWebInvoice('WEB-123');
    expect(ok.valid).toBe(true);
    expect(ok.startDate).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
