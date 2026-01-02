import {
  getNotificationLogs,
  getNotificationQueue,
  reportAIIssue,
  getAIIssues,
  resolveAIIssue,
  getWebhookEvents,
  getOrphanedStatusEvents,
  updateForwardToNumber,
  getNeverMissSettings,
  getAIApiLogs,
  getDailyMetrics,
  checkForDuplicateEvents,
  getOrganizationStatus,
} from '@/lib/admin/nevermiss-support';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      const m: any = (globalThis as any).__nmsMock || {};
      const buildChain = (table: string) => {
        const state: any = { filters: [], orFilters: [], orderBy: null, limitN: null, selectFields: '*', lastError: null };
        const shouldNullData = () => {
          const cfg = (globalThis as any).__nmsMock || {};
          if (cfg.nullData === true) return true;
          if (cfg.nullDataTables && cfg.nullDataTables[table]) return true;
          return false;
        };
        const shouldError = (method: string) => !!(m.errors && m.errors[table] && m.errors[table][method]);
        const applyFilters = (arr: any[]) => {
          let data = Array.isArray(arr) ? [...arr] : [];
          for (const f of state.filters) {
            if (f.type === 'eq') {
              data = data.filter((row: any) => row[f.col] === f.val);
            } else if (f.type === 'lt') {
              data = data.filter((row: any) => new Date(row[f.col]).getTime() < new Date(f.val).getTime());
            } else if (f.type === 'gte') {
              data = data.filter((row: any) => new Date(row[f.col]).getTime() >= new Date(f.val).getTime());
            } else if (f.type === 'ilike') {
              const pattern = String(f.val).replace(/%/g, '').toLowerCase();
              data = data.filter((row: any) => String(row[f.col] || '').toLowerCase().includes(pattern));
            }
          }
          if (state.orFilters.length > 0) {
            data = data.filter((row: any) =>
              state.orFilters.some((cond: any) => {
                if (cond.type === 'ilike') {
                  const pattern = String(cond.val).replace(/%/g, '').toLowerCase();
                  return String(row[cond.col] || '').toLowerCase().includes(pattern);
                }
                return false;
              })
            );
          }
          if (state.orderBy) {
            data = data.sort((a: any, b: any) => {
              const k = state.orderBy.key;
              const asc = state.orderBy.asc;
              const av = a[k];
              const bv = b[k];
              const cmp = typeof av === 'string' && typeof bv === 'string'
                ? av.localeCompare(bv)
                : (av > bv ? 1 : av < bv ? -1 : 0);
              return asc ? cmp : -cmp;
            });
          }
          if (typeof state.limitN === 'number') {
            data = data.slice(0, state.limitN);
          }
          return data;
        };
        const resolveBase = () => {
          switch (table) {
            case 'notification_logs': return m.notificationLogs || [];
            case 'notification_queue': return m.notificationQueue || [];
            case 'nevermiss_conversations': return m.conversations || [];
            case 'nevermiss_messages': return m.messages || [];
            case 'ai_issues': return m.aiIssues || [];
            case 'nevermiss_events': return m.events || [];
            case 'nevermiss_settings': return m.settings || [];
            case 'ai_api_logs': return m.apiLogs || [];
            case 'nevermiss_daily_metrics': return m.dailyMetrics || [];
            case 'organizations': return m.organizations || [];
            case 'sms_delivery_failures': return m.smsFailures || [];
            case 'sms_suppression_list': return m.suppression || [];
            case 'sms_usage': return m.smsUsage || [];
            default: return [];
          }
        };
        const chain: any = {
          select: (fields?: string) => {
            state.selectFields = fields || '*';
            return chain;
          },
          eq: (col: string, val: any) => {
            state.filters.push({ type: 'eq', col, val });
            if (shouldError('eq')) state.lastError = new Error('fail');
            const d = shouldNullData() ? null : applyFilters(resolveBase());
            return Object.assign({}, chain, { data: d, error: state.lastError });
          },
          lt: (col: string, val: any) => {
            state.filters.push({ type: 'lt', col, val });
            if (shouldError('lt')) state.lastError = new Error('fail');
            const d = shouldNullData() ? null : applyFilters(resolveBase());
            return Object.assign({}, chain, { data: d, error: state.lastError });
          },
          gte: (col: string, val: any) => {
            state.filters.push({ type: 'gte', col, val });
            if (shouldError('gte')) state.lastError = new Error('fail');
            const d = shouldNullData() ? null : applyFilters(resolveBase());
            return Object.assign({}, chain, { data: d, error: state.lastError });
          },
          order: (key: string, opts: any) => {
            state.orderBy = { key, asc: !!(opts && opts.ascending) };
            if (shouldError('order')) state.lastError = new Error('fail');
            const d = shouldNullData() ? null : applyFilters(resolveBase());
            return Object.assign({}, chain, { data: d, error: state.lastError });
          },
          limit: (n: number) => {
            state.limitN = n;
            if (shouldError('limit')) state.lastError = new Error('fail');
            const d = shouldNullData() ? null : applyFilters(resolveBase());
            return Object.assign({}, chain, { data: d, error: state.lastError });
          },
          range: (_start: number, _end: number) => Promise.resolve({
            data: shouldNullData() ? null : applyFilters(resolveBase()),
            error: shouldError('range') ? new Error('fail') : state.lastError,
            count: applyFilters(resolveBase()).length,
          }),
          single: () => {
            if (m.settingsSingleError && table === 'nevermiss_settings') {
              return { error: m.settingsSingleError, data: null };
            }
            if (m.conversationSingleError && table === 'nevermiss_conversations') {
              return { error: m.conversationSingleError, data: null };
            }
            if (m.organizationSingleError && table === 'organizations') {
              return { error: m.organizationSingleError, data: null };
            }
            const data = applyFilters(resolveBase());
            return { data: data[0] || null, error: null };
          },
          ilike: (col: string, pattern: string) => {
            state.filters.push({ type: 'ilike', col, val: pattern });
            if (shouldError('ilike')) state.lastError = new Error('fail');
            return Object.assign({}, chain, { data: applyFilters(resolveBase()), error: state.lastError });
          },
          or: (expr: string) => {
            // parse "field.ilike.%x%,other.ilike.%y%"
            expr.split(',').forEach(part => {
              const [left, val] = part.split('.ilike.');
              const col = left.trim();
              const value = (val || '').trim();
              state.orFilters.push({ type: 'ilike', col, val: value });
            });
            if (shouldError('or')) state.lastError = new Error('fail');
            const d = shouldNullData() ? null : applyFilters(resolveBase());
            return Object.assign({}, chain, { data: d, error: state.lastError });
          },
          insert: (row: any) => ({
            select: () => ({
              single: () => ({ data: { id: 'new-id', ...row }, error: null }),
            }),
          }),
          update: (_row: any) => {
            const uchain: any = {
              eq: (_k: string, _v: any) => uchain,
              data: [],
              error: m.updateErrors && m.updateErrors[table] ? new Error('fail') : null,
            };
            return uchain;
          },
          delete: () => ({
            eq: (_k: string, _v: any) => ({ data: [], error: null }),
          }),
          then: (resolve: any) => resolve({ data: applyFilters(resolveBase()), error: state.lastError }),
        };
        return chain;
      };
      return {
        from: (table: string) => buildChain(table),
        rpc: (fn: string, _args: any) => {
          const m: any = (globalThis as any).__nmsMock || {};
          if (fn === 'check_duplicate_events') {
            if (m.rpcError) return { error: new Error('rpc error'), data: null };
            if (m.rpcNull) return { data: null, error: null };
            return { data: m.rpcData || [], error: null };
          }
          if (fn === 'lookup_customer_by_phone') {
            if (m.lookupByPhoneError) return { data: null, error: new Error('rpc failure') };
            return { data: m.lookupByPhoneData || [], error: null };
          }
          // unknown RPCs trigger fallback when not explicitly mocked
          return { data: null, error: new Error('unknown rpc') };
        },
      };
    }),
  };
});

