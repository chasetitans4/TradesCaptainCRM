// =====================================================
// SINGLE FOLLOW-UP API
// GET /api/follow-ups/:id - Get a follow-up
// PATCH /api/follow-ups/:id - Update a follow-up
// DELETE /api/follow-ups/:id - Delete a follow-up
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine correct Supabase client
    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
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

    // Check business access if not admin
    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
        if (follow_up.business_id && follow_up.business_id !== session.user.businessId) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    return NextResponse.json({ follow_up });
  } catch (error) {
    apiLogger.error({ message: 'Error in GET /api/follow-ups/:id', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine correct Supabase client
    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
    }

    // If not admin, verify ownership first (optional, but good for security if RLS is loose)
    // RLS usually handles this, but with createAdminClient we need manual checks if we wanted to restrict admins.
    // But admins should have access.

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
      apiLogger.error({ message: 'Error updating follow-up', error });
      return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
    }

    return NextResponse.json({ follow_up });
  } catch (error) {
    apiLogger.error({ message: 'Error in PATCH /api/follow-ups/:id', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine correct Supabase client
    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
    }

    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id);

    if (error) {
      apiLogger.error({ message: 'Error deleting follow-up', error });
      return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error in DELETE /api/follow-ups/:id', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
