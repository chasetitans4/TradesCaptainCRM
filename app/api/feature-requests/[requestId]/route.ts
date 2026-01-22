// =====================================================
// FEATURE REQUEST DETAIL API
// GET /api/feature-requests/[requestId] - Get single request
// PATCH /api/feature-requests/[requestId] - Update request (admin)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getFeatureRequest,
  updateFeatureRequest,
} from '@/lib/feature-requests';
import { checkPermission } from '@/lib/permissions/check-permission';
import { apiLogger } from '@/lib/logger';

// GET - Get single feature request
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await checkPermission('view_feature_requests');
    const { requestId } = await params;
    const featureRequest = await getFeatureRequest(requestId);

    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ feature_request: featureRequest });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching feature request', error });
    return NextResponse.json(
      { error: 'Failed to fetch feature request' },
      { status: 500 }
    );
  }
}

// PATCH - Update feature request (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await checkPermission('manage_feature_requests');
    const { requestId } = await params;
    const body = await request.json();
    const { status, priority, category, admin_notes, estimated_timeline, assigned_to, reviewed_by } = body;

    const updated = await updateFeatureRequest(
      requestId,
      { status, priority, category, admin_notes, estimated_timeline, assigned_to },
      reviewed_by
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ feature_request: updated });
  } catch (error) {
    apiLogger.error({ message: 'Error updating feature request', error });
    return NextResponse.json(
      { error: 'Failed to update feature request' },
      { status: 500 }
    );
  }
}
