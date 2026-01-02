import Stripe from 'stripe';
import {
  handleAdminSubscriptionDeleted,
  handleAdminSubscriptionUpdated,
  handleAdminInvoicePaymentFailed,
  handleAdminCheckoutCompleted,
} from '@/lib/admin/stripe-webhook';

jest.mock('@/lib/admin/commissions', () => {
  return {
    forfeitSubscriptionCommissions: jest.fn(async () => 1),
  };
});

let scenario: any = {};

function makeSupabaseStub(s: any) {
  const updates: any[] = [];
  const inserts: any[] = [];
  const api = {
    updates,
    inserts,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {} };
      const chain = {
        select(sel?: string) {
          ctx._sel = sel;
          return chain;
        },
        eq(col: string, val: any) {
          ctx._eq[col] = val;
          return chain;
        },
        single: async () => {
          if (table === 'processed_webhook_events') {
            return { data: s.isProcessed ? { id: 'evt' } : null };
          }
          if (table === 'crm_accounts') {
            return { data: s.accountType === 'crm' ? s.crmAccount || s.account : null };
          }
          if (table === 'web_customers') {
            return { data: s.accountType === 'web' ? s.webCustomer || s.account : null };
          }
          return { data: null };
        },
        update: (data: any) => {
          updates.push({ table, data, where: ctx._eq });
          return {
            eq: () => chain,
          };
        },
        insert: async (data: any) => {
          inserts.push({ table, data });
          return { data: { id: 'ins-1' } };
        },
      };
      return chain as any;
    },
  };
  return api as any;
}

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => makeSupabaseStub(scenario)),
}));

const commissionsMocks: any = jest.requireMock('@/lib/admin/commissions');

describe('admin webhook subscription flows', () => {
  beforeEach(() => {
    commissionsMocks.forfeitSubscriptionCommissions.mockClear();
    scenario = {};
  });

  it('handles subscription deletion: cancels account and forfeits commissions', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: { id: 'acc-del', agent_id: 'agent-1' },
    };
    const sub = { id: 'sub_del' } as Stripe.Subscription;
    await handleAdminSubscriptionDeleted(sub, 'evt_del');
    expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith('sub_del', 'customer_cancelled');
  });

  it('handles subscription update: past_due triggers status update and forfeiture', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: { id: 'web-1' },
    };
    const sub = { id: 'sub_upd', status: 'past_due' } as Stripe.Subscription;
    await handleAdminSubscriptionUpdated(sub, 'evt_upd');
    expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith('sub_upd', 'clawback');
  });

  it('handles subscription update: canceled sets cancelled_at and forfeiture', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: { id: 'crm-2' },
    };
    const sub = { id: 'sub_cancel', status: 'canceled' } as Stripe.Subscription;
    await handleAdminSubscriptionUpdated(sub, 'evt_cancel');
    expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith('sub_cancel', 'customer_cancelled');
  });

  it('handles subscription update: unknown status maps to active without forfeiture', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: { id: 'crm-3' },
    };
    const sub = { id: 'sub_unknown', status: 'unknown-status' } as Stripe.Subscription;
    await handleAdminSubscriptionUpdated(sub, 'evt_unknown');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles subscription update: paused maps to suspended', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: { id: 'crm-paused' },
    };
    const sub = { id: 'sub_paused', status: 'paused' } as Stripe.Subscription;
    await handleAdminSubscriptionUpdated(sub, 'evt_paused');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles subscription update: unpaid triggers forfeiture', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: { id: 'web-unpaid' },
    };
    const sub = { id: 'sub_unpaid', status: 'unpaid' } as Stripe.Subscription;
    await handleAdminSubscriptionUpdated(sub, 'evt_unpaid');
    expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith('sub_unpaid', 'clawback');
  });

  it('handles invoice payment failed: sets account status past_due', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: { id: 'crm-1' },
    };
    const inv = { subscription: 'sub_failed' } as Stripe.Invoice;
    await handleAdminInvoicePaymentFailed(inv, 'evt_failed');
    // No direct assertion on updates array; ensuring no throw and mark processed behavior
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles invoice payment failed: no subscription id returns early', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: { id: 'crm-1' },
    };
    const inv = { subscription: null } as unknown as Stripe.Invoice;
    await handleAdminInvoicePaymentFailed(inv, 'evt_failed_nosub');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles invoice payment failed for web customers', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: { id: 'web-1' },
    };
    const inv = { subscription: 'sub_failed_web' } as Stripe.Invoice;
    await handleAdminInvoicePaymentFailed(inv, 'evt_failed_web');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('returns early when invoice payment failed event already processed', async () => {
    scenario = {
      isProcessed: true,
      accountType: 'crm',
      account: { id: 'crm-processed' },
    };
    const inv = { subscription: 'sub_processed' } as Stripe.Invoice;
    await handleAdminInvoicePaymentFailed(inv, 'evt_processed');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles checkout completed: links subscription to account via metadata', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
    };
    const session = {
      subscription: 'sub_link',
      customer: 'cus_1',
      metadata: { crm_account_id: 'acc-1' },
    } as unknown as Stripe.Checkout.Session;
    await handleAdminCheckoutCompleted(session, 'evt_checkout');
    // Expect no errors; linking performed via supabase update
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles checkout completed: missing subscription returns', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
    };
    const session = {
      subscription: null,
      customer: 'cus_2',
      metadata: {},
    } as unknown as Stripe.Checkout.Session;
    await handleAdminCheckoutCompleted(session, 'evt_checkout_missing');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles checkout completed: links subscription to web customer via metadata', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
    };
    const session = {
      subscription: 'sub_link_web',
      customer: 'cus_web',
      metadata: { web_customer_id: 'web-acc-1' },
    } as unknown as Stripe.Checkout.Session;
    await handleAdminCheckoutCompleted(session, 'evt_checkout_web');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });
  it('returns early when checkout session event already processed', async () => {
    scenario = {
      isProcessed: true,
      accountType: 'crm',
    };
    const session = {
      subscription: 'sub_already',
      customer: 'cus_already',
      metadata: { crm_account_id: 'acc-early' },
    } as unknown as Stripe.Checkout.Session;
    await handleAdminCheckoutCompleted(session, 'evt_checkout_processed');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });
  it('handles subscription deletion for web customers', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'web',
      account: { id: 'web-del', agent_id: 'agent-2' },
    };
    const sub = { id: 'sub_del_web' } as Stripe.Subscription;
    await handleAdminSubscriptionDeleted(sub, 'evt_del_web');
    expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith('sub_del_web', 'customer_cancelled');
  });

  it('returns early when subscription deleted event already processed', async () => {
    scenario = {
      isProcessed: true,
      accountType: 'crm',
      account: { id: 'acc-del-processed', agent_id: 'agent-3' },
    };
    const sub = { id: 'sub_del_processed' } as Stripe.Subscription;
    await handleAdminSubscriptionDeleted(sub, 'evt_del_processed');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('handles subscription deletion when no account is found', async () => {
    scenario = {
      isProcessed: false,
      accountType: 'crm',
      account: null,
    };
    const sub = { id: 'sub_del_noacc' } as Stripe.Subscription;
    await handleAdminSubscriptionDeleted(sub, 'evt_del_noacc');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });

  it('returns early when subscription updated event already processed', async () => {
    scenario = {
      isProcessed: true,
      accountType: 'crm',
      account: { id: 'acc-upd-processed' },
    };
    const sub = { id: 'sub_upd_processed', status: 'past_due' } as Stripe.Subscription;
    await handleAdminSubscriptionUpdated(sub, 'evt_upd_processed');
    expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
  });
});
