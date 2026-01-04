// =====================================================
// INVOICES LIBRARY
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { createPaymentLink } from '@/lib/stripe';
import { sendEmail, getInvoiceDeliveryEmailHtml, getPaymentReminderEmailHtml, isEmailConfigured } from '@/lib/email';

/**
 * Generate a unique invoice number (INV-0001, INV-0002, etc.)
 */
export async function generateInvoiceNumber(businessId: string): Promise<string> {
  const supabase = createAdminClient();

  // Get and increment counter
  const { data: business } = await supabase
    .from('businesses')
    .select('next_invoice_number')
    .eq('id', businessId)
    .single();

  const number = business?.next_invoice_number || 1;

  await supabase
    .from('businesses')
    .update({ next_invoice_number: number + 1 })
    .eq('id', businessId);

  return `INV-${String(number).padStart(4, '0')}`;
}

/**
 * Generate a random access token for public URL
 */
export function generateAccessToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate invoice totals from line items
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unit_price: number; is_taxable: boolean }>,
  taxRate: number,
  discountAmount: number = 0,
  amountPaid: number = 0
): {
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_due: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const taxableAmount = items
    .filter((item) => item.is_taxable)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const taxAmount = taxableAmount * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;
  const amountDue = total - amountPaid;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    amount_due: Math.round(amountDue * 100) / 100,
  };
}

/**
 * Generate a Stripe payment link for an invoice
 */
