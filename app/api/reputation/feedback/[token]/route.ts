import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestByToken,
  updateRequestStatus,
  submitFeedback,
  trackReviewClick,
} from '@/lib/reputation';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/reputation/feedback/[token]
 * Get feedback form data by access token (public endpoint)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const requestData = await getRequestByToken(token);

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if expired
    if (requestData.expires_at && new Date(requestData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Request has expired' }, { status: 410 });
    }

    // Check if opted out
    if (requestData.opt_out_at) {
      return NextResponse.json({ error: 'Request was opted out' }, { status: 410 });
    }

    // Mark as opened if not already
    if (!requestData.opened_at) {
      await updateRequestStatus(requestData.id, 'opened');
    }

    // Return public-safe data
    return NextResponse.json({
      id: requestData.id,
      status: requestData.status,
      customer: requestData.customer ? {
        name: requestData.customer.name?.split(' ')[0], // First name only
      } : null,
      job: requestData.job ? {
        service_type: requestData.job.service_type,
        completed_at: requestData.job.completed_at,
      } : null,
      proof_of_work: requestData.proof_of_work ? {
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/proof/${requestData.proof_of_work.public_token}`,
        short_url: `pow.tc/${requestData.proof_of_work.short_code}`,
      } : null,
      has_feedback: !!requestData.feedback,
      feedback_routing: requestData.feedback ? {
        category: requestData.feedback.sentiment_category,
        review_link_shown: requestData.feedback.review_link_shown,
        review_link_clicked: requestData.feedback.review_link_clicked,
      } : null,
    });
  } catch (error) {
    console.error('[Reputation Feedback] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/reputation/feedback/[token]
 * Submit feedback (public endpoint)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const requestData = await getRequestByToken(token);

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if expired
    if (requestData.expires_at && new Date(requestData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Request has expired' }, { status: 410 });
    }

    // Check if already has feedback
    if (requestData.feedback) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    const body = await request.json();
    const { sentiment_score, feedback_text, praise_areas, improvement_areas } = body;

    if (!sentiment_score || sentiment_score < 1 || sentiment_score > 5) {
      return NextResponse.json(
        { error: 'sentiment_score must be between 1 and 5' },
        { status: 400 }
      );
    }

    const result = await submitFeedback(requestData.id, {
      sentiment_score,
      feedback_text,
      praise_areas,
      improvement_areas,
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      routing: result.routing,
    });
  } catch (error) {
    console.error('[Reputation Feedback] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/reputation/feedback/[token]
 * Track review click (public endpoint)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const requestData = await getRequestByToken(token);

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (!requestData.feedback) {
      return NextResponse.json({ error: 'No feedback found' }, { status: 404 });
    }

    const body = await request.json();
    const { platform, url } = body;

    if (!platform || !url) {
      return NextResponse.json({ error: 'platform and url are required' }, { status: 400 });
    }

    const success = await trackReviewClick(requestData.feedback.id, platform, url);

    if (!success) {
      return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reputation Feedback] PATCH Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
