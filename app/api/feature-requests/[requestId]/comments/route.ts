// =====================================================
// FEATURE REQUEST COMMENTS API
// POST /api/feature-requests/[requestId]/comments - Add comment
// GET /api/feature-requests/[requestId]/comments - Get comments
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { addFeatureComment, getFeatureComments } from '@/lib/feature-requests';
import { checkPermission } from '@/lib/permissions/check-permission';
import { apiLogger } from '@/lib/logger';

// POST - Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await checkPermission('view_feature_requests');
    const { requestId } = await params;
    const body = await request.json();
    const { commenter_type, commenter_id, commenter_name, comment, is_official_response } = body;

    if (!commenter_type || !commenter_id || !commenter_name || !comment) {
      return NextResponse.json(
        { error: 'Commenter info and comment are required' },
        { status: 400 }
      );
    }

    const newComment = await addFeatureComment(requestId, {
      commenter_type,
      commenter_id,
      commenter_name,
      comment,
      is_official_response,
    });

    if (!newComment) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    apiLogger.error({ message: 'Error adding comment', error });
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// GET - Get all comments for a feature request
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await checkPermission('view_feature_requests');
    const { requestId } = await params;
    const comments = await getFeatureComments(requestId);

    return NextResponse.json({ comments });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching comments', error });
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
