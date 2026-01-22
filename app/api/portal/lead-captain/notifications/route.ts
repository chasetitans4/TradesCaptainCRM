// =====================================================
// PORTAL LEAD CAPTAIN NOTIFICATIONS API
// GET /api/portal/lead-captain/notifications - List recipients
// POST /api/portal/lead-captain/notifications - Create recipient
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { PLAN_FEATURE_LIMITS, PlanTier } from '@/types/leads-captain';
import type { CreatePortalNotificationRequest } from '@/types/portal/lead-captain';

// Default notification triggers
const DEFAULT_TRIGGERS = {
  new_conversation: false,
  hot_lead: true,
  emergency: true,
  angry_customer: true,
  escalation: true,
  booking: false,
  every_message: false,
};

export async function GET(request: NextRequest) {
  // SECURITY WARNING: This endpoint exposes business configuration to customers.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });

  /*
  try {
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

    // Get config_id for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', session.businessId)
      .single();

    if (!config) {
      return NextResponse.json({ recipients: [], total: 0 });
    }

    const { data: recipients, error } = await supabase
      .from('leads_captain_notifications')
      .select('*')
      .eq('config_id', config.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      recipients: recipients || [],
      total: recipients?.length || 0,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain notifications GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get notification recipients' },
      { status: 500 }
    );
  }
  */
}

export async function POST(request: NextRequest) {
  // SECURITY WARNING: This endpoint exposes business configuration to customers.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });

  /*
  try {
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

    const body: CreatePortalNotificationRequest = await request.json();
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

    // Check plan limits
    const { count } = await supabase
      .from('leads_captain_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('config_id', config.id);

    // Get business plan tier (default to silver if not found)
    const { data: business } = await supabase
      .from('businesses')
      .select('plan_tier')
      .eq('id', session.businessId)
      .single();

    const planTier = (business?.plan_tier || 'silver') as PlanTier;
    const limits = PLAN_FEATURE_LIMITS[planTier];

    if ((count || 0) >= limits.max_notification_recipients) {
      return NextResponse.json(
        {
          error: `Maximum of ${limits.max_notification_recipients} notification recipients allowed on your plan`,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.recipient_name) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      );
    }

    if (!body.recipient_phone && !body.recipient_email) {
      return NextResponse.json(
        { error: 'At least one contact method (phone or email) is required' },
        { status: 400 }
      );
    }

    // Create recipient
    const { data: recipient, error } = await supabase
      .from('leads_captain_notifications')
      .insert({
        config_id: config.id,
        recipient_name: body.recipient_name,
        recipient_phone: body.recipient_phone || null,
        recipient_email: body.recipient_email || null,
        recipient_role: body.recipient_role || 'owner',
        notify_sms: body.notify_sms ?? true,
        notify_push: body.notify_push ?? false,
        notify_email: body.notify_email ?? true,
        triggers: { ...DEFAULT_TRIGGERS, ...(body.triggers || {}) },
        quiet_hours_enabled: body.quiet_hours_enabled ?? false,
        quiet_hours_start: body.quiet_hours_start || '22:00',
        quiet_hours_end: body.quiet_hours_end || '08:00',
        quiet_hours_except_emergency: body.quiet_hours_except_emergency ?? true,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal notification recipient created',
      businessId: session.businessId,
      recipientId: recipient.id,
    });

    return NextResponse.json({ success: true, recipient });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain notifications POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to create notification recipient' },
      { status: 500 }
    );
  }
  */
}
