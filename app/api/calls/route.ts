// =====================================================
// CALLS API ROUTES
// GET /api/calls - List calls with filters
// POST /api/calls - Record a new call
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordCall, getCallLogs, getCallStats } from '@/lib/calls';
import type { CallDirection, CallOutcome } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction') as CallDirection | null;
    const outcome = searchParams.get('outcome') as CallOutcome | null;
    const userId = searchParams.get('user_id');
    const customerId = searchParams.get('customer_id');
    const leadId = searchParams.get('lead_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const stats = searchParams.get('stats');

    // If stats requested, return call statistics
    if (stats === 'true') {
      const callStats = await getCallStats(
        profile.business_id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      return NextResponse.json(callStats);
    }

    const result = await getCallLogs({
      businessId: profile.business_id,
      direction: direction || undefined,
      outcome: outcome || undefined,
      userId: userId || undefined,
      customerId: customerId || undefined,
      leadId: leadId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const { phone, direction, duration_seconds, outcome, notes, customer_id, lead_id } = body;

    if (!phone || !direction) {
      return NextResponse.json(
        { error: 'Phone and direction are required' },
        { status: 400 }
      );
    }

    const call = await recordCall(profile.business_id, {
      phone,
      direction,
      duration_seconds,
      outcome,
      notes,
      customer_id,
      lead_id,
      user_id: profile.id, // Set current user as the call handler
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/calls:', error);
    return NextResponse.json(
      { error: 'Failed to record call' },
      { status: 500 }
    );
  }
}
