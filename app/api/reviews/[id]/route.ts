// =====================================================
// SINGLE REVIEW REQUEST API
// PUT /api/reviews/[id] - Update review request (send, skip, etc.)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createClient } from '@/lib/supabase/server';
import {
  sendReviewRequest,
  skipReviewRequest,
  trackReviewClick,
  markReviewCompleted,
} from '@/lib/reviews';
import { isFeatureEnabled } from '@/lib/features';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const supabase = await createClient();

    // Verify request belongs to business
    const { data: reviewRequest } = await supabase
      .from('review_requests')
      .select('business_id, status')
      .eq('id', id)
      .single();

    if (!reviewRequest || reviewRequest.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Review request not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'send':
        const sent = await sendReviewRequest(id);
        if (!sent) {
          return NextResponse.json(
            { error: 'Failed to send review request' },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true, message: 'Review request sent' });

      case 'skip':
        await skipReviewRequest(id);
        return NextResponse.json({ success: true, message: 'Review request skipped' });

      case 'clicked':
        await trackReviewClick(id);
        return NextResponse.json({ success: true });

      case 'reviewed':
        await markReviewCompleted(id);
        return NextResponse.json({ success: true, message: 'Marked as reviewed' });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be send, skip, clicked, or reviewed' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error updating review request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update review request' },
      { status: 500 }
    );
  }
}
