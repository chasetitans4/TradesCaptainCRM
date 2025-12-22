// =====================================================
// CLOCK OUT API
// POST /api/timesheets/clock-out - Clock out for the day
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clockOut } from '@/lib/timesheets';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const entry = await clockOut(profile.id, {
      breakMinutes: body.break_minutes,
      notes: body.notes,
      latitude: body.location?.lat,
      longitude: body.location?.lng,
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('Error in POST /api/timesheets/clock-out:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clock out' },
      { status: 400 }
    );
  }
}
