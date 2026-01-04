// =====================================================
// PUSH NOTIFICATIONS API
// GET /api/notifications - Get user notifications
// POST /api/notifications - Send notification
// PATCH /api/notifications - Mark as read
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  sendPushNotification,
  getUnreadCount,
} from '@/lib/notifications/push';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = await getUnreadCount(profile.id);
      return NextResponse.json({ count });
    }

    const notifications = await getUserNotifications(profile.id, { unreadOnly, limit, offset });

    return NextResponse.json(notifications);
  } catch (error) {
    apiLogger.error({ message: 'Error fetching notifications', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
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

    // Only admin/owner can send notifications
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, title, body: notificationBody, url, metadata } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: 'title and body are required' },
        { status: 400 }
      );
    }

    await sendPushNotification({
      businessId: profile.business_id,
      userId,
      title,
      body: notificationBody,
      url,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error sending notification', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllNotificationsRead(profile.id);
    } else if (notificationId) {
      await markNotificationRead(notificationId);
    } else {
      return NextResponse.json(
        { error: 'notificationId or markAll is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error marking notification read', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark notification read' },
      { status: 500 }
    );
  }
}
