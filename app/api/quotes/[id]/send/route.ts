// =====================================================
// SEND QUOTE API
// POST /api/quotes/[id]/send - Send quote via SMS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { sendQuoteViaSms } from '@/lib/quotes';

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
    } catch (error: any) {
      console.error('Error sending quote:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send quote' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send quote API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
