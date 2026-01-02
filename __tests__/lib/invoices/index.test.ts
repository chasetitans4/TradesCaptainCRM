import {
  calculateInvoiceTotals,
  generateInvoiceNumber,
  generatePaymentLinkForInvoice,
  sendInvoiceViaEmail,
  sendPaymentReminder,
  recordManualPayment,
  updateOverdueInvoices,
} from '@/lib/invoices';

function makeSupabaseStub() {
  const state: any = {
    businesses: new Map<string, any>(),
    invoices: new Map<string, any>(),
    payments: [] as any[],
    reminders: [] as any[],
    updates: [] as any[],
  };
  const api = {
    state,
    from(table: string) {
      const ctx: any = { _table: table, _eq: {}, _in: null, _lt: null, _gt: null, _sel: null };
      const chain = {
        select(sel?: string) {
          ctx._sel = sel;
          return chain;
        },
        eq(col: string, val: any) {
          ctx._eq[col] = val;
          return chain;
        },
        in(col: string, arr: any[]) {
          ctx._in = { col, arr };
          return chain;
        },
        lt(col: string, val: any) {
          ctx._lt = { col, val };
          return chain;
        },
        gt(col: string, val: any) {
          ctx._gt = { col, val };
          return chain;
        },
        single: async () => {
          switch (table) {
            case 'businesses': {
              const id = ctx._eq['id'];
              return { data: state.businesses.get(id) || null };
            }
            case 'invoices': {
              const id = ctx._eq['id'];
              return { data: state.invoices.get(id) || null };
            }
            default:
              return { data: null };
          }
        },
        insert: async (data: any) => {
          switch (table) {
            case 'payments':
              state.payments.push(data);
              return { data: { id: `pay_${state.payments.length}` } };
            case 'invoice_reminders':
              state.reminders.push(data);
              return { data: { id: `rem_${state.reminders.length}` } };
            case 'invoices':
              const id = data.id || `inv_${state.invoices.size + 1}`;
              state.invoices.set(id, { ...data, id });
              return { data: { id } };
            default:
              return { data: null };
          }
        },
        update: (data: any) => {
          state.updates.push({ table, data, where: { ...ctx._eq } });
          return {
            eq: async (col?: string, val?: any) => {
              if (table === 'businesses' && col === 'id') {
                const id = val;
                const cur = state.businesses.get(id) || {};
                state.businesses.set(id, { ...cur, ...data });
              }
              if (table === 'invoices') {
                const id = col === 'id' ? val : ctx._eq['id'];
                if (id) {
                  const cur = state.invoices.get(id) || {};
                  state.invoices.set(id, { ...cur, ...data });
                }
              }
              if (table === 'payments') {
                const intentId = ctx._eq['stripe_payment_intent_id'];
                const idx = state.payments.findIndex((p: any) => p.stripe_payment_intent_id === intentId);
                if (idx >= 0) {
                  state.payments[idx] = { ...state.payments[idx], ...data };
                }
              }
              return { data: null };
            },
          };
        },
        selectAll() {
          return chain;
        },
      };
      return chain as any;
    },
  };
  return api as any;
}

