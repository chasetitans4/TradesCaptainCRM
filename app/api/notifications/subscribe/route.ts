// =====================================================
// PUSH SUBSCRIPTION API
// POST /api/notifications/subscribe - Subscribe to push
// DELETE /api/notifications/subscribe - Unsubscribe
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/notifications/push';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, deviceName } = body;

    if (!subscription) {
      return NextResponse.json(
        { error: 'subscription is required' },
        { status: 400 }
      );
    }

    await subscribeToPush(profile.id, profile.business_id, subscription, deviceName);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error subscribing to push:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to subscribe to push notifications' },
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

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpoint is required' },
        { status: 400 }
      );
    }

    await unsubscribeFromPush(profile.id, endpoint);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unsubscribing from push:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    );
  }
}
