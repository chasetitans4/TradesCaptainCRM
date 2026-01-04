// =====================================================
// SUBMIT TIMESHEET API
// POST /api/timesheets/:id/submit - Submit for approval
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitTimesheet } from '@/lib/timesheets';
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
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify entry belongs to this user
    const { data: entry } = await supabase
      .from('timesheets')
      .select('user_id, status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (!entry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    if (entry.user_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only submit your own time entries' },
        { status: 403 }
      );
    }

    if (entry.status === 'approved') {
      return NextResponse.json(
        { error: 'Entry is already approved' },
        { status: 400 }
      );
    }

    if (entry.status === 'submitted') {
      return NextResponse.json(
        { error: 'Entry is already submitted for approval' },
        { status: 400 }
      );
    }

    const updatedEntry = await submitTimesheet(id);

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/[id]/submit' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit time entry' },
      { status: 400 }
    );
  }
}
