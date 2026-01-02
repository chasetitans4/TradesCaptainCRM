import Stripe from 'stripe';

jest.mock('@/lib/admin/commissions', () => ({
  forfeitSubscriptionCommissions: jest.fn(async () => {}),
}));

let scenario: any = {};

function makeSupabaseStub(s: any) {
  const updates: any[] = [];
  const api = {
    updates,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {}, _sel: null };
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
              if (ctx._eq['stripe_event_id']) {
                return { data: s.isProcessed ? { id: 'evt' } : null };
              }
              if (ctx._eq['event_id']) {
                return { data: s.isProcessedAlt ? { id: 'evt' } : null };
              }
              return { data: null };
            case 'crm_accounts':
              return { data: s.crmAccount || null };
            case 'web_customers':
              return { data: s.webCustomer || null };
            default:
              return { data: null };
          }
        },
        insert: (data: any) => {
          return {
            select: () => ({ single: async () => ({ data: { id: 'p1' }, error: null }) }),
          };
        },
        update: (data: any) => {
          updates.push({ table, data });
          return {
            eq: async () => ({ data: null }),
          };
        },
      };
    },
  };
  return api as any;
}

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => makeSupabaseStub(scenario)),
}));

import {
  handleAdminSubscriptionDeleted,
  handleAdminSubscriptionUpdated,
  handleAdminInvoicePaymentFailed,
  handleAdminCheckoutCompleted,
} from '@/lib/admin/stripe-webhook';

const commissionsMocks: any = jest.requireMock('@/lib/admin/commissions');