describe('nevermiss-support: notifications and queue', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('returns notification logs ordered by created_at', async () => {
    (globalThis as any).__nmsMock = {
      notificationLogs: [
        { id: '1', organization_id: 'org-1', created_at: '2025-01-02T10:00:00Z' },
        { id: '2', organization_id: 'org-1', created_at: '2025-01-03T10:00:00Z' },
      ],
    };
    const rows = await getNotificationLogs('org-1', 10);
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe('2');
  });
  it('returns pending notification queue ordered by scheduled_for', async () => {
    (globalThis as any).__nmsMock = {
      notificationQueue: [
        { id: 'a', organization_id: 'org-1', status: 'pending', scheduled_for: '2025-01-05' },
        { id: 'b', organization_id: 'org-1', status: 'sent', scheduled_for: '2025-01-04' },
        { id: 'c', organization_id: 'org-1', status: 'pending', scheduled_for: '2025-01-03' },
      ],
    };
    const rows = await getNotificationQueue('org-1');
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe('c');
  });
  it('returns empty array when notification queue data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { notification_queue: true },
    };
    const rows = await getNotificationQueue('org-1');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});

describe('nevermiss-support: AI issues management', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('reports an AI issue with organization id from conversation', async () => {
    (globalThis as any).__nmsMock = {
      conversations: [{ id: 'conv-1', organization_id: 'org-9' }],
    };
    const r = await reportAIIssue('conv-1', 'incorrect_intent', 'desc', 'agent-1');
    expect(r.organization_id).toBe('org-9');
    expect(r.conversation_id).toBe('conv-1');
    expect(r.status).toBe('open');
  });
  it('lists AI issues by status and all when no status', async () => {
    (globalThis as any).__nmsMock = {
      aiIssues: [
        { id: 'i1', status: 'open', created_at: '2025-01-02' },
        { id: 'i2', status: 'resolved', created_at: '2025-01-01' },
      ],
    };
    const openRows = await getAIIssues('open', 50);
    expect(openRows.length).toBe(1);
    const allRows = await getAIIssues(undefined, 50);
    expect(allRows.length).toBe(2);
  });
  it('resolves an AI issue', async () => {
    const ok = await resolveAIIssue('issue-1', 'resolved', 'notes');
    expect(ok).toBe(true);
  });
});

