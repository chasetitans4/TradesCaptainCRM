import { describe, it, expect, jest } from '@jest/globals';

function makeConfig(overrides: Partial<any> = {}) {
  return {
    id: 'cfg1',
    business_id: 'biz1',
    business_name: 'Biz',
    business_type: 'plumbing',
    service_area: 'Austin',
    owner_name: 'Owner',
    main_phone: '(555) 111-2222',
    emergency_phone: '(555) 111-3333',
    booking_link: 'https://book.example.com',
    business_hours: {
      mon: { open: '09:00', close: '17:00', enabled: true },
      tue: { open: '09:00', close: '17:00', enabled: true },
      wed: { open: '09:00', close: '17:00', enabled: true },
      thu: { open: '09:00', close: '17:00', enabled: true },
      fri: { open: '09:00', close: '17:00', enabled: true },
      sat: { open: null, close: null, enabled: false },
      sun: { open: null, close: null, enabled: false },
    },
    timezone: 'UTC',
    emergency_service: true,
    tone: 'friendly_professional',
    use_emojis: true,
    languages: ['en'],
    ai_enabled: true,
    ai_confidence_threshold: 70,
    ai_creativity_level: 'low',
    ai_max_messages: 10,
    ai_pricing_mode: 'ranges',
    memory_scope: 'conversation',
    memory_expiration_days: 30,
    global_mode: 'normal',
    require_approval: 'never',
    approval_timeout_minutes: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRecipient() {
  return {
    id: 'rec1',
    config_id: 'cfg1',
    recipient_name: 'Owner',
    recipient_phone: '+15551112222',
    recipient_email: 'owner@example.com',
    recipient_role: 'owner',
    notify_sms: true,
    notify_push: false,
    notify_email: false,
    triggers: {
      new_conversation: false,
      hot_lead: false,
      emergency: false,
      angry_customer: false,
      escalation: false,
      booking: false,
      every_message: true,
    },
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    quiet_hours_except_emergency: true,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

function makeSupabase(overrides: {
  config?: any;
  intents?: any[];
  rules?: any[];
  templates?: any[];
  priceList?: any[];
  recipients?: any[];
  conversation?: any;
  suppressionActive?: boolean;
} = {}) {
  const cfg = overrides.config || makeConfig();
  const intents = overrides.intents || [];
  const rules = overrides.rules || [];
  const templates = overrides.templates || [];
  const priceList = overrides.priceList || [];
  const recipients = overrides.recipients || [makeRecipient()];
  const conversation =
    overrides.conversation ||
    {
      id: 'conv1',
      config_id: cfg.id,
      customer_phone: '+15550001111',
      customer_name: null,
      customer_email: null,
      status: 'active',
      initial_intent: null,
      current_intent: null,
      sentiment: null,
      is_hot_lead: false,
      is_emergency: false,
      requires_human: false,
      opted_out: false,
      customer_memory: {},
      message_count: 0,
      ai_message_count: 0,
      crm_lead_id: null,
      crm_customer_id: null,
      started_at: new Date().toISOString(),
      last_message_at: null,
      last_customer_message_at: null,
      closed_at: null,
      created_at: new Date().toISOString(),
    };

  function builderFor(table: string) {
    const builder: any = {
      select: (_cols?: any, _opts?: any) => builder,
      eq: (_field: string, _val: any) => builder,
      in: (_field: string, _vals: any[]) => builder,
      order: (_field: string, _opts: any) => builder,
      limit: (_n: number) => builder,
      single: async () => {
        if (table === 'leads_captain_config') {
          return { data: cfg, error: null };
        }
        if (table === 'leads_captain_conversations_v2') {
          return { data: conversation, error: null };
        }
        if (table === 'sms_suppression_list') {
          return {
            data: overrides.suppressionActive ? { id: 'sup1' } : null,
            error: null,
          };
        }
        return { data: null, error: null };
      },
    };
    return builder;
  }

  return {
    from: (table: string) => {
      if (table === 'leads_captain_config') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: cfg, error: null }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_intents') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: intents, error: null }),
          }),
        };
      }
      if (table === 'leads_captain_rules') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: rules, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_templates') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: templates, error: null }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_price_list') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: priceList, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_notifications') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: recipients, error: null }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_conversations_v2') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  order: () => ({
                    limit: () => ({
                      single: async () => ({ data: conversation, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: (_rec: any) => ({
            select: () => ({
              single: async () => ({ data: { ...conversation, id: 'conv-new' }, error: null }),
            }),
          }),
          update: (_updates: any) => ({
            eq: (_field1: string, _val1: any) => ({
              eq: (_field2: string, _val2: any) => ({
                eq: (_field3: string, _val3: any) =>
                  Promise.resolve({ data: {}, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_messages_v2') {
        return {
          insert: (_rec: any) => ({
            select: (_cols?: any) => ({
              single: async () => ({ data: { id: 'msg1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'leads_captain_audit_log') {
        return {
          insert: (_rec: any) => Promise.resolve({ data: {}, error: null }),
        };
      }
      if (table === 'sms_suppression_list') {
        return {
          upsert: (_rec: any, _opts?: any) => Promise.resolve({ data: {}, error: null }),
          update: (_rec: any) => ({
            eq: (_f: string, _v: any) => Promise.resolve({ data: {}, error: null }),
          }),
          select: () => builderFor(table),
        };
      }
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { subscription_tier: 'gold' }, error: null }),
            }),
          }),
        };
      }
      return builderFor(table);
    },
  };
}

describe('LeadsCaptain v2 processor', () => {
  it('returns opted_out when phone is suppressed', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => makeSupabase({ config: makeConfig({ global_mode: 'normal' }), suppressionActive: true }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const result = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550000000',
        business_phone: '+15551112222',
        message: 'hello',
      });
      expect(result.should_send).toBe(false);
      expect(result.explanation).toContain('opted out');
      expect(result.classification.intent).toBe('opted_out');
    });
  });

  it('returns blocked when conversation status is blocked', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal' }),
            conversation: {
              id: 'blocked1',
              config_id: 'cfg1',
              customer_phone: '+15550004444',
              customer_name: null,
              customer_email: null,
              status: 'blocked',
              initial_intent: null,
              current_intent: null,
              sentiment: null,
              is_hot_lead: false,
              is_emergency: false,
              requires_human: false,
              opted_out: false,
              customer_memory: {},
              message_count: 1,
              ai_message_count: 0,
              crm_lead_id: null,
              crm_customer_id: null,
              started_at: new Date().toISOString(),
              last_message_at: null,
              last_customer_message_at: null,
              closed_at: null,
              created_at: new Date().toISOString(),
            },
          }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const result = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550004444',
        business_phone: '+15551112222',
        message: 'hello',
      });
      expect(result.should_send).toBe(false);
      expect(result.explanation.toLowerCase()).toContain('blocked');
      expect(result.classification.intent).toBe('blocked');
    });
  });

  it('returns early when global_mode is paused', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => makeSupabase({ config: makeConfig({ global_mode: 'paused' }) }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const result = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550001111',
        business_phone: '+15551112222',
        message: 'hello',
      });
      expect(result.should_send).toBe(false);
      expect(result.ai_used).toBe(false);
      expect(result.explanation).toContain('paused');
    });
  });

  it('handles STOP compliance and returns response', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal' }),
          }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const result = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550001111',
        business_phone: '+15551112222',
        message: 'STOP',
      });
      expect(result.should_send).toBe(true);
      expect(result.response_content).toContain('unsubscribed');
      expect(result.compliance_action).toBe('opt_out');
    });
  });

  it('human takeover conversation returns no response and builds notifications', async () => {
    await jest.isolateModulesAsync(async () => {
      const conv = {
        id: 'conv2',
        config_id: 'cfg1',
        customer_phone: '+15550002222',
        customer_name: null,
        customer_email: null,
        status: 'human_takeover',
        initial_intent: null,
        current_intent: null,
        sentiment: null,
        is_hot_lead: false,
        is_emergency: false,
        requires_human: false,
        opted_out: false,
        customer_memory: {},
        message_count: 1,
        ai_message_count: 0,
        crm_lead_id: null,
        crm_customer_id: null,
        started_at: new Date().toISOString(),
        last_message_at: null,
        last_customer_message_at: null,
        closed_at: null,
        created_at: new Date().toISOString(),
      };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal' }),
            conversation: conv,
            recipients: [makeRecipient()],
          }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const result = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550002222',
        business_phone: '+15551112222',
        message: 'new message',
      });
      expect(result.should_send).toBe(false);
      expect(result.notifications.length).toBeGreaterThan(0);
      expect(result.explanation).toContain('Human has taken over');
    });
  });

  it('matches rule and renders template response', async () => {
    await jest.isolateModulesAsync(async () => {
      const rule = {
        id: 'r1',
        config_id: 'cfg1',
        name: 'Schedule Rule',
        description: null,
        priority: 1,
        conditions: {
          operator: 'AND',
          conditions: [{ field: 'intent', operator: 'equals', value: 'schedule' }],
        },
        actions: {
          send_template: 't1',
          notify: { recipients: ['owner'], methods: ['sms'], urgency: 'normal' },
        },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const template = {
        id: 't1',
        config_id: 'cfg1',
        name: 'Schedule Template',
        template_key: null,
        content: 'Hi {{first_name}}, thanks for reaching out!',
        max_length: 320,
        emoji_setting: 'business_default',
        ai_personalization: 'none',
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal' }),
            rules: [rule],
            templates: [template],
            intents: [
              {
                id: 'i1',
                config_id: 'cfg1',
                intent_code: 'schedule',
                intent_label: 'Schedule Appointment',
                intent_category: 'scheduling',
                example_phrases: ['schedule', 'book', 'appointment'],
                enabled: true,
                created_at: new Date().toISOString(),
              },
            ],
          }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const result = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550003333',
        business_phone: '+15551112222',
        message: 'Can I schedule an appointment?',
      });
      expect(result.should_send).toBe(true);
      expect(result.template_used?.id).toBe('t1');
      expect(result.response_content).toContain('thanks for reaching out');
      expect(result.notifications.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('respects quiet hours in rule notifications and supports push/email', async () => {
    await jest.isolateModulesAsync(async () => {
      const recipient = {
        id: 'recQ',
        config_id: 'cfg1',
        recipient_name: 'Owner',
        recipient_phone: '+15551112222',
        recipient_email: 'owner@example.com',
        recipient_role: 'owner',
        notify_sms: false,
        notify_push: true,
        notify_email: true,
        triggers: { new_conversation: false, hot_lead: false, emergency: false, angry_customer: false, escalation: false, booking: false, every_message: true },
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        quiet_hours_except_emergency: false,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const rule = {
        id: 'rNotify',
        config_id: 'cfg1',
        name: 'Notify',
        description: null,
        priority: 1,
        conditions: { operator: 'AND', conditions: [{ field: 'intent', operator: 'equals', value: 'general' }] },
        actions: { notify: { recipients: ['owner'], methods: ['push', 'email'], urgency: 'normal' } },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal' }),
            rules: [rule],
            templates: [],
            intents: [{ id: 'iGen', config_id: 'cfg1', intent_code: 'general', intent_label: 'General', intent_category: 'other', example_phrases: ['general'], enabled: true, created_at: new Date().toISOString() }],
            recipients: [recipient],
          }),
      }));
      jest.doMock('@/lib/leads-captain/v2/rule-engine', () => {
        const real = jest.requireActual('@/lib/leads-captain/v2/rule-engine');
        return { ...real, isWithinQuietHours: () => true };
      });
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550004445',
        business_phone: '+15551112222',
        message: 'general',
      });
      expect(res.notifications.length).toBe(0);
    });
  });

  it('allows emergency notifications through quiet hours when except flag set', async () => {
    await jest.isolateModulesAsync(async () => {
      const recipient = {
        id: 'recE',
        config_id: 'cfg1',
        recipient_name: 'Owner',
        recipient_phone: '+15551112222',
        recipient_email: 'owner@example.com',
        recipient_role: 'owner',
        notify_sms: false,
        notify_push: true,
        notify_email: true,
        triggers: { new_conversation: false, hot_lead: false, emergency: false, angry_customer: false, escalation: false, booking: false, every_message: true },
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        quiet_hours_except_emergency: true,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const rule = {
        id: 'rNotify2',
        config_id: 'cfg1',
        name: 'Notify Emergency',
        description: null,
        priority: 1,
        conditions: { operator: 'AND', conditions: [{ field: 'intent', operator: 'equals', value: 'emergency' }] },
        actions: { notify: { recipients: ['owner'], methods: ['push', 'email'], urgency: 'immediate' } },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal' }),
            rules: [rule],
            templates: [],
            intents: [{ id: 'iEmerg', config_id: 'cfg1', intent_code: 'emergency', intent_label: 'Emergency', intent_category: 'support', example_phrases: ['emergency'], enabled: true, created_at: new Date().toISOString() }],
            recipients: [recipient],
          }),
      }));
      jest.doMock('@/lib/leads-captain/v2/rule-engine', () => {
        const real = jest.requireActual('@/lib/leads-captain/v2/rule-engine');
        return { ...real, isWithinQuietHours: () => true };
      });
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550004446',
        business_phone: '+15551112222',
        message: 'emergency',
      });
      expect(res.notifications.length).toBeGreaterThan(0);
      expect(res.notifications[0].methods).toEqual(expect.arrayContaining(['push', 'email']));
    });
  });
  it('uses AI fallback when no rule matches and limits allow', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => {
          const base = makeSupabase({
            config: makeConfig({ global_mode: 'normal', ai_enabled: true }),
            rules: [],
            templates: [],
          });
          return {
            ...base,
            from(table: string) {
              if (table === 'leads_captain_messages_v2') {
                return {
                  select: () => ({
                    eq: () => ({
                      order: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                      }),
                    }),
                  }),
                  insert: (_rec: any) => ({
                    select: (_c?: any) => ({ single: async () => ({ data: { id: 'm1' }, error: null }) }),
                  }),
                };
              }
              return (base as any).from(table);
            },
          };
        },
      }));
      jest.doMock('@/lib/leads-captain/v2/features', () => ({
        canAccessFeature: async () => true,
        checkPlanLimit: async () => ({ allowed: true }),
      }));
      jest.doMock('@/lib/leads-captain/v2/guardrails', () => ({
        generateAIResponse: async () => ({
          content: 'AI reply content',
          confidence: 82,
          model: 'claude',
          tokens_used: 15,
          guardrails_applied: ['length_truncated'],
        }),
        requiresApproval: () => false,
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550005555',
        business_phone: '+15551112222',
        message: 'General question with no rule',
      });
      expect(res.ai_used).toBe(true);
      expect(res.response_content).toContain('AI reply');
      expect(res.decision_details.ai_response.confidence).toBeGreaterThan(0);
      expect(res.should_send).toBe(true);
    });
  });

  it('requires approval when guardrails require it', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => {
          const base = makeSupabase({ config: makeConfig({ global_mode: 'normal', ai_enabled: true }), rules: [], templates: [] });
          return {
            ...base,
            from(table: string) {
              if (table === 'leads_captain_messages_v2') {
                return {
                  select: () => ({
                    eq: () => ({
                      order: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                      }),
                    }),
                  }),
                  insert: (_rec: any) => ({
                    select: (_c?: any) => ({ single: async () => ({ data: { id: 'm1' }, error: null }) }),
                  }),
                };
              }
              return (base as any).from(table);
            },
          };
        },
      }));
      jest.doMock('@/lib/leads-captain/v2/features', () => ({
        canAccessFeature: async () => true,
        checkPlanLimit: async () => ({ allowed: true }),
      }));
      jest.doMock('@/lib/leads-captain/v2/guardrails', () => ({
        generateAIResponse: async () => ({
          content: 'AI gated reply',
          confidence: 60,
          model: 'claude',
          tokens_used: 12,
          guardrails_applied: [],
        }),
        requiresApproval: () => true,
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550006666',
        business_phone: '+15551112222',
        message: 'General question',
      });
      expect(res.ai_used).toBe(true);
      expect(res.requires_approval).toBe(true);
      expect(res.should_send).toBe(false);
    });
  });

  it('blocks AI when plan access is unavailable', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => makeSupabase({ config: makeConfig({ global_mode: 'normal', ai_enabled: true }), rules: [], templates: [] }),
      }));
      jest.doMock('@/lib/leads-captain/v2/features', () => ({
        canAccessFeature: async () => false,
        checkPlanLimit: async () => ({ allowed: true }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550007777',
        business_phone: '+15551112222',
        message: 'No rule',
      });
      expect(res.ai_used).toBe(false);
      expect(res.explanation).toContain('AI not available');
    });
  });

  it('blocks AI when conversation limit reached', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal', ai_enabled: true }),
            rules: [],
            templates: [],
            conversation: { id: 'conv1', config_id: 'cfg1', customer_phone: '+15550008888', status: 'active', message_count: 3, ai_message_count: 10, customer_memory: {}, started_at: new Date().toISOString() },
          }),
      }));
      jest.doMock('@/lib/leads-captain/v2/features', () => ({
        canAccessFeature: async () => true,
        checkPlanLimit: async () => ({ allowed: false }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550008888',
        business_phone: '+15551112222',
        message: 'No rule',
      });
      expect(res.ai_used).toBe(false);
      expect(res.explanation).toContain('message limit');
      expect(res.conversation_updates.requires_human).toBe(true);
    });
  });

  it('does not use AI when rule blocks responses', async () => {
    await jest.isolateModulesAsync(async () => {
      const rule = {
        id: 'rBlock',
        config_id: 'cfg1',
        name: 'Block Respond',
        description: null,
        priority: 1,
        conditions: { operator: 'OR', conditions: [{ field: 'message_contains', operator: 'contains', value: 'hello' }, { field: 'intent', operator: 'equals', value: 'general' }] },
        actions: { do_not_respond: true },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal', ai_enabled: true }),
            rules: [rule],
            templates: [],
            intents: [{ id: 'iGen', config_id: 'cfg1', intent_code: 'general', intent_label: 'General', intent_category: 'other', example_phrases: ['hi'], enabled: true, created_at: new Date().toISOString() }],
          }),
      }));
      jest.doMock('@/lib/leads-captain/v2/features', () => ({
        canAccessFeature: async () => true,
        checkPlanLimit: async () => ({ allowed: true }),
      }));
      jest.doMock('@/lib/leads-captain/v2/guardrails', () => ({
        generateAIResponse: async () => ({ content: 'AI', confidence: 90, model: 'claude', tokens_used: 10, guardrails_applied: [] }),
        requiresApproval: () => false,
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550009999',
        business_phone: '+15551112222',
        message: 'hello',
      });
      expect(res.ai_used).toBe(false);
      expect(res.response_content).toBeNull();
      expect(res.explanation).toContain('no response configured');
    });
  });

  it('does not use AI when global_mode is templates_only', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'templates_only', ai_enabled: true }),
            rules: [],
            templates: [],
          }),
      }));
      jest.doMock('@/lib/leads-captain/v2/features', () => ({
        canAccessFeature: async () => true,
        checkPlanLimit: async () => ({ allowed: true }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550001234',
        business_phone: '+15551112222',
        message: 'No rule path',
      });
      expect(res.ai_used).toBe(false);
      expect(res.explanation).toBe('No rule matched');
    });
  });

  it('returns direct text when rule action specifies send_text', async () => {
    await jest.isolateModulesAsync(async () => {
      const rule = {
        id: 'rDirect',
        config_id: 'cfg1',
        name: 'Direct Text',
        description: null,
        priority: 1,
        conditions: {
          operator: 'OR',
          conditions: [{ field: 'message_contains', operator: 'contains', value: 'hello' }],
        },
        actions: { send_text: 'Hello there!' },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal', ai_enabled: true }),
            rules: [rule],
            templates: [],
            intents: [{ id: 'iGen', config_id: 'cfg1', intent_code: 'general', intent_label: 'General', intent_category: 'other', example_phrases: ['hi'], enabled: true, created_at: new Date().toISOString() }],
          }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550001235',
        business_phone: '+15551112222',
        message: 'hello',
      });
      expect(res.response_content).toBe('Hello there!');
      expect(res.ai_used).toBe(false);
    });
  });

  it('escalates to human and sets conversation flags', async () => {
    await jest.isolateModulesAsync(async () => {
      const rule = {
        id: 'rEsc',
        config_id: 'cfg1',
        name: 'Escalate',
        description: null,
        priority: 1,
        conditions: {
          operator: 'AND',
          conditions: [{ field: 'intent', operator: 'equals', value: 'complaint' }],
        },
        actions: {
          escalate_to_human: true,
          notify: { recipients: ['owner'], methods: ['sms'], urgency: 'immediate' },
        },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const recipient = { ...makeRecipient(), triggers: { ...makeRecipient().triggers, escalation: true } };
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () =>
          makeSupabase({
            config: makeConfig({ global_mode: 'normal', ai_enabled: true }),
            rules: [rule],
            templates: [],
            intents: [{ id: 'iComp', config_id: 'cfg1', intent_code: 'complaint', intent_label: 'Complaint', intent_category: 'support', example_phrases: ['complaint', 'refund'], enabled: true, created_at: new Date().toISOString() }],
            recipients: [recipient],
          }),
      }));
      const { processInboundMessage } = require('@/lib/leads-captain/v2');
      const res = await processInboundMessage({
        config_id: 'cfg1',
        business_id: 'biz1',
        customer_phone: '+15550001236',
        business_phone: '+15551112222',
        message: 'complaint',
      });
      expect(res.should_escalate).toBe(true);
      expect(res.conversation_updates.requires_human).toBe(true);
      expect(res.conversation_updates.status).toBe('human_takeover');
      expect(res.notifications.length).toBeGreaterThanOrEqual(1);
    });
  });
});