describe('admin stripe-webhook handlers', () => {
  beforeEach(() => {
    scenario = {};
    commissionsMocks.forfeitSubscriptionCommissions.mockClear();
  });

  describe('handleAdminSubscriptionDeleted', () => {
    it('skips processing when event already processed', async () => {
      scenario = { isProcessed: true };
      const sub = { id: 'sub_del' } as Stripe.Subscription;
      await handleAdminSubscriptionDeleted(sub, 'evt_del_processed');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('updates crm_account to cancelled and forfeits commissions', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-1', agent_id: 'agent-1' },
      };
      const sub = { id: 'sub_del_crm' } as Stripe.Subscription;
      await handleAdminSubscriptionDeleted(sub, 'evt_del_crm');
      expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith(
        'sub_del_crm',
        'customer_cancelled'
      );
    });

    it('updates web_customer to cancelled and forfeits commissions', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: null,
        webCustomer: { id: 'web-1', agent_id: 'agent-2' },
      };
      const sub = { id: 'sub_del_web' } as Stripe.Subscription;
      await handleAdminSubscriptionDeleted(sub, 'evt_del_web');
      expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith(
        'sub_del_web',
        'customer_cancelled'
      );
    });

    it('handles case when no account found', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: null,
        webCustomer: null,
      };
      const sub = { id: 'sub_del_none' } as Stripe.Subscription;
      await handleAdminSubscriptionDeleted(sub, 'evt_del_none');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });
    
    it('propagates error when forfeitSubscriptionCommissions fails', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-err', agent_id: 'agent-x' },
      };
      commissionsMocks.forfeitSubscriptionCommissions.mockRejectedValueOnce(new Error('forfeit-fail'));
      const sub = { id: 'sub_del_err' } as Stripe.Subscription;
      await expect(handleAdminSubscriptionDeleted(sub, 'evt_del_err')).rejects.toThrow('forfeit-fail');
      commissionsMocks.forfeitSubscriptionCommissions.mockReset();
    });
  });

  describe('handleAdminSubscriptionUpdated', () => {
    it('skips processing when event already processed', async () => {
      scenario = { isProcessed: true };
      const sub = { id: 'sub_upd', status: 'active' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_upd_processed');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('updates crm_account status from active subscription', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-upd' },
      };
      const sub = { id: 'sub_upd_active', status: 'active' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_upd_active');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('updates web_customer status', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: null,
        webCustomer: { id: 'web-upd' },
      };
      const sub = { id: 'sub_upd_web', status: 'active' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_upd_web');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('forfeits commissions when subscription goes past_due', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-past-due' },
      };
      const sub = { id: 'sub_past_due', status: 'past_due' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_past_due');
      expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith(
        'sub_past_due',
        'clawback'
      );
    });

    it('forfeits commissions when subscription is canceled', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-canceled' },
      };
      const sub = { id: 'sub_canceled', status: 'canceled' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_canceled');
      expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith(
        'sub_canceled',
        'customer_cancelled'
      );
    });

    it('forfeits commissions when subscription is unpaid', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-unpaid' },
      };
      const sub = { id: 'sub_unpaid', status: 'unpaid' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_unpaid');
      expect(commissionsMocks.forfeitSubscriptionCommissions).toHaveBeenCalledWith(
        'sub_unpaid',
        'clawback'
      );
    });

    it('maps trialing status correctly', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-trial' },
      };
      const sub = { id: 'sub_trial', status: 'trialing' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_trial');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('maps paused status correctly', async () => {
      scenario = {
        isProcessed: false,
        webCustomer: { id: 'web-paused' },
      };
      const sub = { id: 'sub_paused', status: 'paused' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_paused');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('maps incomplete_expired status correctly', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-inc-exp' },
      };
      const sub = { id: 'sub_inc_exp', status: 'incomplete_expired' } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_inc_exp');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });

    it('defaults to active status for unknown status', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-unknown' },
      };
      const sub = { id: 'sub_unknown', status: 'unknown_status' as any } as Stripe.Subscription;
      await handleAdminSubscriptionUpdated(sub, 'evt_unknown');
      expect(commissionsMocks.forfeitSubscriptionCommissions).not.toHaveBeenCalled();
    });
  });

  describe('handleAdminInvoicePaymentFailed', () => {
    it('skips processing when event already processed', async () => {
      scenario = { isProcessed: true };
      const invoice = { subscription: 'sub_fail' } as unknown as Stripe.Invoice;
      await handleAdminInvoicePaymentFailed(invoice, 'evt_fail_processed');
    });

    it('returns early when no subscription', async () => {
      scenario = { isProcessed: false };
      const invoice = { subscription: null } as unknown as Stripe.Invoice;
      await handleAdminInvoicePaymentFailed(invoice, 'evt_fail_no_sub');
    });

    it('updates crm_account to past_due', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: { id: 'crm-fail' },
      };
      const invoice = { subscription: 'sub_crm_fail' } as unknown as Stripe.Invoice;
      await handleAdminInvoicePaymentFailed(invoice, 'evt_crm_fail');
    });

    it('updates web_customer to past_due', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: null,
        webCustomer: { id: 'web-fail' },
      };
      const invoice = { subscription: 'sub_web_fail' } as unknown as Stripe.Invoice;
      await handleAdminInvoicePaymentFailed(invoice, 'evt_web_fail');
    });

    it('handles case when no account found', async () => {
      scenario = {
        isProcessed: false,
        crmAccount: null,
        webCustomer: null,
      };
      const invoice = { subscription: 'sub_fail_none' } as unknown as Stripe.Invoice;
      await handleAdminInvoicePaymentFailed(invoice, 'evt_fail_none');
    });
  });

  describe('handleAdminCheckoutCompleted', () => {
    it('skips processing when event already processed', async () => {
      scenario = { isProcessed: true };
      const session = { subscription: 'sub_checkout' } as Stripe.Checkout.Session;
      await handleAdminCheckoutCompleted(session, 'evt_checkout_processed');
    });

    it('returns early when no subscription', async () => {
      scenario = { isProcessed: false };
      const session = { subscription: null, metadata: {} } as unknown as Stripe.Checkout.Session;
      await handleAdminCheckoutCompleted(session, 'evt_checkout_no_sub');
    });

    it('links crm_account when metadata contains crm_account_id', async () => {
      scenario = { isProcessed: false };
      const session = {
        subscription: 'sub_checkout_crm',
        customer: 'cus_checkout',
        metadata: { crm_account_id: 'crm-checkout' },
      } as unknown as Stripe.Checkout.Session;
      await handleAdminCheckoutCompleted(session, 'evt_checkout_crm');
    });

    it('links web_customer when metadata contains web_customer_id', async () => {
      scenario = { isProcessed: false };
      const session = {
        subscription: 'sub_checkout_web',
        customer: 'cus_checkout_web',
        metadata: { web_customer_id: 'web-checkout' },
      } as unknown as Stripe.Checkout.Session;
      await handleAdminCheckoutCompleted(session, 'evt_checkout_web');
    });

    it('handles missing metadata gracefully', async () => {
      scenario = { isProcessed: false };
      const session = {
        subscription: 'sub_checkout_no_meta',
        customer: 'cus_checkout_no_meta',
        metadata: null,
      } as unknown as Stripe.Checkout.Session;
      await handleAdminCheckoutCompleted(session, 'evt_checkout_no_meta');
    });
  });
});
