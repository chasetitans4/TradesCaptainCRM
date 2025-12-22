// =====================================================
// REVIEW REQUESTS API
// GET /api/reviews - Get review requests
// POST /api/reviews - Create review request
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getReviewRequests, createReviewRequest, getReviewStats } from '@/lib/reviews';
import { isFeatureEnabled } from '@/lib/features';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if review requests feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'auto_review_requests');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Review requests feature is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'sent' | 'clicked' | 'reviewed' | 'skipped' | null;
    const includeStats = searchParams.get('stats') === 'true';

    const requests = await getReviewRequests(profile.business_id, {
      status: status || undefined,
    });

    const response: any = { requests };

    if (includeStats) {
      response.stats = await getReviewStats(profile.business_id);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching review requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch review requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if review requests feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'auto_review_requests');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Review requests feature is not enabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId, sendImmediately, sendMethod } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const reviewRequest = await createReviewRequest(jobId, {
      sendImmediately,
      sendMethod,
    });

    if (!reviewRequest) {
      return NextResponse.json(
        { error: 'Could not create review request. Check that the job exists and has a customer with contact info.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ request: reviewRequest });
  } catch (error: any) {
    console.error('Error creating review request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review request' },
      { status: 500 }
    );
  }
}
