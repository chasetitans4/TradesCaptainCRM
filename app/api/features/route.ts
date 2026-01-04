// =====================================================
// FEATURE SETTINGS API
// GET /api/features - Get feature settings
// PUT /api/features - Update feature settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getFeatureSettings, updateFeatureSettings, FeatureSettings } from '@/lib/features';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getFeatureSettings(profile.business_id);

    return NextResponse.json({ settings });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching feature settings', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch feature settings' },
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

    // Only owner and admin can update feature settings
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only owners and admins can update feature settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const settings: Partial<FeatureSettings> = body.settings;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings provided' },
        { status: 400 }
      );
    }

    await updateFeatureSettings(profile.business_id, settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error updating feature settings', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update feature settings' },
      { status: 500 }
    );
  }
}
