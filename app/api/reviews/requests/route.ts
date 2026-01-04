// =====================================================
// REVIEW REQUESTS API
// GET /api/reviews/requests - List review requests
// POST /api/reviews/requests - Send a review request
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

    const { data: requests, error } = await supabase
      .from('review_requests')
      .select(`
        *,
        customer:customers(name, email)
      `)
      .eq('business_id', profile.business_id)
      .order('sent_at', { ascending: false });

    if (error) {
      apiLogger.error({ error, context: 'fetching review requests' });
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    apiLogger.error({ error, context: 'GET /api/reviews/requests' });
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

    const { data: reviewRequest, error } = await supabase
      .from('review_requests')
      .insert({
        business_id: profile.business_id,
        customer_id: body.customer_id,
        job_id: body.job_id || null,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
      .select()
      .single();

    if (error) {
      apiLogger.error({ error, context: 'creating review request' });
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    // TODO: Send actual email/SMS to customer

    return NextResponse.json({ request: reviewRequest }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'POST /api/reviews/requests' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
