// =====================================================
// Leads Captain v2 Notifications API
// GET /api/leads-captain/v2/notifications - List notification recipients
// POST /api/leads-captain/v2/notifications - Create recipient
// PUT /api/leads-captain/v2/notifications/[id] - Update recipient
// DELETE /api/leads-captain/v2/notifications/[id] - Delete recipient
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/leads-captain/v2/features';
import { apiLogger } from '@/lib/logger';
import type { CreateNotificationRecipientRequest, UpdateNotificationRecipientRequest } from '@/types/leads-captain';

export async function GET() {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    const { data: recipients, error } = await supabase
      .from('leads_captain_notifications')
      .select('*')
      .eq('config_id', config.id)
      .order('recipient_role', { ascending: true })
      .order('recipient_name', { ascending: true });

    if (error) throw error;

    // Get limit info
    const limitInfo = await checkPlanLimit(profile.business_id, 'notification_recipients');

    return NextResponse.json({
      recipients: recipients || [],
      total: recipients?.length || 0,
      limits: limitInfo,
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching notification recipients',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body: CreateNotificationRecipientRequest = await request.json();

    if (!body.recipient_name) {
      return NextResponse.json({ error: 'Recipient name is required' }, { status: 400 });
    }

    if (!body.recipient_phone && !body.recipient_email) {
      return NextResponse.json(
        { error: 'At least one contact method (phone or email) is required' },
        { status: 400 }
      );
    }

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check plan limit
    const limitInfo = await checkPlanLimit(profile.business_id, 'notification_recipients');
    if (!limitInfo.allowed) {
      return NextResponse.json(
        {
          error: `Notification recipient limit reached (${limitInfo.max}). Upgrade your plan to add more.`,
          limit_info: limitInfo,
        },
        { status: 403 }
      );
    }

    // Build default triggers
    const defaultTriggers = {
      new_conversation: true,
      hot_lead: true,
      emergency: true,
      angry_customer: true,
      escalation: true,
      booking: true,
      every_message: false,
      ...body.triggers,
    };

    const { data: recipient, error } = await supabase
      .from('leads_captain_notifications')
      .insert({
        config_id: config.id,
        recipient_name: body.recipient_name,
        recipient_phone: body.recipient_phone || null,
        recipient_email: body.recipient_email || null,
        recipient_role: body.recipient_role || 'owner',
        notify_sms: body.notify_sms ?? true,
        notify_push: body.notify_push ?? true,
        notify_email: body.notify_email ?? false,
        triggers: defaultTriggers,
        quiet_hours_enabled: body.quiet_hours_enabled ?? true,
        quiet_hours_start: body.quiet_hours_start || '22:00',
        quiet_hours_end: body.quiet_hours_end || '07:00',
        quiet_hours_except_emergency: body.quiet_hours_except_emergency ?? true,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recipient }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      message: 'Error creating notification recipient',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create recipient' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, ...updateFields } = body as UpdateNotificationRecipientRequest & { id: string };

    if (!id) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if recipient exists and belongs to this business
    const { data: existing } = await supabase
      .from('leads_captain_notifications')
      .select('id')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'recipient_name', 'recipient_phone', 'recipient_email', 'recipient_role',
      'notify_sms', 'notify_push', 'notify_email', 'triggers',
      'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
      'quiet_hours_except_emergency', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updateFields[field as keyof typeof updateFields] !== undefined) {
        updateData[field] = updateFields[field as keyof typeof updateFields];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: recipient, error } = await supabase
      .from('leads_captain_notifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recipient });
  } catch (error) {
    apiLogger.error({
      message: 'Error updating notification recipient',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update recipient' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if recipient exists
    const { data: existing } = await supabase
      .from('leads_captain_notifications')
      .select('id')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Delete recipient
    const { error } = await supabase
      .from('leads_captain_notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      message: 'Error deleting notification recipient',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete recipient' },
      { status: 500 }
    );
  }
}
