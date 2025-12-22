// =====================================================
// DRIVE TIME SETTINGS
// GET/PUT /api/calendar/drive-time
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

// GET - Fetch drive time settings
export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: business } = await supabase
      .from('businesses')
      .select('drive_time_enabled, drive_time_default_minutes')
      .eq('id', profile.business_id)
      .single();

    return NextResponse.json({
      enabled: business?.drive_time_enabled ?? true,
      default_minutes: business?.drive_time_default_minutes ?? 30,
    });
  } catch (error) {
    console.error('Error fetching drive time settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drive time settings' },
      { status: 500 }
    );
  }
}

// PUT - Update drive time settings
export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can update
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can update drive time settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enabled, default_minutes } = body;

    const supabase = await createServerSupabaseClient();

    const updates: Record<string, any> = {};
    if (typeof enabled === 'boolean') {
      updates.drive_time_enabled = enabled;
    }
    if (typeof default_minutes === 'number' && default_minutes >= 0) {
      updates.drive_time_default_minutes = default_minutes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', profile.business_id);

    if (error) {
      console.error('Error updating drive time settings:', error);
      return NextResponse.json(
        { error: 'Failed to update drive time settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error('Error updating drive time settings:', error);
    return NextResponse.json(
      { error: 'Failed to update drive time settings' },
      { status: 500 }
    );
  }
}
