// =====================================================
// PORTAL LEAD CAPTAIN NOTIFICATION BY ID API
// PATCH /api/portal/lead-captain/notifications/[id] - Update recipient
// DELETE /api/portal/lead-captain/notifications/[id] - Delete recipient
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import type { UpdatePortalNotificationRequest } from '@/types/portal/lead-captain';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdatePortalNotificationRequest = await request.json();
    const supabase = createAdminClient();

    // Get config for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', session.businessId)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'Lead Captain not configured' },
        { status: 400 }
      );
    }

    // Verify the recipient belongs to this config
    const { data: existing } = await supabase
      .from('leads_captain_notifications')
      .select('id, config_id, triggers')
      .eq('id', id)
      .single();

    if (!existing || existing.config_id !== config.id) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.recipient_name !== undefined) updates.recipient_name = body.recipient_name;
    if (body.recipient_phone !== undefined) updates.recipient_phone = body.recipient_phone;
    if (body.recipient_email !== undefined) updates.recipient_email = body.recipient_email;
    if (body.recipient_role !== undefined) updates.recipient_role = body.recipient_role;
    if (body.notify_sms !== undefined) updates.notify_sms = body.notify_sms;
    if (body.notify_push !== undefined) updates.notify_push = body.notify_push;
    if (body.notify_email !== undefined) updates.notify_email = body.notify_email;
    if (body.triggers !== undefined) {
      updates.triggers = { ...existing.triggers, ...body.triggers };
    }
    if (body.quiet_hours_enabled !== undefined) updates.quiet_hours_enabled = body.quiet_hours_enabled;
    if (body.quiet_hours_start !== undefined) updates.quiet_hours_start = body.quiet_hours_start;
    if (body.quiet_hours_end !== undefined) updates.quiet_hours_end = body.quiet_hours_end;
    if (body.quiet_hours_except_emergency !== undefined) updates.quiet_hours_except_emergency = body.quiet_hours_except_emergency;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: recipient, error } = await supabase
      .from('leads_captain_notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal notification recipient updated',
      businessId: session.businessId,
      recipientId: id,
    });

    return NextResponse.json({ success: true, recipient });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain notification PATCH error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update notification recipient' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get config for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', session.businessId)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'Lead Captain not configured' },
        { status: 400 }
      );
    }

    // Verify the recipient belongs to this config
    const { data: existing } = await supabase
      .from('leads_captain_notifications')
      .select('id, config_id')
      .eq('id', id)
      .single();

    if (!existing || existing.config_id !== config.id) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Delete the recipient
    const { error } = await supabase
      .from('leads_captain_notifications')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal notification recipient deleted',
      businessId: session.businessId,
      recipientId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain notification DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to delete notification recipient' },
      { status: 500 }
    );
  }
}