describe('nevermiss-support: error branches', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('getConversationLogs throws on range error', async () => {
    (globalThis as any).__nmsMock = {
      conversations: [
        { id: 'c1', organization_id: 'org-1', created_at: '2025-01-01' },
      ],
      errors: { nevermiss_conversations: { range: true } },
    };
    const mod = await import('@/lib/admin/nevermiss-support');
    await expect(mod.getConversationLogs('org-1', 10, 0)).rejects.toBeTruthy();
  });
  it('getNotificationLogs throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      notificationLogs: [
        { id: '1', organization_id: 'org-1', created_at: '2025-01-02' },
      ],
      errors: { notification_logs: { limit: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getNotificationLogs('org-1', 10)).rejects.toBeTruthy();
  });
  it('getNotificationQueue throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      notificationQueue: [
        { id: 'a', organization_id: 'org-1', status: 'pending', scheduled_for: '2025-01-03' },
      ],
      errors: { notification_queue: { order: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getNotificationQueue('org-1')).rejects.toBeTruthy();
  });
  it('getConversationMessages throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      messages: [
        { id: 'm1', conversation_id: 'c1', created_at: '2025-01-01' },
      ],
      errors: { nevermiss_messages: { order: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getConversationMessages('c1')).rejects.toBeTruthy();
  });
  it('getWebhookEvents throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      events: [
        { id: 'e1', organization_id: 'org-1', created_at: '2025-01-01' },
      ],
      errors: { nevermiss_events: { limit: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getWebhookEvents('org-1', 10)).rejects.toBeTruthy();
  });
  it('getOrphanedStatusEvents throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      events: [
        { id: 'e1', event_type: 'sms_status', processed: false, created_at: '2025-01-01T00:00:00Z' },
      ],
      errors: { nevermiss_events: { order: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getOrphanedStatusEvents()).rejects.toBeTruthy();
  });
  it('getSmsDeliveryFailures throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      smsFailures: [
        { id: 'f1', organization_id: 'org-1', created_at: '2025-01-01T00:00:00Z' },
      ],
      errors: { sms_delivery_failures: { limit: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getSmsDeliveryFailures('org-1', 24)).rejects.toBeTruthy();
  });
  it('getSmsUsage throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      smsUsage: [
        { id: 'u1', organization_id: 'org-9', period_start: '2025-01-02' },
      ],
      errors: { sms_usage: { limit: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getSmsUsage('org-9')).rejects.toBeTruthy();
  });
  it('checkSuppressionList throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      suppression: [
        { id: 's1', organization_id: 'org-1', phone: '+15550000001', is_active: true },
      ],
      errors: { sms_suppression_list: { eq: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).checkSuppressionList('+15550000001')).rejects.toBeTruthy();
  });
  it('removeFromSuppressionList throws on update error', async () => {
    (globalThis as any).__nmsMock = {
      updateErrors: { sms_suppression_list: true },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).removeFromSuppressionList('+15550000001', 'org-1')).rejects.toBeTruthy();
  });
});

