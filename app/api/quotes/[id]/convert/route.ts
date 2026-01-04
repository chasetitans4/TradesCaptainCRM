// =====================================================
// CONVERT QUOTE API
// POST /api/quotes/[id]/convert - Convert quote to job or invoice
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { convertQuoteToJob, convertQuoteToInvoice } from '@/lib/quotes';
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
    const { create_job, create_invoice, scheduled_date, scheduled_time } = body;

    const supabase = await createServerSupabaseClient();

    // Verify quote belongs to user's business and is accepted
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Only accepted quotes can be converted' },
        { status: 400 }
      );
    }

    const result: { job_id?: string; invoice_id?: string } = {};

    if (create_job) {
      try {
        const jobId = await convertQuoteToJob(id, profile.id, scheduled_date, scheduled_time);
        result.job_id = jobId;
      } catch (error) {
        apiLogger.error({ error, context: 'converting to job' });
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to create job' },
          { status: 500 }
        );
      }
    }

    if (create_invoice) {
      try {
        const invoiceId = await convertQuoteToInvoice(id, profile.id);
        result.invoice_id = invoiceId;
      } catch (error) {
        apiLogger.error({ error, context: 'converting to invoice' });
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to create invoice' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error, context: 'convert quote API' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
