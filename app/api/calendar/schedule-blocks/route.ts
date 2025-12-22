// =====================================================
// SCHEDULE BLOCKS MANAGEMENT (Breaks, Lunch, etc.)
// GET/POST /api/calendar/schedule-blocks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import type { CreateScheduleBlockInput } from '@/types';

// GET - Fetch schedule blocks
export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get all blocks for this business (user-specific and business-wide)
    const { data: blocks, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('business_id', profile.business_id)
      .or(`user_id.eq.${profile.id},user_id.is.null`)
      .order('start_time');

    if (error) {
      console.error('Error fetching schedule blocks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schedule blocks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ blocks: blocks || [] });
  } catch (error) {
    console.error('Error fetching schedule blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule blocks' },
      { status: 500 }
    );
  }
}

// POST - Create a new schedule block
export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateScheduleBlockInput & { scope?: 'business' | 'user' } =
      await request.json();

    // Validate input
    if (!body.label || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: label, start_time, end_time' },
        { status: 400 }
      );
    }

    if (body.day_of_week === undefined && !body.specific_date) {
      return NextResponse.json(
        { error: 'Must provide either day_of_week or specific_date' },
        { status: 400 }
      );
    }

    // Business-wide blocks require owner/admin role
    const scope = body.scope || 'user';
    if (scope === 'business' && !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can create business-wide blocks' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const record = {
      business_id: profile.business_id,
      user_id: scope === 'user' ? profile.id : null,
      day_of_week: body.day_of_week ?? null,
      specific_date: body.specific_date ?? null,
      start_time: body.start_time,
      end_time: body.end_time,
      label: body.label,
      is_recurring: body.is_recurring ?? (body.day_of_week !== undefined),
    };

    const { data, error } = await supabase
      .from('schedule_blocks')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule block:', error);
      return NextResponse.json(
        { error: 'Failed to create schedule block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ block: data });
  } catch (error) {
    console.error('Error creating schedule block:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule block' },
      { status: 500 }
    );
  }
}
