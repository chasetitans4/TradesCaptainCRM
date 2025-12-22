// =====================================================
// REVIEW RESPONSE API
// POST /api/reviews/:id/respond - Add/update response
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        response_text: body.response_text,
        response_date: new Date().toISOString(),
        status: 'responded',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error saving response:', error);
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error in POST /api/reviews/:id/respond:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
