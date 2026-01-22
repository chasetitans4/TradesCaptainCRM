// =====================================================
// PORTAL NOTIFICATIONS API
// GET /api/portal/notifications - Get customer notifications
// PATCH /api/portal/notifications - Mark notifications as read
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

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

    // Build query
    let query = supabase
      .from('portal_notifications')
      .select('*')
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      // Table might not exist yet, return empty
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
      });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('portal_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .eq('read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal notifications GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({
      notifications: [],
      unreadCount: 0,
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CR-002: Validate businessId query param if present, for consistency with GET
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    const supabase = createAdminClient();

    if (markAllRead) {
      // Mark all notifications as read
      await supabase
        .from('portal_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('customer_id', session.customerId)
        .eq('business_id', session.businessId)
        .eq('read', false);
    } else if (notificationIds?.length) {
      // Mark specific notifications as read
      await supabase
        .from('portal_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('customer_id', session.customerId)
        .in('id', notificationIds);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal notifications PATCH error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