describe('nevermiss-support: additional error branches', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('getAIIssues throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      aiIssues: [{ id: 'i1', status: 'open', created_at: '2025-01-01' }],
      errors: { ai_issues: { order: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getAIIssues('open', 10)).rejects.toBeTruthy();
  });
  it('updateForwardToNumber throws on update error', async () => {
    (globalThis as any).__nmsMock = {
      updateErrors: { nevermiss_settings: true },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).updateForwardToNumber('org-1', '+15551234567')).rejects.toBeTruthy();
  });
  it('getAIApiLogs throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      apiLogs: [{ id: 'l1', conversation_id: 'c1', created_at: '2025-01-01' }],
      errors: { ai_api_logs: { order: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getAIApiLogs('c1')).rejects.toBeTruthy();
  });
  it('getDailyMetrics throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      dailyMetrics: [{ date: '2025-01-01', organization_id: 'org-1' }],
      errors: { nevermiss_daily_metrics: { limit: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getDailyMetrics('org-1', 30)).rejects.toBeTruthy();
  });
  it('forceEndConversation throws on update error', async () => {
    (globalThis as any).__nmsMock = {
      updateErrors: { nevermiss_conversations: true },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).forceEndConversation('c1', 'completed')).rejects.toBeTruthy();
  });
  it('unblockConversation throws on update error', async () => {
    (globalThis as any).__nmsMock = {
      updateErrors: { nevermiss_conversations: true },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).unblockConversation('c1')).rejects.toBeTruthy();
  });
  it('lookupCustomerByEmail throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'o2', email: 'info@brand.com', created_at: '2025-01-01' }],
      errors: { organizations: { ilike: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).lookupCustomerByEmail('brand.com')).rejects.toBeTruthy();
  });
  it('lookupCustomerByName throws on query error', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'o2', business_name: 'Brand Co', owner_name: 'Owner', created_at: '2025-01-01' }],
      errors: { organizations: { or: true } },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).lookupCustomerByName('Brand')).rejects.toBeTruthy();
  });
});

describe('nevermiss-support: settings and forward number', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('gets nevermiss settings and returns null when missing', async () => {
    (globalThis as any).__nmsMock = {
      settings: [{ organization_id: 'org-2', phone_number: '+15551234567' }],
    };
    const s1 = await getNeverMissSettings('org-2');
    expect(s1?.phone_number).toBe('+15551234567');
    (globalThis as any).__nmsMock.settingsSingleError = { code: 'PGRST116' };
    const s2 = await getNeverMissSettings('org-3');
    expect(s2).toBeNull();
  });
  it('validates E.164 forward number and updates', async () => {
    await expect(updateForwardToNumber('org-2', '5551234567')).rejects.toThrow();
    const ok = await updateForwardToNumber('org-2', '+15551234567');
    expect(ok).toBe(true);
  });
});

describe('nevermiss-support: webhooks and orphaned events', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('lists webhook events by organization', async () => {
    (globalThis as any).__nmsMock = {
      events: [
        { id: 'e1', organization_id: 'org-1', created_at: '2025-01-01' },
        { id: 'e2', organization_id: 'org-2', created_at: '2025-01-01' },
      ],
    };
    const rows = await getWebhookEvents('org-1', 10);
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('e1');
  });
  it('returns empty array when webhook events data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { nevermiss_events: true },
    };
    const rows = await getWebhookEvents('org-1', 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
  it('finds orphaned status events older than 5 minutes', async () => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    (globalThis as any).__nmsMock = {
      events: [
        { id: 'e1', event_type: 'sms_status', processed: false, created_at: old },
        { id: 'e2', event_type: 'sms_status', processed: true, created_at: old },
      ],
    };
    const rows = await getOrphanedStatusEvents();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('e1');
  });
  it('returns empty list when orphaned status events data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { nevermiss_events: true },
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).getOrphanedStatusEvents();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});