export async function generatePaymentLinkForInvoice(invoiceId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customer:customers (name, email),
      business:businesses (name)
    `
    )
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.amount_due <= 0) {
    throw new Error('Invoice is already paid');
  }

  const paymentLinkUrl = await createPaymentLink({
    invoiceId: invoice.id,
    businessId: invoice.business_id,
    amount: Math.round(invoice.amount_due * 100), // Convert to cents
    customerEmail: invoice.customer?.email,
    customerName: invoice.customer?.name || 'Customer',
    description: `${invoice.business.name} - Invoice ${invoice.invoice_number}`,
  });

  // Save the payment link URL
  await supabase
    .from('invoices')
    .update({ stripe_payment_link_url: paymentLinkUrl })
    .eq('id', invoiceId);

  return paymentLinkUrl;
}

/**
 * Send invoice via SMS
 */
export async function sendInvoiceViaSms(invoiceId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customer:customers (name, phone),
      business:businesses (name, twilio_phone_number)
    `
    )
    .eq('id', invoiceId)
    .single();

  if (!invoice?.customer?.phone) {
    throw new Error('Customer has no phone number');
  }

  // Generate payment link if not exists
  let paymentUrl = invoice.stripe_payment_link_url;
  if (!paymentUrl && invoice.amount_due > 0) {
    paymentUrl = await generatePaymentLinkForInvoice(invoiceId);
  }

  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/invoice/${invoice.access_token}`;

  let message = `Hi ${invoice.customer.name}! ${invoice.business.name} has sent you an invoice for $${invoice.total.toFixed(2)}.`;

  if (invoice.amount_due > 0 && paymentUrl) {
    message += ` Pay online: ${paymentUrl}`;
  } else if (invoice.amount_due <= 0) {
    message += ` This invoice has been paid. Thank you!`;
  }

  message += ` View details: ${invoiceUrl}`;

  // Dynamic import to avoid circular dependencies
  const { sendSMS } = await import('@/lib/twilio/sms');
  await sendSMS({
    to: invoice.customer.phone,
    body: message,
    businessId: invoice.business_id,
  });

  // Update sent_at
  await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId);
}

/**
 * Send invoice via Email
 */
export async function sendInvoiceViaEmail(invoiceId: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured');
  }

  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customer:customers (name, email),
      business:businesses (name, phone, email),
      line_items:invoice_items (id, description, quantity, unit_price, is_taxable)
    `
    )
    .eq('id', invoiceId)
    .single();

  if (!invoice?.customer?.email) {
    throw new Error('Customer has no email address');
  }

  // Generate payment link if not exists
  let paymentUrl = invoice.stripe_payment_link_url;
  if (!paymentUrl && invoice.amount_due > 0) {
    paymentUrl = await generatePaymentLinkForInvoice(invoiceId);
  }

  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/invoice/${invoice.access_token}`;

  // Build line items for email
  const lineItems = (invoice.line_items || []).map((item: any) => ({
    name: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.quantity * item.unit_price,
  }));

  // If no line items, create a single item from the invoice total
  if (lineItems.length === 0 && invoice.subtotal > 0) {
    lineItems.push({
      name: 'Services',
      quantity: 1,
      unitPrice: invoice.subtotal,
      total: invoice.subtotal,
    });
  }

  const emailHtml = getInvoiceDeliveryEmailHtml({
    customerName: invoice.customer.name,
    businessName: invoice.business.name,
    businessPhone: invoice.business.phone,
    invoiceNumber: invoice.invoice_number,
    amountDue: invoice.amount_due.toFixed(2),
    dueDate: new Date(invoice.due_date).toLocaleDateString(),
    lineItems,
    subtotal: invoice.subtotal.toFixed(2),
    taxAmount: invoice.tax_amount > 0 ? invoice.tax_amount.toFixed(2) : undefined,
    total: invoice.total.toFixed(2),
    paymentLink: paymentUrl || undefined,
    viewLink: invoiceUrl,
    notes: invoice.notes,
  });

  await sendEmail({
    to: invoice.customer.email,
    subject: `Invoice ${invoice.invoice_number} from ${invoice.business.name}`,
    html: emailHtml,
  });

  // Update sent_at
  await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId);
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminder(invoiceId: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured');
  }

  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customer:customers (name, email),
      business:businesses (name, phone)
    `
    )
    .eq('id', invoiceId)
    .single();

  if (!invoice?.customer?.email) {
    throw new Error('Customer has no email address');
  }

  if (invoice.amount_due <= 0) {
    throw new Error('Invoice is already paid');
  }

  // Generate payment link if not exists
  let paymentUrl = invoice.stripe_payment_link_url;
  if (!paymentUrl) {
    paymentUrl = await generatePaymentLinkForInvoice(invoiceId);
  }

  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/invoice/${invoice.access_token}`;

  // Calculate days overdue
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  const emailHtml = getPaymentReminderEmailHtml({
    customerName: invoice.customer.name,
    businessName: invoice.business.name,
    businessPhone: invoice.business.phone,
    invoiceNumber: invoice.invoice_number,
    amountDue: invoice.amount_due.toFixed(2),
    dueDate: dueDate.toLocaleDateString(),
    daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
    paymentLink: paymentUrl,
    viewLink: invoiceUrl,
  });

  const subject = daysOverdue > 0
    ? `Overdue: Invoice ${invoice.invoice_number} - Payment Required`
    : `Reminder: Invoice ${invoice.invoice_number} Due Soon`;

  await sendEmail({
    to: invoice.customer.email,
    subject,
    html: emailHtml,
  });

  // Log the reminder
  await supabase.from('invoice_reminders').insert({
    invoice_id: invoiceId,
    sent_at: new Date().toISOString(),
    method: 'email',
  });
}

/**
 * Record a manual payment (cash, check, etc.)
 */
export async function recordManualPayment(
  invoiceId: string,
  amount: number,
  method: 'cash' | 'check' | 'other',
  notes?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get current invoice state
  const { data: invoice } = await supabase
    .from('invoices')
    .select('business_id, total, amount_paid')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Record payment
  await supabase.from('payments').insert({
    business_id: invoice.business_id,
    invoice_id: invoiceId,
    amount,
    payment_method: method,
    notes,
    paid_at: new Date().toISOString(),
  });

  // Update invoice
  const newAmountPaid = (invoice.amount_paid || 0) + amount;
  const isPaid = newAmountPaid >= invoice.total;

  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: invoice.total - newAmountPaid,
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);
}

/**
 * Check for overdue invoices and update their status
 */
export async function updateOverdueInvoices(businessId: string): Promise<number> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('business_id', businessId)
    .in('status', ['sent', 'viewed'])
    .lt('due_date', today)
    .gt('amount_due', 0)
    .select('id');

  return data?.length || 0;
}

/**
 * Create an invoice from a job
 */
export async function createInvoiceFromJob(
  jobId: string,
  userId: string
): Promise<string> {
  const supabase = createAdminClient();

  // Get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job) {
    throw new Error('Job not found');
  }

  // Get business settings
  const { data: business } = await supabase
    .from('businesses')
    .select('invoice_due_days, invoice_terms, default_tax_rate')
    .eq('id', job.business_id)
    .single();

  const invoiceNumber = await generateInvoiceNumber(job.business_id);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (business?.invoice_due_days || 30));

  // Create invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      business_id: job.business_id,
      customer_id: job.customer_id,
      job_id: jobId,
      invoice_number: invoiceNumber,
      status: 'draft',
      subtotal: job.estimated_value || 0,
      tax_rate: business?.default_tax_rate || 0,
      tax_amount: 0,
      total: job.estimated_value || 0,
      amount_due: job.estimated_value || 0,
      terms: business?.invoice_terms,
      due_date: dueDate.toISOString().split('T')[0],
      access_token: generateAccessToken(),
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !invoice) {
    throw new Error('Failed to create invoice');
  }

  return invoice.id;
}
