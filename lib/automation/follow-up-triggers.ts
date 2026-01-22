// =====================================================
// AUTOMATED FOLLOW-UP TRIGGERS
// Create reminders for stale quotes, leads, and jobs
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const followUpLogger = logger.child({ context: 'automation.follow-ups' });

interface FollowUpConfig {
  quoteDaysUntilFollowUp: number;
  leadDaysUntilFollowUp: number;
  invoiceDaysUntilFollowUp: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: FollowUpConfig = {
  quoteDaysUntilFollowUp: 3,
  leadDaysUntilFollowUp: 2,
  invoiceDaysUntilFollowUp: 7,
  enabled: true,
};

/**
 * Generate follow-up reminders for quotes that haven't been responded to
 */
export async function generateQuoteFollowUps(businessId: string, config?: Partial<FollowUpConfig>) {
  const settings = { ...DEFAULT_CONFIG, ...config };
  if (!settings.enabled) return { created: 0 };

  const supabase = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - settings.quoteDaysUntilFollowUp);

  try {
    // Find quotes that are sent but not accepted/declined and older than X days
    const { data: staleQuotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        customer_id,
        created_by,
        sent_at,
        customer:customers (id, name, phone)
      `)
      .eq('business_id', businessId)
      .eq('status', 'sent')
      .lt('sent_at', cutoffDate.toISOString())
      .is('viewed_at', null);

    if (quotesError) throw quotesError;

    let created = 0;

    for (const quote of staleQuotes || []) {
      // Check if a follow-up reminder already exists for this quote
      const { data: existingReminder } = await supabase
        .from('reminders')
        .select('id')
        .eq('related_type', 'quote')
        .eq('related_id', quote.id)
        .eq('is_completed', false)
        .single();

      if (existingReminder) continue;

      // Create follow-up reminder
      const reminderDate = new Date();
      reminderDate.setHours(9, 0, 0, 0); // Set to 9 AM

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert({
          business_id: businessId,
          user_id: quote.created_by,
          title: `Follow up on Quote #${quote.quote_number}`,
          description: `Quote sent to ${(quote.customer as any)?.name || 'customer'} hasn't been viewed. Consider calling to follow up.`,
          due_at: reminderDate.toISOString(),
          remind_at: reminderDate.toISOString(),
          priority: 'medium',
          related_type: 'quote',
          related_id: quote.id,
          customer_id: quote.customer_id,
          is_auto_generated: true,
          auto_trigger: 'quote_not_viewed',
        });

      if (!reminderError) {
        created++;
        followUpLogger.info({
          msg: 'Created quote follow-up reminder',
          quoteId: quote.id,
          quoteNumber: quote.quote_number,
          businessId,
        });
      }
    }

    return { created };
  } catch (error) {
    followUpLogger.error({
      msg: 'Error generating quote follow-ups',
      businessId,
      error: error instanceof Error ? { message: error.message } : { message: String(error) },
    });
    throw error;
  }
}

/**
 * Generate follow-up reminders for leads that haven't been contacted
 */