describe('nevermiss-support: duplicate events RPC fallback', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('counts duplicate twilio_sid via fallback when RPC errors', async () => {
    (globalThis as any).__nmsMock = {
      rpcError: true,
      events: [
        { conversation_id: 'c1', twilio_sid: 'sid-abc' },
        { conversation_id: 'c1', twilio_sid: 'sid-abc' },
        { conversation_id: 'c1', twilio_sid: 'sid-abc' },
        { conversation_id: 'c1', twilio_sid: 'sid-xyz' },
      ],
    };
    const rows = await checkForDuplicateEvents('c1');
    expect(rows.length).toBe(1);
    expect(rows[0].twilio_sid).toBe('sid-abc');
    expect(rows[0].count).toBe(3);
  });
  it('returns RPC-provided duplicate counts when RPC succeeds', async () => {
    (globalThis as any).__nmsMock = {
      rpcData: [{ twilio_sid: 'sid-abc', count: 2 }],
    };
    const rows = await checkForDuplicateEvents('c1');
    expect(rows.length).toBe(1);
    expect(rows[0].twilio_sid).toBe('sid-abc');
    expect(rows[0].count).toBe(2);
  });
  it('throws when fallback duplicate query fails', async () => {
    (globalThis as any).__nmsMock = {
      rpcError: true,
      events: [
        { conversation_id: 'c1', twilio_sid: 'sid-abc' },
      ],
      errors: { nevermiss_events: { eq: true } },
    };
    await expect(checkForDuplicateEvents('c1')).rejects.toBeTruthy();
  });
});

describe('nevermiss-support: organization status', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('returns status flags when settings present with phone number', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'o1', status: 'active', billing_status: 'current' }],
      settings: [{ organization_id: 'o1', phone_number: '+15551234567' }],
    };
    const res = await getOrganizationStatus('o1');
    expect(res.status).toBe('active');
    expect(res.billing_status).toBe('current');
    expect(res.has_nevermiss).toBe(true);
    expect(res.phone_provisioned).toBe(true);
  });
  it('returns status flags when settings missing', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'o2', status: 'paused', billing_status: 'past_due' }],
      settings: [],
      settingsSingleError: { code: 'PGRST116' },
    };
    const res = await getOrganizationStatus('o2');
    expect(res.status).toBe('paused');
    expect(res.billing_status).toBe('past_due');
    expect(res.has_nevermiss).toBe(false);
    expect(res.phone_provisioned).toBe(false);
  });
  it('returns unknown status when organization not found without error', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [],
      settings: [],
    };
    const res = await getOrganizationStatus('missing');
    expect(res.status).toBe('unknown');
    expect(res.billing_status).toBe('unknown');
    expect(res.has_nevermiss).toBe(false);
    expect(res.phone_provisioned).toBe(false);
  });
  it('has_nevermiss true but phone_provisioned false when no phone_number', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'o3', status: 'active', billing_status: 'current' }],
      settings: [{ organization_id: 'o3' }],
    };
    const res = await getOrganizationStatus('o3');
    expect(res.has_nevermiss).toBe(true);
    expect(res.phone_provisioned).toBe(false);
  });
});

describe('nevermiss-support: suppression list success', () => {
  beforeEach(() => { (globalThis as any).__nmsMock = {}; });
  it('checks suppression list with organization filter and returns active entries', async () => {
    (globalThis as any).__nmsMock = {
      suppression: [
        { id: 's1', organization_id: 'org-1', phone: '+15550000001', is_active: true },
        { id: 's2', organization_id: 'org-2', phone: '+15550000001', is_active: true },
        { id: 's3', organization_id: 'org-1', phone: '+15550000002', is_active: true },
        { id: 's4', organization_id: 'org-1', phone: '+15550000001', is_active: false },
      ],
    };
    const mod = await import('@/lib/admin/nevermiss-support');
    const rows = await mod.checkSuppressionList('+15550000001', 'org-1');
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('s1');
  });
  it('removes from suppression list successfully', async () => {
    (globalThis as any).__nmsMock = {
      suppression: [
        { id: 's1', organization_id: 'org-1', phone: '+15550000001', is_active: true },
      ],
    };
    const ok = await (await import('@/lib/admin/nevermiss-support')).removeFromSuppressionList('+15550000001', 'org-1');
    expect(ok).toBe(true);
  });
});

