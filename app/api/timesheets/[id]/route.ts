// =====================================================
// SINGLE TIME ENTRY API
// GET /api/timesheets/[id] - Get entry with details
// PUT /api/timesheets/[id] - Update entry
// DELETE /api/timesheets/[id] - Delete entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createClient } from '@/lib/supabase/server';
import { updateTimeEntry, deleteTimeEntry } from '@/lib/timesheets';
import { isFeatureEnabled } from '@/lib/features';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data: entry, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(id, first_name, last_name, email),
        job:jobs(id, service_type, customer:customers(name)),
        breaks:break_entries(*),
        job_time:job_time_entries(*, job:jobs(id, service_type))
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Technicians can only see their own entries
    if (profile.role === 'technician' && entry.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('Error fetching time entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch time entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Verify entry belongs to business and check permissions
    const { data: entry } = await supabase
      .from('time_entries')
      .select('user_id, business_id')
      .eq('id', id)
      .single();

    if (!entry || entry.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Technicians can only edit their own entries
    if (profile.role === 'technician' && entry.user_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only edit your own time entries' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clockIn, clockOut, breakMinutes, jobId, notes } = body;

    const updatedEntry = await updateTimeEntry(id, {
      clockIn: clockIn ? new Date(clockIn) : undefined,
      clockOut: clockOut ? new Date(clockOut) : undefined,
      breakMinutes,
      jobId,
      notes,
    });

    return NextResponse.json({ entry: updatedEntry });
  } catch (error: any) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update time entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if timesheets feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'timesheets_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Timesheets feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Verify entry belongs to business and check permissions
    const { data: entry } = await supabase
      .from('time_entries')
      .select('user_id, business_id')
      .eq('id', id)
      .single();

    if (!entry || entry.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Only admins/owners can delete entries
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can delete time entries' },
        { status: 403 }
      );
    }

    await deleteTimeEntry(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete time entry' },
      { status: 500 }
    );
  }
}
