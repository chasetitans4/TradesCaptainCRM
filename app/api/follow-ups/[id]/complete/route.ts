// =====================================================
// FOLLOW-UP COMPLETE API
// POST /api/follow-ups/:id/complete - Mark follow-up as completed
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

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

    const { data: follow_up, error } = await supabase
      .from('follow_ups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        outcome: body.outcome || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      apiLogger.error({ message: 'Error completing follow-up', error });
      return NextResponse.json({ error: 'Failed to complete follow-up' }, { status: 500 });
    }

    return NextResponse.json({ follow_up });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/follow-ups/:id/complete', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
