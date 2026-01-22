// =====================================================
// FEATURE REQUEST UPVOTE API
// POST /api/feature-requests/[requestId]/upvote - Toggle upvote
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { upvoteFeatureRequest } from '@/lib/feature-requests';
import { checkPermission } from '@/lib/permissions/check-permission';
import { apiLogger } from '@/lib/logger';

// POST - Toggle upvote on a feature request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await checkPermission('view_feature_requests');
    const { requestId } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await upvoteFeatureRequest(requestId, user_id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ upvotes: result.upvotes });
  } catch (error) {
    apiLogger.error({ message: 'Error upvoting feature request', error });
    return NextResponse.json(
      { error: 'Failed to upvote feature request' },
      { status: 500 }
    );
  }
}
