// =====================================================
// REVIEW REQUESTS API
// GET /api/reviews/requests - List review requests
// POST /api/reviews/requests - Send a review request
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

    const { data: requests, error } = await supabase
      .from('review_requests')
      .select(`
        *,
        customer:customers(name, email)
      `)
      .eq('business_id', businessId)
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

    const { data: reviewRequest, error } = await supabase
      .from('review_requests')
      .insert({
        business_id: businessId,
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
