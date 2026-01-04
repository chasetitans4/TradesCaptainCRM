// =====================================================
// REJECT TIMESHEET API
// POST /api/timesheets/:id/reject - Reject a time entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rejectTimeEntry } from '@/lib/timesheets';
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

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can reject
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can reject time entries' },
        { status: 403 }
      );
    }

    // Verify entry belongs to this business
    const { data: entry } = await supabase
      .from('timesheets')
      .select('status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (!entry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    if (entry.status === 'rejected') {
      return NextResponse.json(
        { error: 'Entry is already rejected' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '';

    const updatedEntry = await rejectTimeEntry(id, reason);

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/[id]/reject' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject time entry' },
      { status: 400 }
    );
  }
}
