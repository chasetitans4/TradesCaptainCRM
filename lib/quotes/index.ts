// =====================================================
// QUOTES LIBRARY
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

/**
 * Generate a unique quote number (Q-0001, Q-0002, etc.)
 */
export async function generateQuoteNumber(businessId: string): Promise<string> {
  const supabase = createAdminClient();

  // Get and increment counter
  const { data: business } = await supabase
    .from('businesses')
    .select('next_quote_number')
    .eq('id', businessId)
    .single();

  const number = business?.next_quote_number || 1;

  await supabase
    .from('businesses')
    .update({ next_quote_number: number + 1 })
    .eq('id', businessId);

  return `Q-${String(number).padStart(4, '0')}`;
}

/**
 * Generate a random access token for public URL
 */
export function generateAccessToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate quote totals from line items
 */
export function calculateQuoteTotals(
  items: Array<{ quantity: number; unit_price: number; is_taxable: boolean }>,
  taxRate: number,
  discountAmount: number = 0
): {
  subtotal: number;
  tax_amount: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const taxableAmount = items
    .filter((item) => item.is_taxable)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const taxAmount = taxableAmount * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Send quote via SMS
 */
export async function sendQuoteViaSms(quoteId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `
      *,
      customer:customers (name, phone),
      business:businesses (name, twilio_phone_number)
    `
    )
    .eq('id', quoteId)
    .single();

  if (!quote?.customer?.phone) {
    throw new Error('Customer has no phone number');
  }

  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/quote/${quote.access_token}`;

  const message = `Hi ${quote.customer.name}! ${quote.business.name} has sent you a quote for $${quote.total.toFixed(2)}. View and accept it here: ${quoteUrl}`;

  // Dynamic import to avoid circular dependencies
  const { sendSMS } = await import('@/lib/twilio/sms');
  await sendSMS({
    to: quote.customer.phone,
    body: message,
    businessId: quote.business_id,
  });

  // Update sent_at
  await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quoteId);
}

/**
 * Convert a quote to an invoice
 */
export async function convertQuoteToInvoice(
  quoteId: string,
  userId: string
): Promise<string> {
  const supabase = createAdminClient();

  // Get quote with items
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `
      *,
      items:quote_items (*)
    `
    )
    .eq('id', quoteId)
    .single();

  if (!quote) {
    throw new Error('Quote not found');
  }

  // Generate invoice number
  const { generateInvoiceNumber } = await import('@/lib/invoices');
  const invoiceNumber = await generateInvoiceNumber(quote.business_id);

  // Get business settings for due date
  const { data: business } = await supabase
    .from('businesses')
    .select('invoice_due_days, invoice_terms')
    .eq('id', quote.business_id)
    .single();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (business?.invoice_due_days || 30));

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      business_id: quote.business_id,
      customer_id: quote.customer_id,
      job_id: quote.job_id,
      quote_id: quoteId,
      invoice_number: invoiceNumber,
      status: 'draft',
      subtotal: quote.subtotal,
      tax_rate: quote.tax_rate,
      tax_amount: quote.tax_amount,
      discount_amount: quote.discount_amount,
      total: quote.total,
      amount_due: quote.total,
      notes: quote.notes,
      customer_notes: quote.customer_notes,
      terms: business?.invoice_terms || quote.terms,
      due_date: dueDate.toISOString().split('T')[0],
      access_token: generateAccessToken(),
      created_by: userId,
    })
    .select('id')
    .single();

  if (invoiceError || !invoice) {
    throw new Error('Failed to create invoice');
  }

  // Copy line items
  if (quote.items && quote.items.length > 0) {
    await supabase.from('invoice_items').insert(
      quote.items.map((item: any) => ({
        invoice_id: invoice.id,
        saved_service_id: item.saved_service_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        is_taxable: item.is_taxable,
        sort_order: item.sort_order,
      }))
    );
  }

  return invoice.id;
}

/**
 * Convert a quote to a job
 */
export async function convertQuoteToJob(
  quoteId: string,
  userId: string,
  scheduledDate?: string,
  scheduledTime?: string
): Promise<string> {
  const supabase = createAdminClient();

  // Get quote
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    throw new Error('Quote not found');
  }

  // Create job
  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      business_id: quote.business_id,
      customer_id: quote.customer_id,
      lead_id: quote.lead_id,
      quote_id: quoteId,
      title: `Job from Quote ${quote.quote_number}`,
      description: quote.customer_notes,
      status: scheduledDate ? 'scheduled' : 'new',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      estimated_value: quote.total,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !job) {
    throw new Error('Failed to create job');
  }

  // Update quote with job reference
  await supabase.from('quotes').update({ job_id: job.id }).eq('id', quoteId);

  return job.id;
}
