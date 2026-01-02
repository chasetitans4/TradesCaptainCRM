import { setSaleAttribution } from '@/lib/admin/commissions';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { lastUpdate: null, lastInsert: null };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'crm_accounts' || table === 'web_customers') {
          return {
            update: (updates: any) => {
              state.lastUpdate = { table, updates };
              return { eq: () => ({}) };
            },
          } as any;
        }
        if (table === 'sales_attribution_log') {
          return {
            insert: (payload: any) => {
              state.lastInsert = payload;
              return {};
            },
          } as any;
        }
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin commissions: setSaleAttribution', () => {
  it('sets company attribution for CRM account and logs', async () => {
    await setSaleAttribution('crm', 'acc-1', 'company', 'admin-1', 100, 'blue_starter', 'note');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.lastUpdate.table).toBe('crm_accounts');
    expect(__state.lastUpdate.updates.company_sale).toBe(true);
    expect(__state.lastInsert.crm_account_id).toBe('acc-1');
    expect(__state.lastInsert.attributed_to).toBe('company');
  });

  it('sets agent attribution for Web customer and logs', async () => {
    await setSaleAttribution('web', 'cust-1', 'agent-9', 'admin-1', 200, 'web_pro', 'note');
    const { __state } = require('@/lib/supabase/server');
    expect(__state.lastUpdate.table).toBe('web_customers');
    expect(__state.lastUpdate.updates.company_sale).toBe(false);
    expect(__state.lastUpdate.updates.agent_id).toBe('agent-9');
    expect(__state.lastInsert.web_customer_id).toBe('cust-1');
    expect(__state.lastInsert.agent_id).toBe('agent-9');
  });
});