describe('nevermiss-support: API logs, metrics, and organization status', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('returns AI API logs and daily metrics', async () => {
    (globalThis as any).__nmsMock = {
      apiLogs: [{ id: 'l1', conversation_id: 'c1' }],
      dailyMetrics: [{ date: '2025-01-01', organization_id: 'org-1' }],
    };
    const logs = await getAIApiLogs('c1');
    const metrics = await getDailyMetrics('org-1', 30);
    expect(logs.length).toBe(1);
    expect(metrics.length).toBe(1);
  });
  it('returns empty array when AI API logs data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { ai_api_logs: true },
    };
    const logs = await getAIApiLogs('c1');
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });
  it('returns empty array when daily metrics data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { nevermiss_daily_metrics: true },
    };
    const metrics = await getDailyMetrics('org-1', 30);
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBe(0);
  });
  it('returns empty array when notification logs data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { notification_logs: true },
    };
    const rows = await getNotificationLogs('org-1', 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
  it('returns empty array when sms usage data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { sms_usage: true },
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).getSmsUsage('org-9');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
  it('getConversationLogs returns empty conversations and zero total when data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { nevermiss_conversations: true },
    };
    const logs = await (await import('@/lib/admin/nevermiss-support')).getConversationLogs('org-2', 10, 0);
    expect(Array.isArray(logs.conversations)).toBe(true);
    expect(logs.conversations.length).toBe(0);
    expect(logs.total).toBe(0);
  });
  it('lookupCustomerByPhone returns empty via fallback when RPC fails and data null', async () => {
    (globalThis as any).__nmsMock = {
      lookupByPhoneError: true,
      nullDataTables: { organizations: true },
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).lookupCustomerByPhone('555');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
  it('getAIIssues returns empty array when data is null', async () => {
    (globalThis as any).__nmsMock = {
      nullDataTables: { ai_issues: true },
    };
    const rows = await getAIIssues('open', 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
  it('forceEndConversation uses default status parameter', async () => {
    const ok = await (await import('@/lib/admin/nevermiss-support')).forceEndConversation('conv-default');
    expect(ok).toBe(true);
  });
  it('duplicate events uses RPC when available', async () => {
    (globalThis as any).__nmsMock = {
      rpcData: [{ twilio_sid: 'sid-xyz', count: 3 }],
    };
    const rows = await checkForDuplicateEvents('c1');
    expect(rows[0].twilio_sid).toBe('sid-xyz');
    expect(rows[0].count).toBe(3);
  });
  it('duplicate events RPC succeeds with empty data', async () => {
    (globalThis as any).__nmsMock = {
      rpcData: [],
    };
    const rows = await checkForDuplicateEvents('c1');
    expect(rows.length).toBe(0);
  });
  it('duplicate events RPC returns null data handled as empty', async () => {
    (globalThis as any).__nmsMock = {
      rpcNull: true,
    };
    const rows = await checkForDuplicateEvents('c1');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
  it('duplicate events fallback counting returns empty when no duplicates', async () => {
    (globalThis as any).__nmsMock = {
      rpcError: true,
      events: [
        { conversation_id: 'c1', twilio_sid: 'sid-a' },
        { conversation_id: 'c1', twilio_sid: 'sid-b' },
        { conversation_id: 'c1', twilio_sid: 'sid-c' },
      ],
    };
    const rows = await checkForDuplicateEvents('c1');
    expect(rows.length).toBe(0);
  });
  it('computes organization status and phone provisioning flags', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'org-1', status: 'active', billing_status: 'current' }],
      settings: [{ organization_id: 'org-1', phone_number: '+15551234567' }],
    };
    const s = await getOrganizationStatus('org-1');
    expect(s.status).toBe('active');
    expect(s.billing_status).toBe('current');
    expect(s.has_nevermiss).toBe(true);
    expect(s.phone_provisioned).toBe(true);
  });
  it('getOrganizationStatus flags false when settings missing', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [{ id: 'org-2', status: 'active', billing_status: 'current' }],
      settings: [],
    };
    const s = await getOrganizationStatus('org-2');
    expect(s.has_nevermiss).toBe(false);
    expect(s.phone_provisioned).toBe(false);
  });
  it('getOrganizationStatus throws when organization query fails', async () => {
    (globalThis as any).__nmsMock = {
      organizationSingleError: { code: 'XERR', message: 'bad' },
    };
    await expect(getOrganizationStatus('org-bad')).rejects.toBeTruthy();
  });
});

