// =====================================================
// CUSTOMER ACTIVITY API
// GET /api/activity?customerId=xxx - Get customer timeline
// POST /api/activity - Log activity/add note
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createAdminClient } from '@/lib/supabase/server';
import { getCustomerTimeline, addNote, logActivity, type ActivityType } from '@/lib/activity';
import { apiLogger } from '@/lib/logger';

// Valid activity types for validation
const VALID_ACTIVITY_TYPES = [
  'note', 'call', 'email', 'sms', 'appointment', 'quote', 'invoice',
  'payment', 'job', 'lead', 'status_change', 'system'
] as const;

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const activityType = searchParams.get('activityType');
    const limitParam = searchParams.get('limit') || '50';
    const offsetParam = searchParams.get('offset') || '0';

    // Validate and bound limit/offset parameters
    const limit = Math.min(Math.max(parseInt(limitParam) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam) || 0, 0);

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Validate activityType if provided
    if (activityType && !VALID_ACTIVITY_TYPES.includes(activityType as typeof VALID_ACTIVITY_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    // SECURITY: Verify customer belongs to the user's business
    const supabase = createAdminClient();
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', customerId)
      .eq('business_id', profile.business_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
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

    // SECURITY: Verify customer belongs to the user's business
    const supabase = createAdminClient();
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', customerId)
      .eq('business_id', profile.business_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Validate activityType if provided
    if (activityType && !VALID_ACTIVITY_TYPES.includes(activityType as typeof VALID_ACTIVITY_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
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
