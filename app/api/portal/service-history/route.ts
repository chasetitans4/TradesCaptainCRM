import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getCustomerServiceHistory, submitJobFeedback } from '@/lib/portal/equipment';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/service-history - Get customer's full service history
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const serviceHistory = await getCustomerServiceHistory(
      session.customerId,
      session.businessId,
      limit
    );

    return NextResponse.json({ serviceHistory });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal service history GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch service history' }, { status: 500 });
  }
}

// POST /api/portal/service-history - Submit feedback for a completed job
export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, rating, feedback } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const result = await submitJobFeedback(
      jobId,
      session.customerId,
      session.businessId,
      rating,
      feedback
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'job_feedback_submitted',
      details: { jobId, rating },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal service history POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