describe('nevermiss-support: customer lookup and conversations', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('looks up customer by phone via RPC fallback and maps nested settings', async () => {
    (globalThis as any).__nmsMock = {
      lookupByPhoneError: true,
      organizations: [
        { id: 'o1', email: 'contact+555@biz.com', business_name: 'Biz', owner_name: 'Owner', status: 'active', billing_status: 'current', plan_type: 'pro', created_at: '2025-01-01',
          nevermiss_settings: [{ phone_number: '+15551230000', forward_to: '+15551230011' }] },
      ],
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).lookupCustomerByPhone('555');
    expect(rows.length).toBe(1);
    expect(rows[0].nevermiss_phone).toBe('+15551230000');
    expect(rows[0].forward_to).toBe('+15551230011');
  });
  it('looks up customer by phone via RPC success path', async () => {
    (globalThis as any).__nmsMock = {
      lookupByPhoneData: [
        {
          id: 'o2',
          business_name: 'ACME',
          owner_name: 'Bob',
          email: 'bob@acme.com',
          status: 'active',
          billing_status: 'current',
          plan_type: 'pro',
          nevermiss_phone: '+15551239999',
          forward_to: '+15551231111',
          created_at: '2025-01-01',
        },
      ],
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).lookupCustomerByPhone('+1 (555) 123-9999');
    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe('bob@acme.com');
    expect(rows[0].nevermiss_phone).toBe('+15551239999');
  });
  it('looks up customer by phone with RPC returning empty data', async () => {
    (globalThis as any).__nmsMock = {
      lookupByPhoneData: [],
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).lookupCustomerByPhone('+1 (555) 123-9999');
    expect(rows.length).toBe(0);
  });
  it('looks up customer by email and name using ilike and or', async () => {
    (globalThis as any).__nmsMock = {
      organizations: [
        { id: 'o2', email: 'info@brand.com', business_name: 'Brand Co', owner_name: 'Alice', created_at: '2025-01-01',
          nevermiss_settings: [{ phone_number: '+15551234000', forward_to: '+15551234011' }] },
      ],
    };
    const byEmail = await (await import('@/lib/admin/nevermiss-support')).lookupCustomerByEmail('brand.com');
    expect(byEmail.length).toBe(1);
    const byName = await (await import('@/lib/admin/nevermiss-support')).lookupCustomerByName('Brand');
    expect(byName.length).toBe(1);
  });
  it('gets conversation logs with count and messages ordered', async () => {
    (globalThis as any).__nmsMock = {
      conversations: [
        { id: 'c1', organization_id: 'org-2', created_at: '2025-01-03' },
        { id: 'c2', organization_id: 'org-2', created_at: '2025-01-02' },
        { id: 'c3', organization_id: 'org-1', created_at: '2025-01-01' },
      ],
      messages: [
        { id: 'm1', conversation_id: 'c3', created_at: '2025-01-01T00:00:00Z' },
        { id: 'm2', conversation_id: 'c3', created_at: '2025-01-01T00:05:00Z' },
      ],
    };
    const logs = await (await import('@/lib/admin/nevermiss-support')).getConversationLogs('org-2', 10, 0);
    expect(logs.total).toBe(2);
    const msgs = await (await import('@/lib/admin/nevermiss-support')).getConversationMessages('c3');
    expect(msgs[0].id).toBe('m1');
  });
  it('getConversationLogs supports offset and preserves total count', async () => {
    (globalThis as any).__nmsMock = {
      conversations: [
        { id: 'c1', organization_id: 'org-2', created_at: '2025-01-03' },
        { id: 'c2', organization_id: 'org-2', created_at: '2025-01-02' },
      ],
    };
    const logs = await (await import('@/lib/admin/nevermiss-support')).getConversationLogs('org-2', 1, 1);
    expect(logs.total).toBe(2);
    expect(Array.isArray(logs.conversations)).toBe(true);
  });
  it('returns null for missing conversation by id (PGRST116)', async () => {
    (globalThis as any).__nmsMock = {
      conversationSingleError: { code: 'PGRST116' },
    };
    const conv = await (await import('@/lib/admin/nevermiss-support')).getConversationById('missing');
    expect(conv).toBeNull();
  });
  it('returns null when conversation not found without error', async () => {
    (globalThis as any).__nmsMock = {
      conversations: [],
    };
    const conv = await (await import('@/lib/admin/nevermiss-support')).getConversationById('bad');
    expect(conv).toBeNull();
  });
  it('throws error when conversation single returns non-PGRST116', async () => {
    (globalThis as any).__nmsMock = {
      conversationSingleError: { code: 'XERR', message: 'bad' },
    };
    await expect((await import('@/lib/admin/nevermiss-support')).getConversationById('err')).rejects.toBeTruthy();
  });
  it('reportAIIssue throws when conversation not found', async () => {
    (globalThis as any).__nmsMock = {
      conversations: [],
    };
    await expect(reportAIIssue('missing', 'incorrect_intent', 'desc', 'agent-1')).rejects.toThrow('Conversation not found');
  });
});