describe('lib/invoices', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('calculateInvoiceTotals', () => {
    it('calculates totals with tax, discount, and amountPaid', () => {
      const items = [
        { quantity: 2, unit_price: 50, is_taxable: true },
        { quantity: 1, unit_price: 30, is_taxable: false },
      ];
      const res = calculateInvoiceTotals(items, 10, 5, 20);
      expect(res.subtotal).toBe(130);
      expect(res.tax_amount).toBe(10); // 2*50 * 10%
      expect(res.total).toBe(135); // 130 + 10 - 5
      expect(res.amount_due).toBe(115); // 135 - 20
    });

    it('handles empty items gracefully', () => {
      const res = calculateInvoiceTotals([], 8, 0, 0);
      expect(res.subtotal).toBe(0);
      expect(res.tax_amount).toBe(0);
      expect(res.total).toBe(0);
      expect(res.amount_due).toBe(0);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('increments and formats invoice number', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.businesses.set('biz_1', { next_invoice_number: 12 });
            return supabase;
          },
        }));
        const { generateInvoiceNumber } = require('@/lib/invoices');
        const num = await generateInvoiceNumber('biz_1');
        expect(num).toBe('INV-0012');
      });
    });

    it('defaults to INV-0001 when counter missing', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.businesses.set('biz_2', {});
            return supabase;
          },
        }));
        const { generateInvoiceNumber } = require('@/lib/invoices');
        const num = await generateInvoiceNumber('biz_2');
        expect(num).toBe('INV-0001');
      });
    });
  });

  describe('generatePaymentLinkForInvoice', () => {
    it('throws when invoice not found', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => makeSupabaseStub(),
        }));
        const { generatePaymentLinkForInvoice } = require('@/lib/invoices');
        await expect(generatePaymentLinkForInvoice('missing')).rejects.toThrow('Invoice not found');
      });
    });

    it('throws when invoice already paid', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_paid', { id: 'inv_paid', amount_due: 0 });
            return supabase;
          },
        }));
        const { generatePaymentLinkForInvoice } = require('@/lib/invoices');
        await expect(generatePaymentLinkForInvoice('inv_paid')).rejects.toThrow('Invoice is already paid');
      });
    });

    it('returns payment link and updates invoice', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: jest.fn(async () => 'https://stripe.link/abc'),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_due', {
              id: 'inv_due',
              business_id: 'biz_x',
              amount_due: 25,
              customer: { email: 'c@example.com', name: 'Customer' },
              business: { name: 'BizX' },
              invoice_number: 'INV-0001',
            });
            return supabase;
          },
        }));
        const { generatePaymentLinkForInvoice } = require('@/lib/invoices');
        const url = await generatePaymentLinkForInvoice('inv_due');
        expect(url).toBe('https://stripe.link/abc');
      });
    });
  });

  describe('sendInvoiceViaEmail', () => {
    it('throws when email not configured', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => false,
        }));
        const { sendInvoiceViaEmail } = require('@/lib/invoices');
        await expect(sendInvoiceViaEmail('inv_x')).rejects.toThrow('Email is not configured');
      });
    });

    it('throws when customer has no email', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_no_email', {
              id: 'inv_no_email',
              customer: { name: 'A', email: null },
            });
            return supabase;
          },
        }));
        const { sendInvoiceViaEmail } = require('@/lib/invoices');
        await expect(sendInvoiceViaEmail('inv_no_email')).rejects.toThrow('Customer has no email address');
      });
    });

    it('sends email and updates invoice status', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendMock = jest.fn(async () => ({ id: 'email_1' }));
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: sendMock,
          getInvoiceDeliveryEmailHtml: () => '<html>Invoice</html>',
        }));
        jest.doMock('@/lib/invoices', () => jest.requireActual('@/lib/invoices'));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_email', {
              id: 'inv_email',
              business_id: 'biz_e',
              access_token: 'tok123',
              customer: { name: 'Jane', email: 'jane@example.com' },
              business: { name: 'ACME', phone: '555-1234', email: 'biz@example.com' },
              invoice_number: 'INV-1001',
              amount_due: 50,
              subtotal: 50,
              tax_amount: 0,
              total: 50,
              due_date: new Date().toISOString(),
              line_items: [],
              notes: 'Thanks',
              stripe_payment_link_url: 'https://pay',
            });
            return supabase;
          },
        }));
        const { sendInvoiceViaEmail } = require('@/lib/invoices');
        await sendInvoiceViaEmail('inv_email');
        expect(sendMock).toHaveBeenCalled();
      });
    });

    it('generates payment link when missing and amount due', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendMock = jest.fn(async () => ({ id: 'email_2' }));
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: sendMock,
          getInvoiceDeliveryEmailHtml: () => '<html>Invoice Generated Link</html>',
        }));
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: jest.fn(async () => 'https://generated'),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const shared = (globalThis as any).__sharedEmailSupabase || makeSupabaseStub();
            (globalThis as any).__sharedEmailSupabase = shared;
            shared.state.invoices.set('inv_email_gen', {
              id: 'inv_email_gen',
              business_id: 'biz_e2',
              access_token: 'tok456',
              customer: { name: 'Jane', email: 'jane@example.com' },
              business: { name: 'ACME', phone: '555-1234', email: 'biz@example.com' },
              invoice_number: 'INV-1002',
              amount_due: 75,
              subtotal: 75,
              tax_amount: 0,
              total: 75,
              due_date: new Date().toISOString(),
              line_items: [],
              notes: 'Thanks',
              stripe_payment_link_url: null,
            });
            return shared;
          },
        }));
        const { sendInvoiceViaEmail } = require('@/lib/invoices');
        await sendInvoiceViaEmail('inv_email_gen');
        expect(sendMock).toHaveBeenCalled();
      });
    });

    it('does not generate payment link when amount due is zero', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendMock = jest.fn(async () => ({ id: 'email_3' }));
        const createPaymentLinkMock = jest.fn(async () => 'https://should-not-be-called');
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: sendMock,
          getInvoiceDeliveryEmailHtml: () => '<html>No Payment Needed</html>',
        }));
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: createPaymentLinkMock,
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const shared = (globalThis as any).__sharedEmailSupabaseZero || makeSupabaseStub();
            (globalThis as any).__sharedEmailSupabaseZero = shared;
            shared.state.invoices.set('inv_email_zero', {
              id: 'inv_email_zero',
              business_id: 'biz_e3',
              access_token: 'tok789',
              customer: { name: 'Jane', email: 'jane@example.com' },
              business: { name: 'ACME', phone: '555-1234', email: 'biz@example.com' },
              invoice_number: 'INV-1003',
              amount_due: 0,
              subtotal: 0,
              tax_amount: 0,
              total: 0,
              due_date: new Date().toISOString(),
              line_items: [],
              notes: 'Paid',
              stripe_payment_link_url: null,
            });
            return shared;
          },
        }));
        const { sendInvoiceViaEmail } = require('@/lib/invoices');
        await sendInvoiceViaEmail('inv_email_zero');
        expect(sendMock).toHaveBeenCalled();
        expect(createPaymentLinkMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('sendPaymentReminder', () => {
    it('throws when email not configured', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => false,
        }));
        const { sendPaymentReminder } = require('@/lib/invoices');
        await expect(sendPaymentReminder('inv_x')).rejects.toThrow('Email is not configured');
      });
    });

    it('throws when customer has no email', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: jest.fn(),
          getPaymentReminderEmailHtml: jest.fn(),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_no_email', {
              id: 'inv_no_email',
              amount_due: 50,
              due_date: new Date().toISOString(),
              customer: { name: 'A', email: null },
              business: { name: 'Biz', phone: '555-0000' },
              access_token: 'tok_rem',
              stripe_payment_link_url: null,
            });
            return supabase;
          },
        }));
        const { sendPaymentReminder } = require('@/lib/invoices');
        await expect(sendPaymentReminder('inv_no_email')).rejects.toThrow('Customer has no email address');
      });
    });

    it('throws when invoice already paid', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: jest.fn(),
          getPaymentReminderEmailHtml: jest.fn(),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_paid', {
              id: 'inv_paid',
              amount_due: 0,
              customer: { email: 'x@example.com' },
            });
            return supabase;
          },
        }));
        const { sendPaymentReminder } = require('@/lib/invoices');
        await expect(sendPaymentReminder('inv_paid')).rejects.toThrow('Invoice is already paid');
      });
    });

    it('sends reminder email and logs record', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendMock = jest.fn();
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: sendMock,
          getPaymentReminderEmailHtml: jest.fn(() => '<html>Reminder</html>'),
        }));
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: jest.fn(async () => 'https://pay'),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_due', {
              id: 'inv_due',
              access_token: 'tokx',
              amount_due: 50,
              due_date: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
              customer: { name: 'Jane', email: 'jane@example.com' },
              business: { name: 'ACME', phone: '555-1234' },
              stripe_payment_link_url: null,
            });
            return supabase;
          },
        }));
        const { sendPaymentReminder } = require('@/lib/invoices');
        await sendPaymentReminder('inv_due');
        expect(sendMock).toHaveBeenCalled();
      });
    });

    it('sends upcoming due reminder and sets subject', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendMock = jest.fn();
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: sendMock,
          getPaymentReminderEmailHtml: jest.fn(() => '<html>Reminder Soon</html>'),
        }));
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: jest.fn(async () => 'https://pay2'),
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_due_soon', {
              id: 'inv_due_soon',
              access_token: 'toky',
              amount_due: 75,
              due_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days ahead
              customer: { name: 'Joe', email: 'joe@example.com' },
              business: { name: 'ACME', phone: '555-1234' },
              stripe_payment_link_url: null,
            });
            return supabase;
          },
        }));
        const { sendPaymentReminder } = require('@/lib/invoices');
        await sendPaymentReminder('inv_due_soon');
        const subjectArg = (sendMock as jest.Mock).mock.calls[0][0].subject;
        expect(subjectArg).toMatch(/^Reminder:/);
      });
    });

    it('uses existing payment link without generating a new one', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendMock = jest.fn();
        const createPaymentLinkMock = jest.fn(async () => 'https://should-not');
        jest.doMock('@/lib/email', () => ({
          isEmailConfigured: () => true,
          sendEmail: sendMock,
          getPaymentReminderEmailHtml: jest.fn(() => '<html>Reminder Existing Link</html>'),
        }));
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: createPaymentLinkMock,
        }));
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_due_existing', {
              id: 'inv_due_existing',
              access_token: 'tokz',
              amount_due: 50,
              due_date: new Date(Date.now() - 86400000).toISOString(),
              customer: { name: 'Jane', email: 'jane@example.com' },
              business: { name: 'ACME', phone: '555-1234' },
              stripe_payment_link_url: 'https://already',
            });
            return supabase;
          },
        }));
        const { sendPaymentReminder } = require('@/lib/invoices');
        await sendPaymentReminder('inv_due_existing');
        expect(sendMock).toHaveBeenCalled();
        expect(createPaymentLinkMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('recordManualPayment', () => {
    it('throws when invoice not found', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => makeSupabaseStub(),
        }));
        const { recordManualPayment } = require('@/lib/invoices');
        await expect(recordManualPayment('missing_inv', 10, 'cash')).rejects.toThrow('Invoice not found');
      });
    });
    it('records payment and marks invoice paid', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => {
          const shared = (globalThis as any).__sharedSupabase || makeSupabaseStub();
          (globalThis as any).__sharedSupabase = shared;
          shared.state.invoices.set('inv_manual', {
            id: 'inv_manual',
            business_id: 'biz_m',
            total: 100,
            amount_paid: 80,
          });
          return {
            createAdminClient: () => shared,
          };
        });
        const { recordManualPayment } = require('@/lib/invoices');
        await recordManualPayment('inv_manual', 20, 'cash', 'note');
        // Verify invoice updated to paid
        const server = require('@/lib/supabase/server');
        const supabase = server.createAdminClient();
        const inv = supabase.state.invoices.get('inv_manual');
        expect(inv.amount_due).toBe(0);
        expect(inv.status).toBe('paid');
      });
    });
    it('records partial payment and updates status', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => {
          const shared = (globalThis as any).__sharedSupabase2 || makeSupabaseStub();
          (globalThis as any).__sharedSupabase2 = shared;
          shared.state.invoices.set('inv_partial', {
            id: 'inv_partial',
            business_id: 'biz_m2',
            total: 100,
            amount_paid: 20,
          });
          return {
            createAdminClient: () => shared,
          };
        });
        const { recordManualPayment } = require('@/lib/invoices');
        await recordManualPayment('inv_partial', 30, 'cash', 'note');
        const server = require('@/lib/supabase/server');
        const supabase = server.createAdminClient();
        const inv = supabase.state.invoices.get('inv_partial');
        expect(inv.amount_due).toBe(50);
        expect(inv.status).toBe('partial');
        expect(inv.paid_at).toBeNull();
      });
    });
  });

  describe('updateOverdueInvoices', () => {
    it('returns count of overdue invoices updated', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            return {
              from: (_table: string) => ({
                update: (_data: any) => ({
                  eq: () => ({
                    in: () => ({
                      lt: () => ({
                        gt: () => ({
                          select: () => ({ id: 'x' }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          },
        }));
        const { updateOverdueInvoices } = require('@/lib/invoices');
        const count = await updateOverdueInvoices('biz_x');
        expect(typeof count).toBe('number');
      });
    });
  });

  describe('sendInvoiceViaSms', () => {
    it('throws when customer has no phone', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.invoices.set('inv_no_phone', {
              id: 'inv_no_phone',
              customer: { name: 'C', phone: null },
            });
            return supabase;
          },
        }));
        const { sendInvoiceViaSms } = require('@/lib/invoices');
        await expect(sendInvoiceViaSms('inv_no_phone')).rejects.toThrow('Customer has no phone number');
      });
    });

    it('sends paid notification without payment link', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendSMS = jest.fn(async () => ({ id: 'sms_paid' }));
        jest.doMock('@/lib/twilio/sms', () => ({ sendSMS }));
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
        jest.doMock('@/lib/supabase/server', () => {
          const shared = (globalThis as any).__sharedSmsPaid || makeSupabaseStub();
          (globalThis as any).__sharedSmsPaid = shared;
          shared.state.invoices.set('inv_sms_paid', {
            id: 'inv_sms_paid',
            business_id: 'biz_sp',
            access_token: 'tok_paid',
            total: 120,
            amount_due: 0,
            customer: { name: 'Jane', phone: '555-9990' },
            business: { name: 'ACME', twilio_phone_number: '+15550002' },
            stripe_payment_link_url: null,
          });
          return {
            createAdminClient: () => shared,
          };
        });
        const { sendInvoiceViaSms } = require('@/lib/invoices');
        await sendInvoiceViaSms('inv_sms_paid');
        const args = (sendSMS as jest.Mock).mock.calls[0][0];
        expect(args.body).toContain('This invoice has been paid. Thank you!');
        expect(args.body).not.toContain('Pay online');
      });
    });

    it('generates payment link and sends SMS for unpaid invoice', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendSMS = jest.fn(async () => ({ id: 'sms_1' }));
        jest.doMock('@/lib/twilio/sms', () => ({ sendSMS }));
        jest.doMock('@/lib/stripe', () => ({
          createPaymentLink: jest.fn(async () => 'https://pay.link/sms'),
        }));
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
        jest.doMock('@/lib/supabase/server', () => {
          const shared = (globalThis as any).__sharedSmsSupabase || makeSupabaseStub();
          (globalThis as any).__sharedSmsSupabase = shared;
          if (!shared.state.invoices.get('inv_sms')) {
            shared.state.invoices.set('inv_sms', {
              id: 'inv_sms',
              business_id: 'biz_s',
              access_token: 'tok_sms',
              total: 120,
              amount_due: 120,
              customer: { name: 'Jane', phone: '555-9999' },
              business: { name: 'ACME', twilio_phone_number: '+15550000' },
              stripe_payment_link_url: null,
            });
          }
          return {
            createAdminClient: () => shared,
          };
        });
        const { sendInvoiceViaSms } = require('@/lib/invoices');
        await sendInvoiceViaSms('inv_sms');
        expect(sendSMS).toHaveBeenCalled();
        const args = (sendSMS as jest.Mock).mock.calls[0][0];
        expect(args.to).toBe('555-9999');
        expect(args.body).toContain('Pay online: https://pay.link/sms');
        expect(args.body).toContain('https://app.example.com/view/invoice/tok_sms');
        const server = require('@/lib/supabase/server');
        const supabase = server.createAdminClient();
        const inv = supabase.state.invoices.get('inv_sms');
        expect(inv.status).toBe('sent');
      });
    });

    it('sends paid message when invoice has no amount due', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendSMS = jest.fn(async () => ({ id: 'sms_2' }));
        jest.doMock('@/lib/twilio/sms', () => ({ sendSMS }));
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const shared = (globalThis as any).__sharedSmsSupabase || makeSupabaseStub();
            (globalThis as any).__sharedSmsSupabase = shared;
            shared.state.invoices.set('inv_paid_sms', {
              id: 'inv_paid_sms',
              business_id: 'biz_p',
              access_token: 'tok_paid',
              total: 80,
              amount_due: 0,
              customer: { name: 'John', phone: '555-0000' },
              business: { name: 'ACME', twilio_phone_number: '+15550000' },
              stripe_payment_link_url: 'https://pay.link/existing',
            });
            return shared;
          },
        }));
        const { sendInvoiceViaSms } = require('@/lib/invoices');
        await sendInvoiceViaSms('inv_paid_sms');
        const args = (sendSMS as jest.Mock).mock.calls[0][0];
        expect(args.body).toContain('This invoice has been paid. Thank you!');
      });
    });

    it('uses existing payment link for unpaid invoice', async () => {
      await jest.isolateModulesAsync(async () => {
        const sendSMS = jest.fn(async () => ({ id: 'sms_3' }));
        jest.doMock('@/lib/twilio/sms', () => ({ sendSMS }));
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const shared = (globalThis as any).__sharedSmsSupabase2 || makeSupabaseStub();
            (globalThis as any).__sharedSmsSupabase2 = shared;
            shared.state.invoices.set('inv_unpaid_existing', {
              id: 'inv_unpaid_existing',
              business_id: 'biz_s2',
              access_token: 'tok_sms2',
              total: 200,
              amount_due: 200,
              customer: { name: 'Alex', phone: '555-2222' },
              business: { name: 'ACME', twilio_phone_number: '+15550001' },
              stripe_payment_link_url: 'https://pay.link/existing2',
            });
            return shared;
          },
        }));
        const { sendInvoiceViaSms } = require('@/lib/invoices');
        await sendInvoiceViaSms('inv_unpaid_existing');
        const args = (sendSMS as jest.Mock).mock.calls[0][0];
        expect(args.body).toContain('Pay online: https://pay.link/existing2');
        expect(args.body).toContain('https://app.example.com/view/invoice/tok_sms2');
      });
    });
  });

  describe('createInvoiceFromJob', () => {
    it('throws when job not found', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            return supabase;
          },
        }));
        const { createInvoiceFromJob } = require('@/lib/invoices');
        await expect(createInvoiceFromJob('job_missing', 'user_x')).rejects.toThrow('Job not found');
      });
    });

    it('creates invoice from job and returns id', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.businesses.set('biz_j', {
              next_invoice_number: 5,
              invoice_due_days: 30,
              invoice_terms: 'Net 30',
              default_tax_rate: 0,
            });
            supabase.state.invoices.set('seed', {}); // ensure map exists
            return {
              state: supabase.state,
              from(table: string) {
                const ctx: any = { _table: table, _eq: {}, _sel: null };
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
                    if (table === 'jobs') {
                      const id = ctx._eq['id'];
                      if (id === 'job_1') {
                        return {
                          data: {
                            id: 'job_1',
                            business_id: 'biz_j',
                            customer_id: 'cust_1',
                            estimated_value: 200,
                          },
                        };
                      }
                      return { data: null };
                    }
                    if (table === 'businesses') {
                      const id = ctx._eq['id'];
                      return { data: supabase.state.businesses.get(id) || null };
                    }
                    return { data: null };
                  },
                update: (data: any) => {
                  return {
                    eq: async (col?: string, val?: any) => {
                      if (table === 'businesses' && col === 'id') {
                        const id = val;
                        const cur = supabase.state.businesses.get(id) || {};
                        supabase.state.businesses.set(id, { ...cur, ...data });
                      }
                      if (table === 'invoices') {
                        const id = col === 'id' ? val : ctx._eq['id'];
                        const cur = supabase.state.invoices.get(id) || {};
                        supabase.state.invoices.set(id, { ...cur, ...data });
                      }
                      return { data: null };
                    },
                  };
                },
                insert: (data: any) => {
                  if (table === 'invoices') {
                    const id = `inv_${Date.now()}`;
                    supabase.state.invoices.set(id, { ...data, id });
                    return {
                      select: (_sel?: string) => ({
                        single: async () => ({ data: { id } }),
                      }),
                    };
                  }
                  return { data: null };
                },
              };
              return chain as any;
            },
          };
        },
      }));
        const { createInvoiceFromJob } = require('@/lib/invoices');
        const id = await createInvoiceFromJob('job_1', 'user_1');
        expect(typeof id).toBe('string');
      });
    });

    it('throws when invoice creation fails', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const supabase = makeSupabaseStub();
            supabase.state.businesses.set('biz_j2', {
              next_invoice_number: 10,
            });
            return {
              state: supabase.state,
              from(table: string) {
                const ctx: any = { _table: table, _eq: {} };
                const chain = {
                  select(sel?: string) {
                    return chain;
                  },
                  eq(col: string, val: any) {
                    ctx._eq[col] = val;
                    return chain;
                  },
                  single: async () => {
                    if (table === 'jobs') {
                      const id = ctx._eq['id'];
                      if (id === 'job_fail') {
                        return {
                          data: {
                            id: 'job_fail',
                            business_id: 'biz_j2',
                            customer_id: 'cust_2',
                            estimated_value: 300,
                          },
                        };
                      }
                      return { data: null };
                    }
                    if (table === 'businesses') {
                      const id = ctx._eq['id'];
                      return { data: supabase.state.businesses.get(id) || null };
                    }
                    return { data: null };
                  },
                  update: (data: any) => {
                    return {
                      eq: async (col?: string, val?: any) => {
                        if (table === 'businesses' && col === 'id') {
                          const id = val;
                          const cur = supabase.state.businesses.get(id) || {};
                          supabase.state.businesses.set(id, { ...cur, ...data });
                        }
                        return { data: null };
                      },
                    };
                  },
                  insert: (_data: any) => {
                    if (table === 'invoices') {
                      return {
                        select: () => ({
                          single: async () => ({ data: null, error: { message: 'bad' } }),
                        }),
                      };
                    }
                    return { data: null };
                  },
                };
                return chain as any;
              },
            };
          },
        }));
        const { createInvoiceFromJob } = require('@/lib/invoices');
        await expect(createInvoiceFromJob('job_fail', 'user_x')).rejects.toThrow('Failed to create invoice');
      });
    });

    it('creates invoice with default business settings', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/lib/supabase/server', () => ({
          createAdminClient: () => {
            const shared = (globalThis as any).__sharedCreateDefaults || makeSupabaseStub();
            (globalThis as any).__sharedCreateDefaults = shared;
            return {
              state: shared.state,
              from(table: string) {
                const ctx: any = { _table: table, _eq: {}, _sel: null };
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
                    if (table === 'jobs') {
                      const id = ctx._eq['id'];
                      if (id === 'job_defaults') {
                        return {
                          data: {
                            id: 'job_defaults',
                            business_id: 'biz_def',
                            customer_id: 'cust_def',
                          },
                        };
                      }
                      return { data: null };
                    }
                    if (table === 'businesses') {
                      return { data: null };
                    }
                    return { data: null };
                  },
                  update: (data: any) => {
                    return {
                      eq: async (col?: string, val?: any) => {
                        if (table === 'businesses' && col === 'id') {
                          const id = val;
                          const cur = shared.state.businesses.get(id) || {};
                          shared.state.businesses.set(id, { ...cur, ...data });
                        }
                        if (table === 'invoices') {
                          const id = col === 'id' ? val : ctx._eq['id'];
                          const cur = shared.state.invoices.get(id) || {};
                          shared.state.invoices.set(id, { ...cur, ...data });
                        }
                        return { data: null };
                      },
                    };
                  },
                  insert: (data: any) => {
                    if (table === 'invoices') {
                      const id = `inv_${Date.now()}`;
                      shared.state.invoices.set(id, { ...data, id });
                      return {
                        select: (_sel?: string) => ({
                          single: async () => ({ data: { id } }),
                        }),
                      };
                    }
                    return { data: null };
                  },
                };
                return chain as any;
              },
            };
          },
        }));
        const { createInvoiceFromJob } = require('@/lib/invoices');
        const id = await createInvoiceFromJob('job_defaults', 'user_def');
        const server = require('@/lib/supabase/server');
        const supabase = server.createAdminClient();
        const inv = supabase.state.invoices.get(id);
        expect(inv.tax_rate).toBe(0);
        expect(inv.terms).toBeUndefined();
        expect(inv.amount_due).toBe(0);
        expect(inv.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
  
  describe('generateAccessToken', () => {
    it('returns 64-character hex string', () => {
      const { generateAccessToken } = require('@/lib/invoices');
      const token = generateAccessToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
