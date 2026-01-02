import { getLeads, createLead, updateLeadStatus } from '@/lib/admin/leads';

jest.mock('@/lib/supabase/server', () => {
  const state: any = {
    eqCalls: [] as any[],
    activityInserts: 0,
    lastStatusSelect: false,
  };
  const leadsTable = {
    select: (fields?: any) => {
      state.lastStatusSelect = fields === 'status';
      return leadsQuery;
    },
    insert: (data: any) => ({
      select: () => ({
        single: () => ({ data: { id: 'lead-1', ...data }, error: null }),
      }),
    }),
    update: (updates: any) => ({
      eq: () => ({
        select: () => ({
          single: () => ({ data: { id: 'lead-1', ...updates }, error: null }),
        }),
      }),
    }),
  };
  const leadsQuery = {
    is: () => leadsQuery,
    order: () => leadsQuery,
    eq: (col: string, val: any) => {
      state.eqCalls.push([col, val]);
      return leadsQuery;
    },
    range: () =>
      Promise.resolve({
        data: [{ id: 'l1' }],
        error: null,
        count: 1,
      }),
    single: () => {
      if (state.lastStatusSelect) {
        state.lastStatusSelect = false;
        return { data: { status: 'new' }, error: null };
      }
      return { data: { id: 'l1' }, error: null };
    },
  };
  const activitiesTable = {
    insert: () => {
      state.activityInserts += 1;
      return {};
    },
  };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'tc_leads') return leadsTable as any;
        if (table === 'lead_activities') return activitiesTable as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin leads: filters, create, status updates', () => {
  it('filters leads by agent when not management', async () => {
    const res = await getLeads({ agentId: 'agent-1', isManagement: false });
    expect(res.total).toBe(1);
    const { __state } = require('@/lib/supabase/server');
    expect(__state.eqCalls.some(([c, v]: any[]) => c === 'agent_id' && v === 'agent-1')).toBe(true);
  });

  it('creates a lead and logs activity', async () => {
    const lead = await createLead('agent-1', {
      company_name: 'Co',
      contact_name: 'Alice',
    } as any);
    expect(lead.id).toBe('lead-1');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.activityInserts).toBeGreaterThan(0);
  });

  it('updates lead status and logs change', async () => {
    const updated = await updateLeadStatus('lead-1', 'contacted' as any, 'agent-1');
    expect(updated.status).toBe('contacted');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.activityInserts).toBeGreaterThan(0);
  });
});