describe('nevermiss-support: SMS troubleshooting and quick actions', () => {
  beforeEach(() => {
    (globalThis as any).__nmsMock = {};
  });
  it('filters sms delivery failures by cutoff and organization', async () => {
    const now = Date.now();
    (globalThis as any).__nmsMock = {
      smsFailures: [
        { id: 'f1', organization_id: 'org-1', created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
        { id: 'f2', organization_id: 'org-2', created_at: new Date(now - 26 * 60 * 60 * 1000).toISOString() },
      ],
    };
    const recent = await (await import('@/lib/admin/nevermiss-support')).getSmsDeliveryFailures(undefined, 24);
    expect(recent.length).toBe(1);
    const orgOnly = await (await import('@/lib/admin/nevermiss-support')).getSmsDeliveryFailures('org-1', 24);
    expect(orgOnly.length).toBe(1);
  });
  it('checks suppression list filtered by organization and removes entries', async () => {
    (globalThis as any).__nmsMock = {
      suppression: [
        { id: 's1', organization_id: 'org-1', phone: '+15550000001', is_active: true },
        { id: 's2', organization_id: 'org-2', phone: '+15550000001', is_active: true },
      ],
    };
    const rowsAll = await (await import('@/lib/admin/nevermiss-support')).checkSuppressionList('+15550000001');
    expect(rowsAll.length).toBe(2);
    const rowsOrg = await (await import('@/lib/admin/nevermiss-support')).checkSuppressionList('+15550000001', 'org-1');
    expect(rowsOrg.length).toBe(1);
    const ok = await (await import('@/lib/admin/nevermiss-support')).removeFromSuppressionList('+15550000001', 'org-1');
    expect(ok).toBe(true);
  });
  it('gets recent sms usage records limited and orders by period_start', async () => {
    (globalThis as any).__nmsMock = {
      smsUsage: [
        { id: 'u1', organization_id: 'org-9', period_start: '2025-01-02' },
        { id: 'u2', organization_id: 'org-9', period_start: '2025-01-01' },
      ],
    };
    const rows = await (await import('@/lib/admin/nevermiss-support')).getSmsUsage('org-9');
    expect(rows.length).toBe(2);
    expect(rows[0].period_start >= rows[1].period_start).toBe(true);
  });
  it('force ends and unblocks conversation', async () => {
    const ok1 = await (await import('@/lib/admin/nevermiss-support')).forceEndConversation('cX', 'completed');
    const ok2 = await (await import('@/lib/admin/nevermiss-support')).unblockConversation('cX');
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
  });
  it('force ends conversation with abandoned status', async () => {
    const ok = await (await import('@/lib/admin/nevermiss-support')).forceEndConversation('cY', 'abandoned');
    expect(ok).toBe(true);
  });
  it('returns null for settings when not found', async () => {
    (globalThis as any).__nmsMock = {
      settings: [],
    };
    const res = await getNeverMissSettings('org-err');
    expect(res).toBeNull();
  });
  it('getNeverMissSettings throws on non-PGRST116 error', async () => {
    (globalThis as any).__nmsMock = {
      settingsSingleError: { code: 'XERR', message: 'bad' },
    };
    await expect(getNeverMissSettings('org-x')).rejects.toBeTruthy();
  });
});
