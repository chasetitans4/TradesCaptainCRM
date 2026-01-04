// =====================================================
// REFERRAL PROGRAMS API
// GET /api/referrals/programs - List all referral programs
// POST /api/referrals/programs - Create a new referral program
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
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
      .select('business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: programs, error } = await supabase
      .from('referral_programs')
      .select('*')
      .eq('business_id', profile.business_id)
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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const { data: program, error } = await supabase
      .from('referral_programs')
      .insert({
        business_id: profile.business_id,
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
