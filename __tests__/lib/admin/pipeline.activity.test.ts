import { logActivity } from '@/lib/admin/pipeline';

jest.mock('@/lib/supabase/server', () => {
  const state: any = { updates: [] };
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        if (table === 'pipeline_activities') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: () => ({ data: { id: 'act-1', ...row }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'pipeline_leads') {
          return {
            update: (updates: any) => ({
              eq: (col: string, val: any) => {
                state.updates.push({ where: { col, val }, updates });
                return {};
              },
            }),
          } as any;
        }
        return {} as any;
      },
    })),
    __state: state,
  };
});

describe('admin pipeline: activity logging', () => {
  beforeEach(() => {
    const supabase = require('@/lib/supabase/server');
    supabase.__state.updates = [];
  });

  it('logs contact activity and updates lead last_contact_at', async () => {
    const supabase = require('@/lib/supabase/server');
    const before = supabase.__state.updates.length;
    const act = await logActivity('lead-1', 'agent-1', 'email', 'follow-up');
    expect(act.activity_type).toBe('email');
    expect(supabase.__state.updates.length).toBeGreaterThan(before);
    const last = supabase.__state.updates[supabase.__state.updates.length - 1];
    expect(last.where.col).toBe('id');
    expect(last.updates.updated_at).toBeTruthy();
  });

  it('logs non-contact activity without updating lead', async () => {
    const supabase = require('@/lib/supabase/server');
    const before = supabase.__state.updates.length;
    const act = await logActivity('lead-2', 'agent-1', 'note', 'internal note');
    expect(act.activity_type).toBe('note');
    expect(supabase.__state.updates.length).toBe(before);
  });
});
