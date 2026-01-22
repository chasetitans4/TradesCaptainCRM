
// =====================================================
// PORTAL FEEDBACK API
// POST /api/portal/feedback - Submit new feedback
// GET /api/portal/feedback - Get customer's past feedback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { checkSimpleRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 feedback submissions per hour per customer
    const rateLimit = await checkSimpleRateLimit(
      `portal_feedback:${session.customerId}`,
      5,
      3600
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many feedback submissions. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 3600).toString(),
          },
        }
      );
    }

    const { rating, comment, wouldRecommend, jobId } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating (1-5 required)' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('customer_feedback')
      .insert({
        business_id: session.businessId,
        customer_id: session.customerId,
        job_id: jobId || null,
        rating,
        comment,
        would_recommend: wouldRecommend,
        source: 'portal',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ feedback: data });

  } catch (error) {
    apiLogger.error({
      msg: 'Portal feedback POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('customer_feedback')
      .select('*, jobs(title, job_number)')
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ feedback: data });

  } catch (error) {
    apiLogger.error({
      msg: 'Portal feedback GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