export async function generateLeadFollowUps(businessId: string, config?: Partial<FollowUpConfig>) {
  const settings = { ...DEFAULT_CONFIG, ...config };
  if (!settings.enabled) return { created: 0 };

  const supabase = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - settings.leadDaysUntilFollowUp);

  try {
    // Find new leads that haven't been contacted
    const { data: staleLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        customer_id,
        assigned_to,
        created_at,
        customer:customers (id, name, phone)
      `)
      .eq('business_id', businessId)
      .eq('status', 'new')
      .lt('created_at', cutoffDate.toISOString());

    if (leadsError) throw leadsError;

    let created = 0;

    for (const lead of staleLeads || []) {
      // Check if a follow-up reminder already exists
      const { data: existingReminder } = await supabase
        .from('reminders')
        .select('id')
        .eq('related_type', 'lead')
        .eq('related_id', lead.id)
        .eq('is_completed', false)
        .single();

      if (existingReminder) continue;

      // Create follow-up reminder
      const reminderDate = new Date();
      reminderDate.setHours(9, 0, 0, 0);

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert({
          business_id: businessId,
          user_id: lead.assigned_to,
          title: `Contact new lead: ${lead.name || (lead.customer as any)?.name || 'Unknown'}`,
          description: `This lead has been waiting ${settings.leadDaysUntilFollowUp}+ days without contact.`,
          due_at: reminderDate.toISOString(),
          remind_at: reminderDate.toISOString(),
          priority: 'high',
          related_type: 'lead',
          related_id: lead.id,
          customer_id: lead.customer_id,
          is_auto_generated: true,
          auto_trigger: 'lead_not_contacted',
        });

      if (!reminderError) {
        created++;
        followUpLogger.info({
          msg: 'Created lead follow-up reminder',
          leadId: lead.id,
          businessId,
        });
      }
    }

    return { created };
  } catch (error) {
    followUpLogger.error({
      msg: 'Error generating lead follow-ups',
      businessId,
      error: error instanceof Error ? { message: error.message } : { message: String(error) },
    });
    throw error;
  }
}

/**
 * Generate follow-up reminders for unpaid invoices
 */
export async function generateInvoiceFollowUps(businessId: string, config?: Partial<FollowUpConfig>) {
  const settings = { ...DEFAULT_CONFIG, ...config };
  if (!settings.enabled) return { created: 0 };

  const supabase = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - settings.invoiceDaysUntilFollowUp);

  try {
    // Find unpaid invoices that are overdue
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        customer_id,
        created_by,
        due_date,
        amount_due,
        customer:customers (id, name, phone)
      `)
      .eq('business_id', businessId)
      .in('status', ['sent', 'viewed', 'overdue'])
      .gt('amount_due', 0)
      .lt('due_date', cutoffDate.toISOString());

    if (invoicesError) throw invoicesError;

    let created = 0;

    for (const invoice of overdueInvoices || []) {
      // Check if a follow-up reminder already exists
      const { data: existingReminder } = await supabase
        .from('reminders')
        .select('id')
        .eq('related_type', 'invoice')
        .eq('related_id', invoice.id)
        .eq('is_completed', false)
        .single();

      if (existingReminder) continue;

      // Create follow-up reminder
      const reminderDate = new Date();
      reminderDate.setHours(10, 0, 0, 0);

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert({
          business_id: businessId,
          user_id: invoice.created_by,
          title: `Invoice #${invoice.invoice_number} is overdue`,
          description: `$${invoice.amount_due.toFixed(2)} from ${(invoice.customer as any)?.name || 'customer'} was due ${new Date(invoice.due_date).toLocaleDateString()}.`,
          due_at: reminderDate.toISOString(),
          remind_at: reminderDate.toISOString(),
          priority: 'high',
          related_type: 'invoice',
          related_id: invoice.id,
          customer_id: invoice.customer_id,
          is_auto_generated: true,
          auto_trigger: 'invoice_overdue',
        });

      if (!reminderError) {
        created++;
        followUpLogger.info({
          msg: 'Created invoice follow-up reminder',
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          businessId,
        });
      }
    }

    return { created };
  } catch (error) {
    followUpLogger.error({
      msg: 'Error generating invoice follow-ups',
      businessId,
      error: error instanceof Error ? { message: error.message } : { message: String(error) },
    });
    throw error;
  }
}

/**
 * Run all follow-up generators for a business
 */
export async function generateAllFollowUps(businessId: string, config?: Partial<FollowUpConfig>) {
  const results = await Promise.all([
    generateQuoteFollowUps(businessId, config),
    generateLeadFollowUps(businessId, config),
    generateInvoiceFollowUps(businessId, config),
  ]);

  return {
    quotes: results[0].created,
    leads: results[1].created,
    invoices: results[2].created,
    total: results.reduce((sum, r) => sum + r.created, 0),
  };
}
