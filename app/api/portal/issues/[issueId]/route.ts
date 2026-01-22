import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import {
  getIssueReportDetails,
  updateIssueReport,
  cancelIssueReport,
} from '@/lib/portal/issues';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/issues/[issueId] - Get issue report details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;

    const issue = await getIssueReportDetails(
      issueId,
      session.customerId,
      session.businessId
    );

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue details GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 });
  }
}

// PUT /api/portal/issues/[issueId] - Update issue report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;
    const body = await request.json();
    const { description, locationNotes } = body;

    const result = await updateIssueReport(
      issueId,
      session.customerId,
      session.businessId,
      {
        description: description?.trim(),
        locationNotes: locationNotes?.trim(),
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'issue_updated',
      details: { issueId },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue update PUT error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}

// DELETE /api/portal/issues/[issueId] - Cancel issue report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;

    const result = await cancelIssueReport(
      issueId,
      session.customerId,
      session.businessId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'issue_cancelled',
      details: { issueId },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue cancel DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to cancel issue' }, { status: 500 });
  }
}
