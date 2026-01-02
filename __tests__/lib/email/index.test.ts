import { sendEmail, isEmailConfigured } from '@/lib/email';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(async (args: any) => ({ id: 'email_1', args })),
      },
    })),
  };
});

describe('lib/email', () => {
  const ORIGINAL = process.env.RESEND_API_KEY;
  beforeEach(() => {
    jest.resetModules();
    delete process.env.RESEND_API_KEY;
  });
  afterAll(() => {
    process.env.RESEND_API_KEY = ORIGINAL;
  });

  it('returns not configured when API key missing', async () => {
    const mod = require('@/lib/email');
    expect(mod.isEmailConfigured()).toBe(false);
    const res = await mod.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(res.success).toBe(false);
  });

  it('sends email successfully when configured', async () => {
    process.env.RESEND_API_KEY = 'rk_test_x';
    const mod = require('@/lib/email');
    expect(mod.isEmailConfigured()).toBe(true);
    const res = await mod.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
  });

  it('sendEmail uses provided from and text body', async () => {
    process.env.RESEND_API_KEY = 'rk_test_x';
    const mod = require('@/lib/email');
    const res = await mod.sendEmail({
      to: 'user@example.com',
      subject: 'Test From',
      html: '<p>Hi</p>',
      from: 'Team <team@example.com>',
      text: 'Plain body',
    });
    expect(res.success).toBe(true);
    expect(res.data.args.from).toBe('Team <team@example.com>');
    expect(res.data.args.text).toBe('Plain body');
  });

  it('handles send error and returns failure', async () => {
    process.env.RESEND_API_KEY = 'rk_test_x';
    const { Resend } = require('resend');
    (Resend as jest.Mock).mockImplementation(() => ({
      emails: { send: jest.fn(async () => { throw new Error('fail'); }) },
    }));
    const mod = require('@/lib/email');
    const res = await mod.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(res.success).toBe(false);
  });

  it('renders invoice delivery email with dynamic sections', () => {
    const { getInvoiceDeliveryEmailHtml } = require('@/lib/email');
    const html = getInvoiceDeliveryEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      businessPhone: '555-1234',
      invoiceNumber: 'INV-1',
      amountDue: '$100.00',
      dueDate: '01/15/2026',
      lineItems: [{ name: 'Service', quantity: 2, unitPrice: 50, total: 100 }],
      subtotal: '$100.00',
      taxAmount: '$0.00',
      total: '$100.00',
      paymentLink: 'https://pay',
      viewLink: 'https://view',
      notes: 'Thank you',
    });
    expect(html).toContain('Pay Now');
    expect(html).toContain('Tax:');
    expect(html).toContain('Note:');
    expect(html).toContain('Questions? Call us at');
  });

  it('renders invoice delivery email without optional sections', () => {
    const { getInvoiceDeliveryEmailHtml } = require('@/lib/email');
    const html = getInvoiceDeliveryEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      invoiceNumber: 'INV-2',
      amountDue: '$80.00',
      dueDate: '01/20/2026',
      lineItems: [{ name: 'Service', quantity: 1, unitPrice: 80, total: 80 }],
      subtotal: '$80.00',
      total: '$80.00',
      viewLink: 'https://view',
    });
    expect(html).toContain('View Invoice');
    expect(html).not.toContain('Pay Now');
    expect(html).not.toContain('Questions? Call us at');
  });

  it('renders overdue payment reminder with phone and payment link', () => {
    const { getPaymentReminderEmailHtml } = require('@/lib/email');
    const html = getPaymentReminderEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      businessPhone: '555-1234',
      invoiceNumber: 'INV-3',
      amountDue: '$50.00',
      dueDate: '01/10/2026',
      daysOverdue: 3,
      paymentLink: 'https://pay',
      viewLink: 'https://view',
    });
    expect(html).toContain('Payment Reminder');
    expect(html).toContain('Pay Now');
    expect(html).toContain('Questions? Call us at 555-1234');
    expect(html).toContain('This invoice is 3 days overdue');
  });

  it('renders upcoming due payment reminder without optional sections', () => {
    const { getPaymentReminderEmailHtml } = require('@/lib/email');
    const html = getPaymentReminderEmailHtml({
      customerName: 'John',
      businessName: 'ACME',
      invoiceNumber: 'INV-4',
      amountDue: '$75.00',
      dueDate: '01/20/2026',
      viewLink: 'https://view',
    });
    expect(html).toContain('Payment is due soon');
    expect(html).not.toContain('Pay Now');
    expect(html).not.toContain('Questions? Call us at');
  });

  it('renders payment reminder overdue with urgency', () => {
    const { getPaymentReminderEmailHtml } = require('@/lib/email');
    const html = getPaymentReminderEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      invoiceNumber: 'INV-3',
      amountDue: '$50.00',
      dueDate: '01/10/2026',
      daysOverdue: 3,
      paymentLink: 'https://pay',
      viewLink: 'https://view',
    });
    expect(html).toContain('This invoice is 3 days overdue');
    expect(html).toContain('Pay Now');
    expect(html).toContain('#dc2626');
  });

  it('renders payment reminder upcoming without overdue', () => {
    const { getPaymentReminderEmailHtml } = require('@/lib/email');
    const html = getPaymentReminderEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      invoiceNumber: 'INV-4',
      amountDue: '$50.00',
      dueDate: '01/10/2026',
      viewLink: 'https://view',
    });
    expect(html).toContain('Payment is due soon');
    expect(html).not.toContain('Pay Now');
  });

  it('renders quote delivery email with optional sections', () => {
    const { getQuoteDeliveryEmailHtml } = require('@/lib/email');
    const html = getQuoteDeliveryEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      businessPhone: '555-1234',
      quoteNumber: 'Q-1001',
      totalAmount: '$250.00',
      validUntil: '02/01/2026',
      lineItems: [{ name: 'Service', quantity: 2, unitPrice: 100, total: 200 }],
      subtotal: '$200.00',
      taxAmount: '$50.00',
      viewLink: 'https://view-quote',
      notes: 'Special discount applied',
    });
    expect(html).toContain('Quote #Q-1001');
    expect(html).toContain('Tax:');
    expect(html).toContain('Note:');
    expect(html).toContain('Questions? Call us at 555-1234');
  });

  it('renders quote delivery email without optional sections', () => {
    const { getQuoteDeliveryEmailHtml } = require('@/lib/email');
    const html = getQuoteDeliveryEmailHtml({
      customerName: 'John',
      businessName: 'ACME',
      quoteNumber: 'Q-1002',
      totalAmount: '$120.00',
      validUntil: '02/15/2026',
      lineItems: [{ name: 'Inspection', quantity: 1, unitPrice: 120, total: 120 }],
      subtotal: '$120.00',
      viewLink: 'https://view-quote',
    });
    expect(html).toContain('View & Accept Quote');
    expect(html).not.toContain('Tax:');
    expect(html).not.toContain('Questions? Call us at');
  });

  it('renders payment confirmation with remaining balance', () => {
    const { getPaymentConfirmationEmailHtml } = require('@/lib/email');
    const html = getPaymentConfirmationEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      invoiceNumber: 'INV-5',
      amountPaid: '$90.00',
      paymentMethod: 'Card',
      paymentDate: '01/20/2026',
      remainingBalance: '$10.00',
    });
    expect(html).toContain('Payment Received');
    expect(html).toContain('Remaining Balance:');
    expect(html).toContain('$10.00');
  });

  it('renders payment confirmation without remaining balance section when zero', () => {
    const { getPaymentConfirmationEmailHtml } = require('@/lib/email');
    const html = getPaymentConfirmationEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      invoiceNumber: 'INV-6',
      amountPaid: '$100.00',
      paymentMethod: 'Card',
      paymentDate: '01/21/2026',
      remainingBalance: '$0.00',
    });
    expect(html).toContain('Payment Received');
    expect(html).not.toContain('Remaining Balance:');
  });

  it('renders job confirmation with optional sections', () => {
    const { getJobConfirmationEmailHtml } = require('@/lib/email');
    const html = getJobConfirmationEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      businessPhone: '555-1234',
      jobTitle: 'HVAC Inspection',
      scheduledDate: '02/10/2026',
      scheduledTime: '10:00 AM',
      address: '123 Main St',
      technicianName: 'Alex',
      notes: 'Please ensure access to attic',
      portalLink: 'https://portal',
    });
    expect(html).toContain('HVAC Inspection');
    expect(html).toContain('123 Main St');
    expect(html).toContain('Alex');
    expect(html).toContain('Please ensure access to attic');
    expect(html).toContain('View in Portal');
    expect(html).toContain('Need to reschedule? Call us at 555-1234');
  });

  it('renders job confirmation without optional sections', () => {
    const { getJobConfirmationEmailHtml } = require('@/lib/email');
    const html = getJobConfirmationEmailHtml({
      customerName: 'John',
      businessName: 'ACME',
      jobTitle: 'Pipe Repair',
      scheduledDate: '02/12/2026',
      scheduledTime: '2:00 PM',
    });
    expect(html).toContain('Pipe Repair');
    expect(html).not.toContain('Location');
    expect(html).not.toContain('Technician');
    expect(html).not.toContain('View in Portal');
  });

  it('renders job completed with optional sections', () => {
    const { getJobCompletedEmailHtml } = require('@/lib/email');
    const html = getJobCompletedEmailHtml({
      customerName: 'Jane',
      businessName: 'ACME',
      businessPhone: '555-1234',
      jobTitle: 'Water Heater Install',
      completedDate: '02/15/2026',
      technicianName: 'Sam',
      workSummary: 'Installed new 50-gallon heater',
      invoiceLink: 'https://invoice',
      reviewLink: 'https://review',
    });
    expect(html).toContain('Water Heater Install');
    expect(html).toContain('Sam');
    expect(html).toContain('Installed new 50-gallon heater');
    expect(html).toContain('View Invoice');
    expect(html).toContain('Leave Review');
  });

  it('renders job completed without optional sections', () => {
    const { getJobCompletedEmailHtml } = require('@/lib/email');
    const html = getJobCompletedEmailHtml({
      customerName: 'John',
      businessName: 'ACME',
      jobTitle: 'Drain Cleaning',
      completedDate: '02/18/2026',
    });
    expect(html).toContain('Drain Cleaning');
    expect(html).not.toContain('Technician');
    expect(html).not.toContain('Work Summary');
    expect(html).not.toContain('View Invoice');
    expect(html).not.toContain('Leave Review');
  });
});
