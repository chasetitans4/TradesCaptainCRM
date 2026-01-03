import { describe, it, expect } from '@jest/globals';

describe('LeadsCaptain v2 rule engine', () => {
  it('evaluateRules matches by intent equals schedule', async () => {
    const { evaluateRules } = require('@/lib/leads-captain/v2');
    const rules = [
      {
        id: 'r1',
        config_id: 'cfg',
        name: 'Schedule',
        description: null,
        priority: 1,
        conditions: { operator: 'AND', conditions: [{ field: 'intent', operator: 'equals', value: 'schedule' }] },
        actions: { send_text: 'Thanks for reaching out' },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const context = {
      message: 'book',
      classification: { intent: 'schedule', confidence: 80, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: true,
      current_time: new Date(),
      is_business_hours: true,
      is_quiet_hours: false,
    };
    const result = evaluateRules(rules, context);
    expect(result.matched).toBe(true);
    expect(result.rule?.name).toBe('Schedule');
  });

  it('evaluateCondition supports any/all message_contains', async () => {
    const { evaluateCondition } = require('@/lib/leads-captain/v2');
    const context = {
      message: 'I need a quote and schedule time',
      classification: { intent: 'schedule', confidence: 70, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: true,
      current_time: new Date(),
      is_business_hours: true,
      is_quiet_hours: false,
    };
    const any = evaluateCondition({ field: 'message_contains', operator: 'any', value: ['quote', 'price', 'cost'] }, context);
    const all = evaluateCondition({ field: 'message_contains', operator: 'all', value: ['quote', 'schedule'] }, context);
    expect(any.result).toBe(true);
    expect(all.result).toBe(true);
  });

  it('evaluateRules supports OR operator short-circuit', async () => {
    const { evaluateRules } = require('@/lib/leads-captain/v2');
    const rules = [
      {
        id: 'r-or',
        config_id: 'cfg',
        name: 'OR Rule',
        description: null,
        priority: 1,
        conditions: {
          operator: 'OR',
          conditions: [
            { field: 'intent', operator: 'equals', value: 'pricing' },
            { field: 'message_contains', operator: 'contains', value: 'schedule' },
          ],
        },
        actions: { send_text: 'Matched OR' },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const context = {
      message: 'please schedule me',
      classification: { intent: 'general', confidence: 50, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: false,
      current_time: new Date(),
      is_business_hours: false,
      is_quiet_hours: false,
    };
    const result = evaluateRules(rules, context);
    expect(result.matched).toBe(true);
    expect(result.rule?.name).toBe('OR Rule');
  });

  it('evaluateCondition covers numeric and name cases', async () => {
    const { evaluateCondition } = require('@/lib/leads-captain/v2');
    const baseContext = {
      message: 'msg',
      classification: {
        intent: 'general',
        confidence: 65,
        sentiment: 'neutral',
        language: 'en',
        entities: { name: 'Alice' },
        is_compliance: false,
      },
      conversation: { crm_customer_id: 'c1', message_count: 3 } as any,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: true,
      current_time: new Date(),
      is_business_hours: true,
      is_quiet_hours: false,
    };
    expect(evaluateCondition({ field: 'confidence', operator: 'greater_than', value: 60 }, baseContext).result).toBe(true);
    expect(evaluateCondition({ field: 'confidence', operator: 'less_than', value: 70 }, baseContext).result).toBe(true);
    expect(evaluateCondition({ field: 'confidence', operator: 'between', value: [60, 70] }, baseContext).result).toBe(true);
    expect(evaluateCondition({ field: 'conversation_length', operator: 'greater_than', value: 2 }, baseContext).result).toBe(true);
    expect(evaluateCondition({ field: 'customer_status', operator: 'equals', value: 'existing' }, baseContext).result).toBe(true);
    expect(evaluateCondition({ field: 'customer_name', operator: 'equals', value: 'known' }, baseContext).result).toBe(true);
    expect(evaluateCondition({ field: 'customer_name', operator: 'equals', value: 'unknown' }, { ...baseContext, classification: { ...baseContext.classification, entities: {} } }).result).toBe(true);
    expect(evaluateCondition({ field: 'is_first_message', operator: 'equals', value: true }, baseContext).result).toBe(true);
  });

  it('isWithinBusinessHours returns false when disabled or outside', async () => {
    const { isWithinBusinessHours, isWithinQuietHours } = require('@/lib/leads-captain/v2');
    const hoursDisabled = {
      mon: { open: '09:00', close: '17:00', enabled: false },
      tue: { open: '09:00', close: '17:00', enabled: true },
      wed: { open: '09:00', close: '17:00', enabled: true },
      thu: { open: '09:00', close: '17:00', enabled: true },
      fri: { open: '09:00', close: '17:00', enabled: true },
      sat: { open: null, close: null, enabled: false },
      sun: { open: null, close: null, enabled: false },
    };
    const nowMorning = new Date('2025-01-06T06:00:00Z');
    expect(isWithinBusinessHours(hoursDisabled, 'UTC', nowMorning)).toBe(false);
    expect(isWithinQuietHours('09:00', '17:00', 'UTC', new Date('2025-01-06T18:00:00Z'))).toBe(false);
  });

  it('evaluateCondition handles unknown field gracefully', async () => {
    const { evaluateCondition } = require('@/lib/leads-captain/v2');
    const context = {
      message: 'hello',
      classification: { intent: 'general', confidence: 80, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: false,
      current_time: new Date(),
      is_business_hours: false,
      is_quiet_hours: false,
    };
    // @ts-expect-error - passing unknown field to exercise default branch
    const res = evaluateCondition({ field: 'unknown_field', operator: 'equals', value: 'x' }, context);
    expect(res.result).toBe(false);
  });
  it('time helpers return expected values', async () => {
    const { isWithinBusinessHours, isWithinQuietHours, getNextAvailableTime } = require('@/lib/leads-captain/v2');
    const hours = {
      mon: { open: '09:00', close: '17:00', enabled: true },
      tue: { open: '09:00', close: '17:00', enabled: true },
      wed: { open: '09:00', close: '17:00', enabled: true },
      thu: { open: '09:00', close: '17:00', enabled: true },
      fri: { open: '09:00', close: '17:00', enabled: true },
      sat: { open: null, close: null, enabled: false },
      sun: { open: null, close: null, enabled: false },
    };
    const now = new Date('2025-01-06T10:30:00Z');
    expect(isWithinBusinessHours(hours, 'UTC', now)).toBe(true);
    expect(isWithinQuietHours('22:00', '07:00', 'UTC', new Date('2025-01-06T23:00:00Z'))).toBe(true);
    const next = getNextAvailableTime(hours, 'UTC');
    expect(typeof next).toBe('string');
  });

  it('evaluateCondition for time equals quiet/business/outside', async () => {
    const { evaluateCondition } = require('@/lib/leads-captain/v2');
    const base = {
      message: 'msg',
      classification: { intent: 'general', confidence: 70, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: false,
      current_time: new Date(),
      is_business_hours: false,
      is_quiet_hours: true,
    };
    expect(evaluateCondition({ field: 'time', operator: 'equals', value: 'quiet_hours' }, base).result).toBe(true);
    expect(evaluateCondition({ field: 'time', operator: 'equals', value: 'business_hours' }, { ...base, is_business_hours: true, is_quiet_hours: false }).result).toBe(true);
    expect(evaluateCondition({ field: 'time', operator: 'equals', value: 'outside_hours' }, { ...base, is_business_hours: false, is_quiet_hours: false }).result).toBe(true);
  });
  it('executeRuleActions maps fields correctly', async () => {
    const { executeRuleActions } = require('@/lib/leads-captain/v2');
    const rule = {
      id: 'r2',
      config_id: 'cfg',
      name: 'Map',
      description: null,
      priority: 1,
      conditions: { operator: 'AND', conditions: [] },
      actions: {
        send_template: 't1',
        send_text: 'hello',
        use_ai: true,
        notify: { recipients: ['owner'], methods: ['sms'] },
        escalate_to_human: true,
        stop_ai: true,
        set_hot_lead: true,
        set_emergency: false,
        create_lead: true,
        create_job: false,
      },
      is_system: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const result = executeRuleActions(rule, {} as any);
    expect(result.template_id).toBe('t1');
    expect(result.direct_text).toBe('hello');
    expect(result.use_ai).toBe(true);
    expect(result.should_notify).toBe(true);
    expect(result.should_escalate).toBe(true);
    expect(result.stop_ai).toBe(true);
    expect(result.conversation_updates.is_hot_lead).toBe(true);
  });

  it('evaluateRules returns no match when conditions do not pass', async () => {
    const { evaluateRules } = require('@/lib/leads-captain/v2');
    const rules = [
      {
        id: 'r-none',
        config_id: 'cfg',
        name: 'NoMatch',
        description: null,
        priority: 1,
        conditions: {
          operator: 'AND',
          conditions: [
            { field: 'intent', operator: 'equals', value: 'pricing' },
            { field: 'message_contains', operator: 'contains', value: 'schedule' },
          ],
        },
        actions: { send_text: 'x' },
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const context = {
      message: 'general message',
      classification: { intent: 'general', confidence: 60, sentiment: 'neutral', language: 'en', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: false,
      current_time: new Date(),
      is_business_hours: true,
      is_quiet_hours: false,
    };
    const res = evaluateRules(rules, context);
    expect(res.matched).toBe(false);
    expect(res.rule).toBeNull();
  });

  it('evaluateCondition supports detected_language and unknown operator', async () => {
    const { evaluateCondition } = require('@/lib/leads-captain/v2');
    const context = {
      message: 'hola',
      classification: { intent: 'general', confidence: 70, sentiment: 'neutral', language: 'es', entities: {}, is_compliance: false },
      conversation: null,
      config: { timezone: 'UTC', business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } } },
      is_first_message: true,
      current_time: new Date(),
      is_business_hours: true,
      is_quiet_hours: false,
    };
    const lang = evaluateCondition({ field: 'detected_language', operator: 'equals', value: 'es' }, context);
    expect(lang.result).toBe(true);
    const unknownOp = evaluateCondition({ field: 'intent', operator: 'unknown_op', value: 'general' }, context);
    expect(unknownOp.result).toBe(false);
  });
});
