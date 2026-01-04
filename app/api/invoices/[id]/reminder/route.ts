// =====================================================
// SINGLE INVOICE REMINDER API
// POST /api/invoices/[id]/reminder - Send a payment reminder for a specific invoice
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { sendPaymentReminder } from '@/lib/invoices';
import { isEmailConfigured } from '@/lib/email';
import { apiLogger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email is not configured' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Verify invoice belongs to user's business
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, amount_due')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Cannot send reminder for paid or voided invoices
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot send reminder for voided invoice' },
        { status: 400 }
      );
    }

    if (invoice.amount_due <= 0) {
      return NextResponse.json(
        { error: 'Invoice has no outstanding balance' },
        { status: 400 }
      );
    }

    try {
      await sendPaymentReminder(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      apiLogger.error({ message: 'Error sending reminder', error });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to send reminder' },
        { status: 500 }
      );
    }
  } catch (error) {
    apiLogger.error({ message: 'Error in reminder API', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
