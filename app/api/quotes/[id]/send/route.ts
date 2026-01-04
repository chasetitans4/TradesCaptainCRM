// =====================================================
// SEND QUOTE API
// POST /api/quotes/[id]/send - Send quote via SMS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { sendQuoteViaSms } from '@/lib/quotes';
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

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Verify quote belongs to user's business
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Only send draft or already sent quotes
    if (!['draft', 'sent'].includes(quote.status)) {
      return NextResponse.json(
        { error: 'Cannot send quote with current status' },
        { status: 400 }
      );
    }

    try {
      await sendQuoteViaSms(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      apiLogger.error({ error, context: 'sending quote' });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to send quote' },
        { status: 500 }
      );
    }
  } catch (error) {
    apiLogger.error({ error, context: 'send quote API' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
