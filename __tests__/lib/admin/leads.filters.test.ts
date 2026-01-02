import { getLeads, convertLead, getLeadStats, updateLead } from '@/lib/admin/leads';

jest.mock('@/lib/supabase/server', () => {
  const build = () => {
    const m: any = (globalThis as any).__lfMock || {};
    const baseLeads: any[] = m.leads || [];
    const state: any = {
      table: 'tc_leads',
      filters: [],
      search: null as string | null,
      range: null as { start: number; end: number } | null,
      orderBy: { key: 'created_at', asc: false },
    };
    const applyFilters = (arr: any[]) => {
      let rows = arr.slice();
      for (const f of state.filters) {
        if (f.type === 'eq') {
          rows = rows.filter(r => r[f.col] === f.val);
        } else if (f.type === 'is') {
          if (f.val === null) {
            rows = rows.filter(r => r[f.col] == null);
          }
        }
      }
      if (state.search) {
        const q = state.search.toLowerCase();
        rows = rows.filter(r =>
          (r.company_name || '').toLowerCase().includes(q) ||
          (r.contact_name || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q)
        );
      }
      // Order
      rows = rows.sort((a, b) => {
        const av = a[state.orderBy.key];
        const bv = b[state.orderBy.key];
        return state.orderBy.asc ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
      });
      // Range
      if (state.range) {
        rows = rows.slice(state.range.start, state.range.end + 1);
      }
      return rows;
    };
    const chain: any = {
      from: (table: string) => {
        state.table = table;
        return chain;
      },
      select: (_fields?: string, _opts?: any) => chain,
      is: (col: string, val: any) => {
        state.filters.push({ type: 'is', col, val });
        return chain;
      },
      order: (key: string, opts: any) => {
        state.orderBy = { key, asc: !!(opts && opts.ascending) };
        return chain;
      },
      eq: (col: string, val: any) => {
        state.filters.push({ type: 'eq', col, val });
        return chain;
      },
      or: (expr: string) => {
        const match = expr.match(/\.ilike\.\%(.+?)\%/);
        state.search = match ? match[1] : null;
        return chain;
      },
      range: (start: number, end: number) => {
        state.range = { start, end };
        return chain;
      },
      then: (resolve: any) => {
        const data = applyFilters(baseLeads);
        return resolve({ data, error: null, count: baseLeads.filter(r => r.deleted_at == null).length });
      },
      insert: (row: any) => {
        if (state.table === 'lead_activities') {
          const arr = m.lead_activities || [];
          arr.push({ id: `la_${Date.now()}`, ...row });
          (globalThis as any).__lfMock = { ...m, lead_activities: arr };
          return { then: (resolve: any) => resolve({ data: row, error: null }) };
        }
        return { then: (resolve: any) => resolve({ data: null, error: null }) };
      },
      update: (updates: any) => {
        const uState: any = { filters: [] as any[] };
        const uChain: any = {
          eq: (col: string, val: any) => {
            uState.filters.push({ type: 'eq', col, val });
            return uChain;
          },
          is: (col: string, val: any) => {
            uState.filters.push({ type: 'is', col, val });
            return uChain;
          },
          select: () => ({
            single: () => {
              const idx = baseLeads.findIndex(r =>
                uState.filters.every((f: any) => {
                  if (f.type === 'eq') return r[f.col] === f.val;
                  if (f.type === 'is') return f.val === null ? r[f.col] == null : r[f.col] === f.val;
                  return true;
                })
              );
              if (idx >= 0) {
                baseLeads[idx] = { ...baseLeads[idx], ...updates };
                return { data: baseLeads[idx], error: null };
              }
              return { data: null, error: { message: 'not found' } };
            },
          }),
        };
        return uChain;
      },
      rpc: (_name: string, _args: any) => 0,
    };
    return chain;
  };
  return { createAdminClient: jest.fn(() => build()) };
});

