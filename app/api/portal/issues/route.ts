import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createIssueReport, getCustomerIssueReports } from '@/lib/portal/issues';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/issues - Get customer's issue reports
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const issues = await getCustomerIssueReports(
      session.customerId,
      session.businessId,
      status,
      limit
    );

    return NextResponse.json({ issues });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issues GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

// POST /api/portal/issues - Create a new issue report
export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, urgency, equipmentId, locationNotes } = body;

    // Validate required fields
    if (!title || title.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please provide a title (at least 5 characters)' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a description (at least 10 characters)' },
        { status: 400 }
      );
    }

    const validUrgencies = ['low', 'medium', 'high', 'emergency'];
    if (urgency && !validUrgencies.includes(urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency level' },
        { status: 400 }
      );
    }

    const result = await createIssueReport(
      session.customerId,
      session.businessId,
      {
        title: title.trim(),
        description: description.trim(),
        urgency: urgency || 'medium',
        equipmentId,
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
      action: 'issue_reported',
      details: { issueId: result.issueId, urgency },
      request,
    });

    return NextResponse.json({
      success: true,
      issueId: result.issueId,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issues POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create issue report' }, { status: 500 });
  }
}
