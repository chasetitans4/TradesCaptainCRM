import { describe, it, expect, jest } from '@jest/globals';

describe('LeadsCaptain v2 features', () => {
  it('maps business subscription tier to plan tier', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: 'Enterprise Gold' } }),
              }),
            }),
          }),
        }),
      }));
      const { getBusinessPlanTier } = require('@/lib/leads-captain/v2/features');
      const tier = await getBusinessPlanTier('b1');
      expect(tier).toBe('gold');
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: 'Pro' } }),
              }),
            }),
          }),
        }),
      }));
      const { getBusinessPlanTier } = require('@/lib/leads-captain/v2/features');
      const tier = await getBusinessPlanTier('b2');
      expect(tier).toBe('silver');
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: null } }),
              }),
            }),
          }),
        }),
      }));
      const { getBusinessPlanTier } = require('@/lib/leads-captain/v2/features');
      const tier = await getBusinessPlanTier('b3');
      expect(tier).toBe('standalone');
    });
  });

  it('canAccessFeature respects plan limits', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: 'Silver' } }),
              }),
            }),
          }),
        }),
      }));
      const { canAccessFeature } = require('@/lib/leads-captain/v2/features');
      expect(await canAccessFeature('b1', 'approval_queue')).toBe(true);
      expect(await canAccessFeature('b1', 'custom_intents')).toBe(false);
      expect(await canAccessFeature('b1', 'ai_responses')).toBe(true);
    });
  });

  it('checkPlanLimit calculates remaining with provided count', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: 'Standalone' } }),
              }),
            }),
          }),
        }),
      }));
      const { checkPlanLimit } = require('@/lib/leads-captain/v2/features');
      const res1 = await checkPlanLimit('b1', 'rules', 9);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(1);
      const res2 = await checkPlanLimit('b1', 'rules', 10);
      expect(res2.allowed).toBe(false);
      expect(res2.remaining).toBe(0);
    });
  });

  it('getAllLimitsStatus returns plan, limits, usage and features', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { subscription_tier: 'Silver' } }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_config') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { id: 'cfg1' } }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_rules') {
              return {
                select: () => ({
                  eq: () => ({
                    eq: () => ({ count: 3 }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_templates') {
              return {
                select: () => ({
                  eq: () => ({
                    eq: () => ({ count: 4 }),
                  }),
                }),
              };
            }
            if (table === 'leads_captain_notifications') {
              return {
                select: () => ({
                  eq: () => ({ count: 2 }),
                }),
              };
            }
            if (table === 'leads_captain_price_list') {
              return {
                select: () => ({
                  eq: () => ({ count: 5 }),
                }),
              };
            }
            return { select: () => ({}) };
          },
        }),
      }));
      const { getAllLimitsStatus } = require('@/lib/leads-captain/v2/features');
      const status = await getAllLimitsStatus('b1');
      expect(status.plan).toBe('silver');
      expect(status.usage.rules.current).toBe(3);
      expect(status.features.approval_queue).toBe(true);
      expect(status.features.custom_intents).toBe(false);
    });
  });
  it('getFeatureUnlockPlan returns lowest tier with feature', async () => {
    await jest.isolateModulesAsync(async () => {
      const { getFeatureUnlockPlan } = require('@/lib/leads-captain/v2/features');
      expect(getFeatureUnlockPlan('ai_responses')).toBe('standalone');
      expect(getFeatureUnlockPlan('approval_queue')).toBe('silver');
      expect(getFeatureUnlockPlan('custom_intents')).toBe('gold');
      expect(getFeatureUnlockPlan('multi_language')).toBe('gold');
      expect(getFeatureUnlockPlan('unknown' as any)).toBeNull();
    });
  });

  it('getUpgradeMessage returns correct message per plan', async () => {
    await jest.isolateModulesAsync(async () => {
      const { getUpgradeMessage } = require('@/lib/leads-captain/v2/features');
      expect(getUpgradeMessage('standalone', 'rules')).toContain('Upgrade to Silver or Gold');
      expect(getUpgradeMessage('silver', 'analytics')).toContain('Upgrade to Gold');
      expect(getUpgradeMessage('gold', 'custom_intents')).toContain("You're on our highest tier!");
      expect(getUpgradeMessage('unknown' as any, 'rules')).toContain('Contact support');
    });
  });

  it('canAccessFeature returns false for unknown feature', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: 'Silver' } }),
              }),
            }),
          }),
        }),
      }));
      const { canAccessFeature } = require('@/lib/leads-captain/v2/features');
      const res = await canAccessFeature('b1', 'unknown' as any);
      expect(res).toBe(false);
    });
  });

  it('checkPlanLimit handles ai_messages_per_conversation with provided count', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { subscription_tier: 'Silver' } }),
              }),
            }),
          }),
        }),
      }));
      const { checkPlanLimit } = require('@/lib/leads-captain/v2/features');
      const res = await checkPlanLimit('b1', 'ai_messages_per_conversation', 5);
      expect(res.allowed).toBe(true);
      expect(res.max).toBeGreaterThan(5);
    });
  });
});
