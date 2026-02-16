import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rescheduleCall, completeCall, markNoShow } from '@/lib/outreach/scheduling';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outreach/calls/[id]
 * Get a specific call
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scheduled_calls')
      .select(`
        *,
        contact:outreach_contacts(*),
        agent:admin_users(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    apiLogger.error({ message: 'Error getting call', error });
    return NextResponse.json(
      { error: 'Failed to get call' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outreach/calls/[id]
 * Update a call (reschedule, complete, no-show)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'reschedule': {
        const result = await rescheduleCall(
          id,
          new Date(data.scheduled_at),
          data.agent_id
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          call: result.call,
        });
      }

      case 'complete': {
        const result = await completeCall(
          id,
          data.outcome,
          data.notes,
          data.plan_sold
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'no_show': {
        const result = await markNoShow(id);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'start': {
        const supabase = await createClient();
        await supabase
          .from('scheduled_calls')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', id);

        return NextResponse.json({ success: true });
      }

      case 'approve': {
        // Admin approves a pending call
        const supabase = await createClient();
        await supabase
          .from('scheduled_calls')
          .update({
            status: 'scheduled',
            agent_id: data.agent_id,
            admin_approved_by: data.approved_by,
            admin_approved_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('status', 'pending_admin_approval');

        // Update contact
        const { data: call } = await supabase
          .from('scheduled_calls')
          .select('contact_id')
          .eq('id', id)
          .single();

        if (call?.contact_id) {
          await supabase
            .from('outreach_contacts')
            .update({
              status: 'call_scheduled',
              overflow_to_admin: false,
              assigned_agent_id: data.agent_id,
              admin_assigned_by: data.approved_by,
              admin_assigned_at: new Date().toISOString(),
            })
            .eq('id', call.contact_id);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    apiLogger.error({ message: 'Error updating call', error });
    return NextResponse.json(
      { error: 'Failed to update call' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outreach/calls/[id]
 * Cancel a call
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('scheduled_calls')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error cancelling call', error });
    return NextResponse.json(
      { error: 'Failed to cancel call' },
      { status: 500 }
    );
  }
}
