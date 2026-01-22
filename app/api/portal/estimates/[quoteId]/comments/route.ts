import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getEstimateComments, addEstimateComment, markCommentsAsRead } from '@/lib/portal/estimates';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/estimates/[quoteId]/comments - Get estimate comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await params;

    const comments = await getEstimateComments(
      quoteId,
      session.customerId,
      session.businessId
    );

    // Mark business comments as read
    await markCommentsAsRead(quoteId, session.customerId, session.businessId);

    return NextResponse.json({ comments });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal estimate comments GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/portal/estimates/[quoteId]/comments - Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length < 2) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const result = await addEstimateComment(
      quoteId,
      session.customerId,
      session.businessId,
      content.trim()
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'estimate_comment_added',
      details: { quoteId },
      request,
    });

    return NextResponse.json({
      success: true,
      commentId: result.commentId,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal estimate comment POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
