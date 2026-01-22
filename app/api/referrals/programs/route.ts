// =====================================================
// REFERRAL PROGRAMS API
// GET /api/referrals/programs - List all referral programs
// POST /api/referrals/programs - Create a new referral program
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const supabase = await createClient();

    const { data: programs, error } = await supabase
      .from('referral_programs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      apiLogger.error({ error, context: 'fetching referral programs' });
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    return NextResponse.json({ programs });
  } catch (error) {
    apiLogger.error({ error, context: 'GET /api/referrals/programs' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Determine business ID
    let businessId = session.user.businessId;
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && body.businessId) {
      businessId = body.businessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const supabase = await createClient();

    const { data: program, error } = await supabase
      .from('referral_programs')
      .insert({
        business_id: businessId,
        name: body.name,
        description: body.description || null,
        referrer_reward_type: body.referrer_reward_type,
        referrer_reward_amount: body.referrer_reward_amount,
        referee_reward_type: body.referee_reward_type,
        referee_reward_amount: body.referee_reward_amount,
        min_purchase_amount: body.min_purchase_amount || null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      apiLogger.error({ error, context: 'creating referral program' });
      return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
    }

    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'POST /api/referrals/programs' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
