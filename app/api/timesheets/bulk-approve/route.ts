// =====================================================
// BULK APPROVE TIMESHEETS API
// POST /api/timesheets/bulk-approve - Approve multiple time entries
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bulkApproveTimeEntries } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
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

    // Only admins/owners can bulk approve
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can approve time entries' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entry_ids } = body;

    if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
      return NextResponse.json(
        { error: 'entry_ids array is required' },
        { status: 400 }
      );
    }

    // Verify all entries belong to this business
    const { data: entries } = await supabase
      .from('timesheets')
      .select('id')
      .eq('business_id', profile.business_id)
      .in('id', entry_ids);

    if (!entries || entries.length !== entry_ids.length) {
      return NextResponse.json(
        { error: 'Some entries not found or do not belong to your business' },
        { status: 400 }
      );
    }

    const result = await bulkApproveTimeEntries(entry_ids, profile.id);

    return NextResponse.json({
      success: true,
      approved: result,
    });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/bulk-approve' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk approve time entries' },
      { status: 400 }
    );
  }
}
