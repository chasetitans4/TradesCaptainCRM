// =====================================================
// RECURRING INVOICES LIBRARY
// Generate invoices from service agreements
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { generateInvoiceNumber, generateAccessToken } from './index';

interface RecurringInvoiceResult {
  generated: number;
  failed: number;
  errors: string[];
}

/**
 * Calculate the next invoice date based on frequency
 */
export function calculateNextDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'biannual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}

/**
 * Generate recurring invoices for all active service agreements
 * Call this from a cron job
 */
export async function generateRecurringInvoices(
  options: {
    businessId?: string;
    daysAhead?: number;
  } = {}
): Promise<RecurringInvoiceResult> {
  const { businessId, daysAhead = 0 } = options;
  const supabase = createAdminClient();

  const result: RecurringInvoiceResult = {
    generated: 0,
    failed: 0,
    errors: [],
  };

  // Calculate target date (today + daysAhead)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  // Find service agreements due for invoicing
  let query = supabase
    .from('service_agreements')
    .select(`
      id,
      business_id,
      customer_id,
      name,
      description,
      frequency,
      price_per_service,
      next_service_date,
      job_template,
      customer:customers (name, email)
    `)
    .eq('status', 'active')
    .lte('next_service_date', targetDateStr);

  if (businessId) {
    query = query.eq('business_id', businessId);
  }

  const { data: agreements, error } = await query;

  if (error) {
    result.errors.push(`Failed to fetch agreements: ${error.message}`);
    return result;
  }

  for (const agreement of agreements || []) {
    try {
      // Check if invoice already exists for this agreement and date
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('service_agreement_id', agreement.id)
        .eq('invoice_date', agreement.next_service_date)
        .single();

      if (existingInvoice) {
        // Invoice already exists, just update next date
        await supabase
          .from('service_agreements')
          .update({
            next_service_date: calculateNextDate(
              new Date(agreement.next_service_date),
              agreement.frequency
            ).toISOString().split('T')[0],
          })
          .eq('id', agreement.id);
        continue;
      }

      // Get business settings for due days
      const { data: business } = await supabase
        .from('businesses')
        .select('invoice_due_days, default_tax_rate')
        .eq('id', agreement.business_id)
        .single();

      const invoiceNumber = await generateInvoiceNumber(agreement.business_id);

      const dueDate = new Date(agreement.next_service_date);
      dueDate.setDate(dueDate.getDate() + (business?.invoice_due_days || 30));

      const subtotal = agreement.price_per_service || 0;
      const taxRate = business?.default_tax_rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          business_id: agreement.business_id,
          customer_id: agreement.customer_id,
          service_agreement_id: agreement.id,
          invoice_number: invoiceNumber,
          invoice_date: agreement.next_service_date,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'draft',
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          amount_due: total,
          notes: `Recurring service: ${agreement.name}`,
          access_token: generateAccessToken(),
          is_recurring: true,
        })
        .select('id')
        .single();

      if (invoiceError) {
        throw new Error(invoiceError.message);
      }

      // Add line item
      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: agreement.name + (agreement.description ? ` - ${agreement.description}` : ''),
        quantity: 1,
        unit_price: subtotal,
        is_taxable: true,
      });

      // Update next service date
      const nextDate = calculateNextDate(
        new Date(agreement.next_service_date),
        agreement.frequency
      );

      await supabase
        .from('service_agreements')
        .update({
          next_service_date: nextDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', agreement.id);

      result.generated++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Agreement ${agreement.name}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Create a recurring invoice schedule from a service agreement
 */
export async function createRecurringSchedule(agreementId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: agreement, error } = await supabase
    .from('service_agreements')
    .select('*')
    .eq('id', agreementId)
    .single();

  if (error || !agreement) {
    throw new Error('Service agreement not found');
  }

  // Set next service date if not set
  if (!agreement.next_service_date) {
    await supabase
      .from('service_agreements')
      .update({
        next_service_date: agreement.start_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreementId);
  }
}

/**
 * Get upcoming recurring invoices preview
 */
export async function getUpcomingRecurringInvoices(
  businessId: string,
  months: number = 3
): Promise<Array<{
  agreementId: string;
  agreementName: string;
  customerName: string;
  date: string;
  amount: number;
}>> {
  const supabase = createAdminClient();

  const { data: agreements } = await supabase
    .from('service_agreements')
    .select(`
      id,
      name,
      frequency,
      price_per_service,
      next_service_date,
      customer:customers (name)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active');

  const upcoming: Array<{
    agreementId: string;
    agreementName: string;
    customerName: string;
    date: string;
    amount: number;
  }> = [];

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  for (const agreement of agreements || []) {
    if (!agreement.next_service_date) continue;

    let currentDate = new Date(agreement.next_service_date);

    while (currentDate <= endDate) {
      upcoming.push({
        agreementId: agreement.id,
        agreementName: agreement.name,
        customerName: (agreement.customer as any)?.name || 'Unknown',
        date: currentDate.toISOString().split('T')[0],
        amount: agreement.price_per_service || 0,
      });

      currentDate = calculateNextDate(currentDate, agreement.frequency);
    }
  }

  // Sort by date
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return upcoming;
}
