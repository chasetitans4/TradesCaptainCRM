// =====================================================
// SINGLE FOLLOW-UP API
// GET /api/follow-ups/:id - Get a follow-up
// PATCH /api/follow-ups/:id - Update a follow-up
// DELETE /api/follow-ups/:id - Delete a follow-up
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    const { data: follow_up, error } = await supabase
      .from('follow_ups')
      .select(`
        *,
        assignee:users!follow_ups_assigned_to_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !follow_up) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    return NextResponse.json({ follow_up });
  } catch (error) {
    console.error('Error in GET /api/follow-ups/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const updateData: any = {};
    if (body.follow_up_type !== undefined) updateData.follow_up_type = body.follow_up_type;
    if (body.scheduled_date !== undefined) updateData.scheduled_date = body.scheduled_date;
    if (body.scheduled_time !== undefined) updateData.scheduled_time = body.scheduled_time;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;

    const { data: follow_up, error } = await supabase
      .from('follow_ups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating follow-up:', error);
      return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
    }

    return NextResponse.json({ follow_up });
  } catch (error) {
    console.error('Error in PATCH /api/follow-ups/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabase.from('follow_ups').delete().eq('id', id);

    if (error) {
      console.error('Error deleting follow-up:', error);
      return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/follow-ups/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
