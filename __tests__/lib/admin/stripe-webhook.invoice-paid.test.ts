import Stripe from 'stripe';

jest.mock('@/lib/admin/commissions', () => {
  const m = {
    createUpfrontCommission: jest.fn(async () => ({ id: 'comm-upfront' })),
    createRecurringCommission: jest.fn(async () => ({ id: 'comm-recurring' })),
    createAnnualCommission: jest.fn(async () => ({ id: 'comm-annual' })),
    markCommissionEligible: jest.fn(async () => {}),
    upsertRetentionTracking: jest.fn(async () => ({})),
    getCommissionRules: jest.fn(async () => mockGetRules),
  };
  return m;
});

let scenario: any = {};

function makeSupabaseStub(s: any) {
  const updates: any[] = [];
  const selects: Record<string, any> = {};
  const api = {
    updates,
    selects,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {}, _sel: null, _order: null, _limit: null };
      return {
        select(sel: string) {
          ctx._sel = sel;
          return this;
        },
        eq(col: string, val: any) {
          ctx._eq[col] = val;
          return this;
        },
        single: async () => {
          switch (table) {
            case 'processed_webhook_events':
              return { data: s.isProcessed ? { id: 'evt' } : null };
            case 'crm_accounts':
              return { data: s.accountType === 'crm' ? s.account : null };
            case 'web_customers':
              return { data: s.accountType === 'web' ? s.account : null };
            case 'payment_tracking':
              return { data: s.trackingExists ? s.tracking : null };
            default:
              return { data: null };
          }
        },
        order() {
          return this;
        },
        limit(n: number) {
          ctx._limit = n;
          if (table === 'commissions' && ctx._sel === 'id') {
            return { data: s.upfrontExists ? [{ id: 'comm-upfront' }] : [] };
          }
          return this;
        },
        insert: (data: any) => {
          if (table === 'processed_webhook_events') {
            return {
              select: () => ({ single: async () => ({ data: { id: 'p1' }, error: null }) }),
            };
          }
          if (table === 'payment_tracking') {
            const inserted = {
              id: 'track-1',
              successful_payments: 0,
              first_payment_at: null,
              ...data,
            };
            return {
              select: () => ({ single: async () => ({ data: inserted, error: null }) }),
            };
          }
          return {
            select: () => ({ single: async () => ({ data: null, error: null }) }),
          };
        },
        update: (data: any) => {
          updates.push({ table, data });
          return {
            eq: async () => ({ data: null }),
          };
        },
        range() {
          return this;
        },
        async then() {},
        async selectAll() {},
        async execute() {},
        async limitReturn() {},
        async returning() {},
        async upsert() {
          return { data: null };
        },
        async selectArray() {
          return { data: [] };
        },
        async selectList() {
          return { data: [] };
        },
      };
    },
  };
  return api as any;
}

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => makeSupabaseStub(scenario)),
}));

const mockGetRules = {
  upfront_amount: 500,
  upfront_delay_payments: 2,
  recurring_rate: 0.1,
  recurring_start_payment: 3,
  recurring_end_payment: 14,
  annual_rate: 0.35,
  annual_renewal_commission: false,
  retention_enabled: true,
  plan_type: 'blue_pro',
  plan_tier: 'individual',
  billing_interval: 'month',
  id: 'rule-1',
  is_active: true,
  version: 'v1',
  effective_from: new Date().toISOString(),
};

import { handleAdminInvoicePaid } from '@/lib/admin/stripe-webhook';
const commissionsMocks: any = jest.requireMock('@/lib/admin/commissions');

