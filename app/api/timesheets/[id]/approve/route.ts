// =====================================================
// APPROVE TIMESHEET API
// POST /api/timesheets/:id/approve - Approve a time entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { approveTimeEntry } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
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

    // Only admins/owners can approve
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can approve time entries' },
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

    if (entry.status === 'approved') {
      return NextResponse.json(
        { error: 'Entry is already approved' },
        { status: 400 }
      );
    }

    const updatedEntry = await approveTimeEntry(id, profile.id);

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/[id]/approve' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve time entry' },
      { status: 400 }
    );
  }
}
