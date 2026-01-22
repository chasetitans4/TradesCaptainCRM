import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import {
  getEstimateDetails,
  approveEstimate,
  declineEstimate,
  requestEstimateChanges,
} from '@/lib/portal/estimates';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/estimates/[quoteId] - Get estimate details
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

    const estimate = await getEstimateDetails(
      quoteId,
      session.customerId,
      session.businessId
    );

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Log view activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'estimate_viewed',
      details: { quoteId },
      request,
    });

    return NextResponse.json({ estimate });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal estimate details GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 });
  }
}

// POST /api/portal/estimates/[quoteId] - Take action on estimate (approve, decline, request changes)
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
    const { action, approverName, approverEmail, signatureUrl, reason, notes } = body;

    let result;

    switch (action) {
      case 'approve':
        if (!approverName || !approverEmail) {
          return NextResponse.json(
            { error: 'Approver name and email are required' },
            { status: 400 }
          );
        }

        // Get IP address
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
          request.headers.get('x-real-ip') ||
          'unknown';

        result = await approveEstimate(
          quoteId,
          session.customerId,
          session.businessId,
          approverName,
          approverEmail,
          signatureUrl,
          ipAddress
        );

        if (result.success) {
          await logPortalActivity({
            customerId: session.customerId,
            businessId: session.businessId,
            action: 'estimate_approved',
            details: { quoteId, approverName },
            request,
          });
        }
        break;

      case 'decline':
        result = await declineEstimate(
          quoteId,
          session.customerId,
          session.businessId,
          reason
        );

        if (result.success) {
          await logPortalActivity({
            customerId: session.customerId,
            businessId: session.businessId,
            action: 'estimate_declined',
            details: { quoteId, reason },
            request,
          });
        }
        break;

      case 'request_changes':
        if (!notes || notes.trim().length < 10) {
          return NextResponse.json(
            { error: 'Please provide details about the requested changes (at least 10 characters)' },
            { status: 400 }
          );
        }

        result = await requestEstimateChanges(
          quoteId,
          session.customerId,
          session.businessId,
          notes.trim()
        );

        if (result.success) {
          await logPortalActivity({
            customerId: session.customerId,
            businessId: session.businessId,
            action: 'estimate_changes_requested',
            details: { quoteId },
            request,
          });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal estimate action POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to process estimate action' }, { status: 500 });
  }
}
