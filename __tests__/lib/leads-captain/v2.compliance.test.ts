import { describe, it, expect, jest } from '@jest/globals';

describe('LeadsCaptain v2 compliance', () => {
  it('handles STOP opt-out compliance', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'leads_captain_config') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { business_id: 'biz1' } }),
                  }),
                }),
              };
            }
            if (table === 'sms_suppression_list') {
              return {
                upsert: async () => ({ data: {}, error: null }),
                select: () => ({
                  eq: () => ({
                    eq: () => ({
                      eq: () => ({
                        single: async () => ({ data: { id: 'sup1' } }),
                      }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_conversations_v2') {
              return {
                update: () => ({
                  eq: () => ({
                    eq: () => ({
                      eq: () => Promise.resolve({ data: {}, error: null }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_audit_log') {
              return { insert: async () => ({ data: {}, error: null }) };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { handleCompliance } = require('@/lib/leads-captain/v2/compliance');
      const res = await handleCompliance('STOP', '+15550000000', 'cfg1', 'Biz');
      expect(res.is_compliance_message).toBe(true);
      expect(res.compliance_type).toBe('opt_out');
      expect(res.response_required).toBe(true);
      expect(res.should_block_further_processing).toBe(true);
      expect(res.response_text).toContain('unsubscribed');
    });
  });

  it('handles HELP compliance', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({ from: () => ({}) }),
      }));
      const { handleCompliance } = require('@/lib/leads-captain/v2/compliance');
      const res = await handleCompliance('HELP', '+1555', 'cfg', 'Biz');
      expect(res.is_compliance_message).toBe(true);
      expect(res.compliance_type).toBe('help');
      expect(res.response_text).toContain('Reply STOP');
    });
  });

  it('handles START opt-in compliance', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'leads_captain_config') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { business_id: 'biz1' } }),
                  }),
                }),
              };
            }
            if (table === 'sms_suppression_list') {
              return {
                update: () => ({
                  eq: () => ({
                    eq: () => Promise.resolve({ data: {}, error: null }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_conversations_v2') {
              return {
                update: () => ({
                  eq: () => ({
                    eq: () => Promise.resolve({ data: {}, error: null }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_audit_log') {
              return { insert: async () => ({ data: {}, error: null }) };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { handleCompliance } = require('@/lib/leads-captain/v2/compliance');
      const res = await handleCompliance('START', '+1555', 'cfg', 'Biz');
      expect(res.is_compliance_message).toBe(true);
      expect(res.compliance_type).toBe('opt_in');
      expect(res.response_text).toContain("You're resubscribed");
    });
  });

  it('handles STOP when config not found and still returns response', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'leads_captain_config') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null }),
                  }),
                }),
              };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { handleCompliance } = require('@/lib/leads-captain/v2/compliance');
      const res = await handleCompliance('STOP', '+15550000000', 'cfg-missing', 'Biz');
      expect(res.is_compliance_message).toBe(true);
      expect(res.compliance_type).toBe('opt_out');
      expect(res.response_text).toContain('unsubscribed');
    });
  });

  it('handles START when config not found and still returns response', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'leads_captain_config') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null }),
                  }),
                }),
              };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { handleCompliance } = require('@/lib/leads-captain/v2/compliance');
      const res = await handleCompliance('START', '+15550000000', 'cfg-missing', 'Biz');
      expect(res.is_compliance_message).toBe(true);
      expect(res.compliance_type).toBe('opt_in');
      expect(res.response_text).toContain("You're resubscribed");
    });
  });

  it('returns non-compliance for other messages', async () => {
    await jest.isolateModulesAsync(async () => {
      const { handleCompliance } = require('@/lib/leads-captain/v2/compliance');
      const res = await handleCompliance('hello', '+1555', 'cfg', 'Biz');
      expect(res.is_compliance_message).toBe(false);
      expect(res.response_required).toBe(false);
    });
  });

  it('isOptedOut returns true and false as expected', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({ data: table === 'sms_suppression_list' ? { id: 'sup1' } : null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));
      const { isOptedOut } = require('@/lib/leads-captain/v2/compliance');
      const t = await isOptedOut('biz', '+1555');
      expect(t).toBe(true);
      jest.resetModules();
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
            }),
          }),
        }),
      }));
      const { isOptedOut: isOptedOut2 } = require('@/lib/leads-captain/v2/compliance');
      const f = await isOptedOut2('biz', '+1666');
      expect(f).toBe(false);
    });
  });

  it('sendComplianceResponse succeeds and fails', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: jest.fn().mockResolvedValue({ sid: 'SM123' }) } },
      }));
      const { sendComplianceResponse } = require('@/lib/leads-captain/v2/compliance');
      const ok = await sendComplianceResponse('+1', '+2', 'msg');
      expect(ok.success).toBe(true);
      expect(ok.sid).toBe('SM123');
    });
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: { messages: { create: jest.fn().mockRejectedValue(new Error('fail')) } },
      }));
      const { sendComplianceResponse } = require('@/lib/leads-captain/v2/compliance');
      const bad = await sendComplianceResponse('+1', '+2', 'msg');
      expect(bad.success).toBe(false);
      expect(typeof bad.error).toBe('string');
    });
  });

  it('isLikelySpam and sanitizeMessage work', async () => {
    await jest.isolateModulesAsync(async () => {
      const { isLikelySpam, sanitizeMessage } = require('@/lib/leads-captain/v2/compliance');
      expect(isLikelySpam('Boost your SEO now')).toBe(true);
      expect(isLikelySpam('Need a repair')).toBe(false);
      const long = 'a'.repeat(1700) + '\x00\x01';
      const s = sanitizeMessage(long);
      expect(s.length).toBe(1600);
      expect(s.includes('\x00')).toBe(false);
    });
  });
});
