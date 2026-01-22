// =====================================================
// CALLS API ROUTES
// GET /api/calls - List calls with filters
// POST /api/calls - Record a new call
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordCall, getCallLogs, getCallStats } from '@/lib/calls';
import type { CallDirection, CallOutcome } from '@/types';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let businessId = session.user.businessId;

    // If admin, allow overriding businessId
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) {
        businessId = queryBusinessId;
      }
    }

    if (!businessId && (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'User business not found' }, { status: 404 });
    }

    // If still no businessId (and is admin), we might need to return empty or error depending on logic
    // But for calls, we likely need a business context. 
    // If admin and no businessId provided, maybe return all calls? Or error?
    // Let's assume error for now if businessId is required for the queries.
    if (!businessId) {
        // Fallback for admins who didn't provide businessId - maybe return nothing or error
         return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

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
        businessId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      return NextResponse.json(callStats);
    }

    const result = await getCallLogs({
      businessId: businessId,
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
    apiLogger.error({ error, context: 'Error in GET /api/calls' });
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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let businessId = session.user.businessId;
    const body = await request.json();

    // If admin, allow overriding businessId from body
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      if (body.businessId) {
        businessId = body.businessId;
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const { phone, direction, duration_seconds, outcome, notes, customer_id, lead_id } = body;

    if (!phone || !direction) {
      return NextResponse.json(
        { error: 'Phone and direction are required' },
        { status: 400 }
      );
    }

    const call = await recordCall(businessId, {
      phone,
      direction,
      duration_seconds,
      outcome,
      notes,
      customer_id,
      lead_id,
      user_id: session.user.id, // Set current user as the call handler
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'Error in POST /api/calls' });
    return NextResponse.json(
      { error: 'Failed to record call' },
      { status: 500 }
    );
  }
}
