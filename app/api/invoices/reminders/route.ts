// =====================================================
// PAYMENT REMINDERS API
// POST /api/invoices/reminders - Send payment reminders for overdue invoices
// This endpoint can be called by a cron job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPaymentReminder, updateOverdueInvoices } from '@/lib/invoices';
import { isEmailConfigured } from '@/lib/email';
import { apiLogger } from '@/lib/logger';

// Verify cron secret for automated calls
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return true; // No secret configured, allow all
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email is not configured', sent: 0 },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get request body for options
    const body = await request.json().catch(() => ({}));
    const {
      businessId,           // Optional: only process specific business
      daysBeforeDue = 3,    // Send reminder X days before due
      daysAfterDue = [1, 7, 14, 30], // Send reminder X days after due
      maxRemindersPerInvoice = 5,
    } = body;

    // First, update any invoices that should be marked as overdue
    let businessIds: string[] = [];
    if (businessId) {
      businessIds = [businessId];
      await updateOverdueInvoices(businessId);
    } else {
      // Get all active businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('status', 'active');

      businessIds = (businesses || []).map((b) => b.id);

      // Update overdue status for all businesses
      for (const bizId of businessIds) {
        await updateOverdueInvoices(bizId);
      }
    }

    // Find invoices that need reminders
    const today = new Date();
    const results: {
      sent: number;
      failed: number;
      skipped: number;
      errors: string[];
    } = { sent: 0, failed: 0, skipped: 0, errors: [] };

    for (const bizId of businessIds) {
      // Get invoices with outstanding balance
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          due_date,
          amount_due,
          customer:customers (email),
          reminders:invoice_reminders (sent_at)
        `)
        .eq('business_id', bizId)
        .in('status', ['sent', 'viewed', 'overdue', 'partial'])
        .gt('amount_due', 0);

      const { data: invoices, error } = await query;

      if (error) {
        results.errors.push(`Failed to fetch invoices for business ${bizId}: ${error.message}`);
        continue;
      }

      for (const invoice of invoices || []) {
        // Skip if customer has no email
        const customer = (invoice as any).customer;
        const customerEmail = Array.isArray(customer)
          ? customer[0]?.email
          : customer?.email;
        if (!customerEmail) {
          results.skipped++;
          continue;
        }

        // Check reminder count
        const reminderCount = invoice.reminders?.length || 0;
        if (reminderCount >= maxRemindersPerInvoice) {
          results.skipped++;
          continue;
        }

        // Calculate days until/since due date
        const dueDate = new Date(invoice.due_date);
        const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Determine if we should send a reminder
        let shouldSend = false;

        // Upcoming due date reminder
        if (daysDiff === daysBeforeDue) {
          shouldSend = true;
        }

        // Overdue reminders
        if (daysDiff < 0) {
          const daysOverdue = Math.abs(daysDiff);
          if (daysAfterDue.includes(daysOverdue)) {
            shouldSend = true;
          }
        }

        // Check if we already sent a reminder today
        if (shouldSend && invoice.reminders?.length > 0) {
          const todayStr = today.toISOString().split('T')[0];
          const sentToday = invoice.reminders.some((r: any) =>
            r.sent_at?.startsWith(todayStr)
          );
          if (sentToday) {
            shouldSend = false;
            results.skipped++;
          }
        }

        if (shouldSend) {
          try {
            await sendPaymentReminder(invoice.id);
            results.sent++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Invoice ${invoice.invoice_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error sending payment reminders', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

// GET endpoint to check reminder configuration
export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      configured: isEmailConfigured(),
      defaultSettings: {
        daysBeforeDue: 3,
        daysAfterDue: [1, 7, 14, 30],
        maxRemindersPerInvoice: 5,
      },
    });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to get reminder config' }, { status: 500 });
  }
}