describe('admin leads: filters and search', () => {
  beforeEach(() => { (globalThis as any).__lfMock = {}; });

  it('applies agent filtering for non-management', async () => {
    (globalThis as any).__lfMock = {
      leads: [
        { id: 'l1', agent_id: 'a1', status: 'new', source: 'referral', company_name: 'Alpha', contact_name: 'Ann', email: 'ann@alpha.com', created_at: '2025-01-03', deleted_at: null },
        { id: 'l2', agent_id: 'a2', status: 'contacted', source: 'google_ads', company_name: 'Beta', contact_name: 'Bob', email: 'bob@beta.com', created_at: '2025-01-02', deleted_at: null },
      ],
    };
    const res = await getLeads({ agentId: 'a1', isManagement: false, page: 1, limit: 25 });
    expect(res.total).toBe(2);
    expect(res.leads.length).toBe(1);
    expect(res.leads[0].agent_id).toBe('a1');
  });

  it('applies management filtering by agent, status, source, and search', async () => {
    (globalThis as any).__lfMock = {
      leads: [
        { id: 'l1', agent_id: 'a1', status: 'contacted', source: 'referral', company_name: 'Alpha Plumbing', contact_name: 'Alice', email: 'alice@example.com', created_at: '2025-01-04', deleted_at: null },
        { id: 'l2', agent_id: 'a1', status: 'new', source: 'google_ads', company_name: 'Bright Co', contact_name: 'Ben', email: 'ben@bright.com', created_at: '2025-01-03', deleted_at: null },
        { id: 'l3', agent_id: 'a2', status: 'qualified', source: 'referral', company_name: 'Cobalt LLC', contact_name: 'Cara', email: 'cara@cobalt.com', created_at: '2025-01-02', deleted_at: null },
      ],
    };
    const res = await getLeads({ agentId: 'a1', isManagement: true, status: 'contacted' as any, source: 'referral' as any, search: 'Alpha', page: 1, limit: 25 });
    expect(res.leads.length).toBe(1);
    expect(res.leads[0].id).toBe('l1');
  });
});

describe('admin leads: convert branches and stats', () => {
  beforeEach(() => { (globalThis as any).__lfMock = {}; });

  it('converts lead to web customer and crm customer', async () => {
    (globalThis as any).__lfMock = {
      leads: [
        { id: 'l9', agent_id: 'a9', status: 'qualified', created_at: '2025-01-01', deleted_at: null },
      ],
    };
    const web = await convertLead('l9', 'a9', 'acc-web', 'web');
    expect(web.web_customer_id).toBe('acc-web');
    const crm = await convertLead('l9', 'a9', 'acc-crm', 'crm');
    expect(crm.crm_account_id).toBe('acc-crm');
  });

  it('computes stats with and without agent filter', async () => {
    (globalThis as any).__lfMock = {
      leads: [
        { id: 'l1', agent_id: 'a1', status: 'new', created_at: '2025-01-01', deleted_at: null },
        { id: 'l2', agent_id: 'a1', status: 'contacted', created_at: '2025-01-02', deleted_at: null },
        { id: 'l3', agent_id: 'a2', status: 'won', created_at: '2025-01-03', deleted_at: null },
        { id: 'l4', agent_id: 'a2', status: 'lost', created_at: '2025-01-04', deleted_at: null },
      ],
    };
    const all = await getLeadStats();
    expect(all.total).toBe(4);
    const a1 = await getLeadStats('a1');
    expect(a1.total).toBe(2);
    expect(a1.contacted).toBe(1);
  });
});

describe('admin leads: update with agent ownership', () => {
  beforeEach(() => { (globalThis as any).__lfMock = {}; });

  it('updates lead when agentId matches', async () => {
    (globalThis as any).__lfMock = {
      leads: [
        { id: 'u1', agent_id: 'ag1', email: 'Old@Example.com', company_name: 'Old Co', created_at: '2025-01-01', deleted_at: null },
      ],
    };
    const updated = await updateLead('u1', { email: 'New@Example.com', company_name: 'New Co' }, 'ag1');
    expect(updated.email).toBe('new@example.com');
    expect(updated.company_name).toBe('New Co');
  });
});
