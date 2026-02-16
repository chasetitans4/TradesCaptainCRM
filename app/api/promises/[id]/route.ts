// =====================================================
// PROMISE KEEPER - INDIVIDUAL PROMISE API
// GET /api/promises/[id] - Get a promise
// PATCH /api/promises/[id] - Update a promise
// DELETE /api/promises/[id] - Delete a promise
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('follow_up_reminders')
      .select(`
        *,
        customer:customers(id, name, phone, email),
        job:jobs(id, title, status, scheduled_start)
      `)
      .eq('id', id)
      .eq('organization_id', profile.business_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Promise not found' }, { status: 404 });
      }
      console.error('Error fetching promise:', error);
      return NextResponse.json(
        { error: 'Failed to fetch promise' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/promises/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      description,
      dueDate,
      dueTime,
      completionNote,
      snoozedUntil,
    } = body;

    const supabase = await createClient();

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updates.status = status;

      // If completing, set completion fields
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = profile.id;
        if (completionNote) {
          updates.completion_note = completionNote;
        }
      }

      // If snoozing, set snooze date
      if (status === 'snoozed' && snoozedUntil) {
        updates.snoozed_until = snoozedUntil;
      }
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (dueDate !== undefined) {
      updates.due_date = dueDate;
    }

    if (dueTime !== undefined) {
      updates.due_time = dueTime;
    }

    const { data, error } = await supabase
      .from('follow_up_reminders')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', profile.business_id)
      .select(`
        *,
        customer:customers(id, name, phone),
        job:jobs(id, title, status)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Promise not found' }, { status: 404 });
      }
      console.error('Error updating promise:', error);
      return NextResponse.json(
        { error: 'Failed to update promise' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/promises/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('follow_up_reminders')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.business_id)
      .eq('created_by', profile.id); // Only creator can delete

    if (error) {
      console.error('Error deleting promise:', error);
      return NextResponse.json(
        { error: 'Failed to delete promise' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/promises/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
