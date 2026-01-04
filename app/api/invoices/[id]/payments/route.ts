// =====================================================
// RECORD PAYMENT API
// POST /api/invoices/[id]/payments - Record a manual payment
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { recordManualPayment } from '@/lib/invoices';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, method, notes } = body;

    // Parse and validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!method || !['cash', 'check', 'other'].includes(method)) {
      return NextResponse.json({ error: 'Valid payment method is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify invoice belongs to user's business
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, amount_due, total')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Cannot record payment for voided invoices
    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot record payment for voided invoice' },
        { status: 400 }
      );
    }

    // Check if invoice has remaining balance
    if (invoice.amount_due <= 0) {
      return NextResponse.json(
        { error: 'Invoice is already paid in full' },
        { status: 400 }
      );
    }

    // Cap payment amount at amount due to prevent overpayments
    const validatedAmount = Math.min(numericAmount, invoice.amount_due);
    if (validatedAmount !== numericAmount) {
      apiLogger.warn({
        msg: 'Payment amount capped to amount due',
        invoiceId: id,
        requestedAmount: numericAmount,
        cappedAmount: validatedAmount,
        amountDue: invoice.amount_due,
      });
    }

    try {
      await recordManualPayment(id, validatedAmount, method, notes);
      return NextResponse.json({ success: true });
    } catch (error) {
      apiLogger.error({ message: 'Error recording payment', error });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to record payment' },
        { status: 500 }
      );
    }
  } catch (error) {
    apiLogger.error({ message: 'Error in record payment API', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
