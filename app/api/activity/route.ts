// =====================================================
// CUSTOMER ACTIVITY API
// GET /api/activity?customerId=xxx - Get customer timeline
// POST /api/activity - Log activity/add note
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getCustomerTimeline, addNote, logActivity, type ActivityType } from '@/lib/activity';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const activityType = searchParams.get('activityType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const activities = await getCustomerTimeline(customerId, {
      limit,
      offset,
      activityTypes: activityType ? [activityType as ActivityType] : undefined,
    });

    return NextResponse.json(activities);
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching activities' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
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

    const body = await request.json();
    const { customerId, activityType, title, description, relatedEntityType, relatedEntityId, metadata, note } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // If it's a simple note
    if (note) {
      await addNote(profile.business_id, customerId, profile.id, note);
      return NextResponse.json({ success: true });
    }

    // Full activity log
    if (!activityType || !title) {
      return NextResponse.json(
        { error: 'activityType and title are required' },
        { status: 400 }
      );
    }

    await logActivity({
      businessId: profile.business_id,
      customerId,
      createdBy: profile.id,
      activityType,
      title,
      description,
      relatedEntityType,
      relatedEntityId,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error logging activity' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log activity' },
      { status: 500 }
    );
  }
}
