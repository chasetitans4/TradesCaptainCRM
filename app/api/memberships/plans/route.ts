import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMembershipPlan,
  getMembershipPlans,
  updateMembershipPlan,
  deleteMembershipPlan,
  getPlanStatistics,
} from '@/lib/memberships/plans';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

// GET /api/memberships/plans - Get all plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let businessId = session.user.businessId;

    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
      if (session.user.role === 'admin' || session.user.role === 'super_admin') {
         return NextResponse.json({ plans: [] });
      }
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const includeInactive = searchParams.get('includeInactive') === 'true';
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const statistics = await getPlanStatistics(businessId);
      return NextResponse.json({ stats: statistics });
    }

    const plans = await getMembershipPlans(businessId, includeInactive);
    return NextResponse.json({ plans });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching membership plans', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch membership plans' }, { status: 500 });
  }
}

// POST /api/memberships/plans - Create or manage plans
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, planId, ...data } = body;

    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      if (data.businessId) businessId = data.businessId;
    }

    if (!businessId) {
        return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create':
        result = await createMembershipPlan(businessId, data);
        break;

      case 'update':
        if (!planId) {
          return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
        }
        result = await updateMembershipPlan(planId, data);
        break;

      case 'delete':
        if (!planId) {
          return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
        }
        result = await deleteMembershipPlan(planId);
        break;

      default:
        // Default to create if no action specified
        result = await createMembershipPlan(businessId, body);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ message: 'Error with membership plan action', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process membership plan action' }, { status: 500 });
  }
}
