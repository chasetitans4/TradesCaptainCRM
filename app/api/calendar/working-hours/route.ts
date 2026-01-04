// =====================================================
// WORKING HOURS MANAGEMENT
// GET/PUT /api/calendar/working-hours
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import type { UpdateWorkingHoursInput } from '@/types';
import { apiLogger } from '@/lib/logger';

// GET - Fetch working hours
export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get user-specific working hours first
    const { data: userHours } = await supabase
      .from('working_hours')
      .select('*')
      .eq('user_id', profile.id)
      .order('day_of_week');

    // If user has specific hours, return those
    if (userHours && userHours.length > 0) {
      return NextResponse.json({
        hours: userHours,
        source: 'user',
      });
    }

    // Otherwise, get business default hours
    const { data: businessHours } = await supabase
      .from('working_hours')
      .select('*')
      .eq('business_id', profile.business_id)
      .is('user_id', null)
      .order('day_of_week');

    if (businessHours && businessHours.length > 0) {
      return NextResponse.json({
        hours: businessHours,
        source: 'business',
      });
    }

    // Return default hours if nothing is configured
    const defaultHours = generateDefaultHours();
    return NextResponse.json({
      hours: defaultHours,
      source: 'default',
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching working hours' });
    return NextResponse.json(
      { error: 'Failed to fetch working hours' },
      { status: 500 }
    );
  }
}

// PUT - Update working hours
export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can update business hours
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can update working hours' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hours, scope = 'business' } = body as {
      hours: UpdateWorkingHoursInput[];
      scope?: 'business' | 'user';
    };

    if (!hours || !Array.isArray(hours)) {
      return NextResponse.json(
        { error: 'Invalid hours data' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Prepare records for upsert
    const records = hours.map((h) => ({
      business_id: profile.business_id,
      user_id: scope === 'user' ? profile.id : null,
      day_of_week: h.day_of_week,
      is_working_day: h.is_working_day,
      start_time: h.start_time,
      end_time: h.end_time,
    }));

    // Delete existing hours for this scope
    if (scope === 'user') {
      await supabase
        .from('working_hours')
        .delete()
        .eq('user_id', profile.id);
    } else {
      await supabase
        .from('working_hours')
        .delete()
        .eq('business_id', profile.business_id)
        .is('user_id', null);
    }

    // Insert new hours
    const { error: insertError } = await supabase
      .from('working_hours')
      .insert(records);

    if (insertError) {
      apiLogger.error({ error: insertError, context: 'Error updating working hours' });
      return NextResponse.json(
        { error: 'Failed to update working hours' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error updating working hours' });
    return NextResponse.json(
      { error: 'Failed to update working hours' },
      { status: 500 }
    );
  }
}

// Generate default working hours (Mon-Fri 8am-5pm)
function generateDefaultHours() {
  return [
    { day_of_week: 0, is_working_day: false, start_time: '08:00', end_time: '17:00' }, // Sunday
    { day_of_week: 1, is_working_day: true, start_time: '08:00', end_time: '17:00' },  // Monday
    { day_of_week: 2, is_working_day: true, start_time: '08:00', end_time: '17:00' },  // Tuesday
    { day_of_week: 3, is_working_day: true, start_time: '08:00', end_time: '17:00' },  // Wednesday
    { day_of_week: 4, is_working_day: true, start_time: '08:00', end_time: '17:00' },  // Thursday
    { day_of_week: 5, is_working_day: true, start_time: '08:00', end_time: '17:00' },  // Friday
    { day_of_week: 6, is_working_day: false, start_time: '08:00', end_time: '17:00' }, // Saturday
  ];
}
