// =====================================================
// SCHEDULE BLOCK MANAGEMENT (Single Block)
// PUT/DELETE /api/calendar/schedule-blocks/[id]
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import type { CreateScheduleBlockInput } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update a schedule block
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if the block exists and user has permission
    const { data: existing } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Schedule block not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canEdit =
      existing.user_id === profile.id ||
      (existing.user_id === null && ['owner', 'admin'].includes(profile.role));

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Not authorized to edit this block' },
        { status: 403 }
      );
    }

    const body: Partial<CreateScheduleBlockInput> = await request.json();

    const updates: Record<string, any> = {};
    if (body.day_of_week !== undefined) updates.day_of_week = body.day_of_week;
    if (body.specific_date !== undefined) updates.specific_date = body.specific_date;
    if (body.start_time) updates.start_time = body.start_time;
    if (body.end_time) updates.end_time = body.end_time;
    if (body.label) updates.label = body.label;
    if (body.is_recurring !== undefined) updates.is_recurring = body.is_recurring;

    const { data, error } = await supabase
      .from('schedule_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule block:', error);
      return NextResponse.json(
        { error: 'Failed to update schedule block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ block: data });
  } catch (error) {
    console.error('Error updating schedule block:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule block' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a schedule block
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if the block exists and user has permission
    const { data: existing } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Schedule block not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canDelete =
      existing.user_id === profile.id ||
      (existing.user_id === null && ['owner', 'admin'].includes(profile.role));

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Not authorized to delete this block' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('schedule_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule block:', error);
      return NextResponse.json(
        { error: 'Failed to delete schedule block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule block:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule block' },
      { status: 500 }
    );
  }
}
