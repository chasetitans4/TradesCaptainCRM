import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMembershipPlan,
  getMembershipPlans,
  updateMembershipPlan,
  deleteMembershipPlan,
  getPlanStatistics,
} from '@/lib/memberships/plans';

// GET /api/memberships/plans - Get all plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const statistics = await getPlanStatistics(userData.business_id);
      return NextResponse.json({ stats: statistics });
    }

    const plans = await getMembershipPlans(userData.business_id, includeInactive);
    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Error fetching membership plans:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/memberships/plans - Create or manage plans
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, planId, ...data } = body;

    let result;

    switch (action) {
      case 'create':
        result = await createMembershipPlan(userData.business_id, data);
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
        result = await createMembershipPlan(userData.business_id, body);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error with membership plan action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
