import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getEmergencyRequestStatus, cancelEmergencyRequest } from '@/lib/portal/emergency';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/emergency/[requestId] - Get emergency request status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;

    const emergencyRequest = await getEmergencyRequestStatus(
      requestId,
      session.customerId,
      session.businessId
    );

    if (!emergencyRequest) {
      return NextResponse.json({ error: 'Emergency request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: emergencyRequest });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal emergency request GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch emergency request' }, { status: 500 });
  }
}

// DELETE /api/portal/emergency/[requestId] - Cancel emergency request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;

    const result = await cancelEmergencyRequest(
      requestId,
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
      action: 'emergency_request_cancelled',
      details: { requestId },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal emergency request DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to cancel emergency request' }, { status: 500 });
  }
}