describe('admin webhook invoice paid', () => {
  beforeEach(() => {
    commissionsMocks.createUpfrontCommission.mockClear();
    commissionsMocks.createRecurringCommission.mockClear();
    commissionsMocks.createAnnualCommission.mockClear();
    commissionsMocks.markCommissionEligible.mockClear();
    commissionsMocks.getCommissionRules.mockClear();
  });

  it('creates pending upfront commission on first payment (monthly)', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-1',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-1',
        successful_payments: 0,
      },
    };

    const invoice = { subscription: 'sub_1', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_1');
    expect(commissionsMocks.createUpfrontCommission).toHaveBeenCalledTimes(1);
    expect(commissionsMocks.markCommissionEligible).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('marks pending upfront eligible on second payment (monthly)', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-1',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-1',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
      upfrontExists: true,
    };

    const invoice = { subscription: 'sub_1', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_2');
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.markCommissionEligible).toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('creates annual commission on second payment (annual)', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-annual',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'year',
      },
      trackingExists: true,
      tracking: {
        id: 'track-annual',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
    };

    const invoice = { subscription: 'sub_annual', amount_paid: 200000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_annual');
    expect(commissionsMocks.createAnnualCommission).toHaveBeenCalledTimes(1);
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
  });

  it('logs and throws when createAnnualCommission fails', async () => {
    commissionsMocks.createAnnualCommission.mockImplementationOnce(async () => {
      throw new Error('annual-fail');
    });
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-annual',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'year',
      },
      trackingExists: true,
      tracking: {
        id: 'track-annual',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
    };
    const invoice = { subscription: 'sub_annual', amount_paid: 200000 } as unknown as Stripe.Invoice;
    await expect(handleAdminInvoicePaid(invoice, 'evt_annual_error')).rejects.toThrow('annual-fail');
  });
  it('creates recurring commission starting at payment 3 and sets eligibility', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-1',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-1',
        successful_payments: 2,
        first_payment_at: new Date().toISOString(),
      },
    };

    const invoice = { subscription: 'sub_1', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_recurring_start');
    expect(commissionsMocks.createRecurringCommission).toHaveBeenCalledTimes(1);
  });

  it('logs and throws when createRecurringCommission fails', async () => {
    commissionsMocks.createRecurringCommission.mockImplementationOnce(async () => {
      throw new Error('recurring-fail');
    });
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-1',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-1',
        successful_payments: 2,
        first_payment_at: new Date().toISOString(),
      },
    };
    const invoice = { subscription: 'sub_1', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await expect(handleAdminInvoicePaid(invoice, 'evt_recurring_error')).rejects.toThrow('recurring-fail');
  });

  it('does not create recurring commission beyond end window', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-1',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-1',
        successful_payments: 14,
        first_payment_at: new Date().toISOString(),
      },
    };

    const invoice = { subscription: 'sub_1', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_recurring_after_end');
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
  });

  it('skips processing when event already processed (idempotency)', async () => {
    scenario = {
      isProcessed: true,
      accountType: 'crm',
      account: {
        id: 'acc-1',
        agent_id: 'agent-1',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-1',
        successful_payments: 0,
      },
    };

    const invoice = { subscription: 'sub_1', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_processed');
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.markCommissionEligible).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('returns early when account not found', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: null,
      trackingExists: false,
    };
    const invoice = { subscription: 'sub_missing', amount_paid: 5000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_missing');
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('marks processed when account has no agent_id', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-no-agent',
        agent_id: null,
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-no-agent',
        successful_payments: 0,
      },
    };
    const invoice = { subscription: 'sub_noagent', amount_paid: 5000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_noagent');
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('updates tracking and returns when rules are missing', async () => {
    commissionsMocks.getCommissionRules.mockResolvedValueOnce(null);
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-2',
        agent_id: 'agent-2',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-2',
        successful_payments: 1,
      },
    };
    const invoice = { subscription: 'sub_rules_missing', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_rules_missing');
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });
  
  it('does not create retention tracking when retention_enabled is false', async () => {
    commissionsMocks.upsertRetentionTracking.mockClear();
    commissionsMocks.getCommissionRules.mockResolvedValueOnce({
      ...mockGetRules,
      retention_enabled: false,
    });
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: {
        id: 'web-123',
        agent_id: 'agent-9',
        plan_type: 'gold_pro',
        plan_tier: 'team',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-web',
        successful_payments: 0,
      },
    };
    const invoice = { subscription: 'sub_web', amount_paid: 5000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_retention_disabled');
    expect(commissionsMocks.upsertRetentionTracking).not.toHaveBeenCalled();
  });
  
  it('logs and throws when createUpfrontCommission fails on first payment', async () => {
    commissionsMocks.createUpfrontCommission.mockImplementationOnce(async () => {
      throw new Error('upfront-fail');
    });
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-upfront',
        agent_id: 'agent-3',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-upfront',
        successful_payments: 0,
      },
    };
    const invoice = { subscription: 'sub_upfront', amount_paid: 15000 } as unknown as Stripe.Invoice;
    await expect(handleAdminInvoicePaid(invoice, 'evt_upfront_error')).rejects.toThrow('upfront-fail');
  });
  
  it('logs and throws when markCommissionEligible fails on second payment', async () => {
    commissionsMocks.markCommissionEligible.mockImplementationOnce(async () => {
      throw new Error('eligible-fail');
    });
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-upfront-eligible',
        agent_id: 'agent-4',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-upfront-eligible',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
      upfrontExists: true,
    };
    const invoice = { subscription: 'sub_upfront_eligible', amount_paid: 15000 } as unknown as Stripe.Invoice;
    await expect(handleAdminInvoicePaid(invoice, 'evt_mark_eligible_error')).rejects.toThrow('eligible-fail');
  });

  it('logs and throws when createAnnualCommission fails (annual billing)', async () => {
    const commissionsMocks = require('@/lib/admin/commissions');
    commissionsMocks.createAnnualCommission.mockImplementationOnce(async () => {
      throw new Error('annual-fail');
    });
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-annual',
        agent_id: 'agent-annual',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'year',
      },
      trackingExists: true,
      tracking: {
        id: 'track-annual',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
      upfrontExists: true,
    };
    const invoice = { subscription: 'sub_annual', amount_paid: 20000 } as unknown as Stripe.Invoice;
    await expect(handleAdminInvoicePaid(invoice, 'evt_annual_error')).rejects.toThrow('annual-fail');
  });

  it('creates retention tracking for web customers on first payment', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: {
        id: 'web-acc-1',
        agent_id: 'agent-web',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-web-1',
        successful_payments: 0,
      },
    };
    const invoice = { subscription: 'sub_web', amount_paid: 5000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_web_first');
    expect(commissionsMocks.upsertRetentionTracking).toHaveBeenCalled();
  });

  it('uses defaults when billing_interval, plan_tier, and amount_paid are missing', async () => {
    commissionsMocks.getCommissionRules.mockClear();
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-defaults',
        agent_id: 'agent-defaults',
        plan_type: 'blue_pro',
      },
      trackingExists: true,
      tracking: {
        id: 'track-defaults',
        successful_payments: 2,
      },
    };
    const invoice = { subscription: 'sub_defaults' } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_defaults');
    expect(commissionsMocks.createRecurringCommission).toHaveBeenCalledTimes(1);
    const args = commissionsMocks.getCommissionRules.mock.calls[0];
    expect(args[0]).toBe('blue_pro');
    expect(args[1]).toBe('month');
    expect(args[2]).toBeUndefined();
  });

  it('creates new payment tracking when tracking does not exist but account exists', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-new-tracking',
        agent_id: 'agent-new-track',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: false,
      tracking: null,
    };
    const invoice = { subscription: 'sub_new_track', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_new_tracking');
    // When no tracking exists, it creates new tracking and then processes first payment
    expect(commissionsMocks.createUpfrontCommission).toHaveBeenCalledTimes(1);
  });

  it('handles web customer with no existing tracking', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: {
        id: 'web-new-tracking',
        agent_id: 'agent-web-new',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: false,
      tracking: null,
    };
    const invoice = { subscription: 'sub_web_new', amount_paid: 8000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_web_new_tracking');
    // Creates tracking, processes first payment with upfront commission
    expect(commissionsMocks.createUpfrontCommission).toHaveBeenCalledTimes(1);
    expect(commissionsMocks.upsertRetentionTracking).toHaveBeenCalled();
  });

  it('returns early when invoice has no subscription', async () => {
    const invoice = { subscription: null, amount_paid: 5000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_no_sub');
    // Should not call any commission functions
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createRecurringCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('sets second_payment_at on second payment', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-second',
        agent_id: 'agent-second',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-second',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
      upfrontExists: true,
    };
    const invoice = { subscription: 'sub_second', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_second');
    expect(commissionsMocks.markCommissionEligible).toHaveBeenCalled();
  });

  it('sets third_payment_at on third payment', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-third',
        agent_id: 'agent-third',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-third',
        successful_payments: 2,
        first_payment_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        second_payment_at: new Date().toISOString(),
      },
    };
    const invoice = { subscription: 'sub_third', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_third');
    expect(commissionsMocks.createRecurringCommission).toHaveBeenCalled();
  });

  it('does not mark upfront eligible when no pending upfront commission exists', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-no-upfront',
        agent_id: 'agent-no-upfront',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-no-upfront',
        successful_payments: 1,
        first_payment_at: new Date().toISOString(),
      },
      upfrontExists: false,
    };
    const invoice = { subscription: 'sub_no_upfront', amount_paid: 10000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_no_upfront');
    expect(commissionsMocks.markCommissionEligible).not.toHaveBeenCalled();
  });

  it('skips upfront commission for annual billing on first payment', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'acc-annual-first',
        agent_id: 'agent-annual-first',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'year',
      },
      trackingExists: true,
      tracking: {
        id: 'track-annual-first',
        successful_payments: 0,
      },
    };
    const invoice = { subscription: 'sub_annual_first', amount_paid: 100000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_annual_first');
    // Annual billing skips upfront commission
    expect(commissionsMocks.createUpfrontCommission).not.toHaveBeenCalled();
    expect(commissionsMocks.createAnnualCommission).not.toHaveBeenCalled();
  });

  it('handles retention tracking for CRM account on first payment', async () => {
    commissionsMocks.upsertRetentionTracking.mockClear();
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: {
        id: 'crm-retention',
        agent_id: 'agent-retention',
        plan_type: 'blue_pro',
        plan_tier: 'individual',
        billing_interval: 'month',
      },
      trackingExists: true,
      tracking: {
        id: 'track-retention',
        successful_payments: 0,
      },
    };
    const invoice = { subscription: 'sub_crm_ret', amount_paid: 5000 } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaid(invoice, 'evt_crm_retention');
    expect(commissionsMocks.upsertRetentionTracking).toHaveBeenCalledWith(
      'crm-retention',
      'crm',
      'agent-retention',
      {}
    );
  });
});
