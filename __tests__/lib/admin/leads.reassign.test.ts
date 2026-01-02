import { reassignLead, bulkReassignLeads, deleteLead, getLeadStats, logLeadContact } from '@/lib/admin/leads';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { inserts: [], updates: [], eqCalls: [] };
  const leadsTable = {
    select: (fields?: string) => {
      if (fields === 'status') {
        // return thenable chain used by getLeadStats
        const chain: any = {
          is: () => chain,
          eq: () => ({
            then: (resolve: any) => {
              resolve({
                data: [
                  { status: 'new' },
                  { status: 'contacted' },
                  { status: 'qualified' },
                  { status: 'won' },
                  { status: 'won' },
                  { status: 'lost' },
                ],
              });
            },
          }),
        };
        return chain;
      }
      return {
        eq: () => ({
          single: () => ({ data: { agent_id: 'agent-old' }, error: null }),
        }),
      };
    },
    update: (updates: any) => ({
      eq: () => ({
        select: () => ({
          single: () => ({ data: { id: 'lead-1', ...updates }, error: null }),
        }),
      }),
    }),
  };
  const leadReassignments = {
    insert: (data: any) => {
      state.inserts.push({ table: 'lead_reassignments', data });
      return {};
    },
  };
  const leadActivities = {
    insert: (data: any) => {
      state.inserts.push({ table: 'lead_activities', data });
      return {};
    },
  };
  const leadsStats = {
    select: () => ({
      is: () => ({
        eq: () => ({
          then: () => {},
        }),
      }),
    }),
  };
  return {
    createAdminClient: jest.fn(() => ({
      rpc: jest.fn(() => 1),
      from: (table: string) => {
        if (table === 'tc_leads') return leadsTable as any;
        if (table === 'lead_reassignments') return leadReassignments as any;
        if (table === 'lead_activities') return leadActivities as any;
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin leads: reassign and stats', () => {
  it('reassigns lead and logs activity', async () => {
    const lead = await reassignLead('lead-1', { to_agent_id: 'agent-new', reason: 'load' } as any, 'admin-1');
    expect(lead.assigned_at).toBeTruthy();
    const { __state } = require('@/lib/supabase/server');
    const hasReassignment = __state.inserts.some((i: any) => i.table === 'lead_reassignments');
    const hasActivity = __state.inserts.some((i: any) => i.table === 'lead_activities');
    expect(hasReassignment).toBe(true);
    expect(hasActivity).toBe(true);
  });

  it('bulk reassign returns success count', async () => {
    const res = await bulkReassignLeads(['l1', 'l2'], 'agent-new', 'performance', 'admin-1');
    expect(res.success).toBe(2);
  });

  it('soft deletes lead', async () => {
    const supabase = require('@/lib/supabase/server');
    const client = supabase.createAdminClient();
    const table = client.from('tc_leads');
    const updateSpy = jest.spyOn(table, 'update');
    await deleteLead('lead-1');
    expect(updateSpy).toHaveBeenCalled();
  });

  it('logs contact activity', async () => {
    await logLeadContact('lead-1', 'agent-1', 'called');
    const { __state } = require('@/lib/supabase/server');
    const hasActivity = __state.inserts.some((i: any) => i.table === 'lead_activities');
    expect(hasActivity).toBe(true);
  });

  it('computes lead stats by status', async () => {
    const stats = await getLeadStats('agent-1');
    expect(stats.total).toBe(6);
    expect(stats.new).toBe(1);
    expect(stats.contacted).toBe(1);
    expect(stats.qualified).toBe(1);
    expect(stats.won).toBe(2);
    expect(stats.lost).toBe(1);
  });
});
