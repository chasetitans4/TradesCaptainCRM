import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import {
  getEmergencySettings,
  createEmergencyRequest,
  getCustomerEmergencyRequests,
} from '@/lib/portal/emergency';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/emergency - Get emergency settings and past requests
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRequests = searchParams.get('include') === 'requests';

    const settings = await getEmergencySettings(session.businessId);

    const response: Record<string, any> = { settings };

    if (includeRequests) {
      response.requests = await getCustomerEmergencyRequests(
        session.customerId,
        session.businessId
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal emergency GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch emergency settings' }, { status: 500 });
  }
}

// POST /api/portal/emergency - Create emergency request
export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, urgencyLevel, equipmentId, contactPhone, preferredContact } = body;

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a description of the emergency (at least 10 characters)' },
        { status: 400 }
      );
    }

    const result = await createEmergencyRequest({
      customerId: session.customerId,
      businessId: session.businessId,
      issueDescription: description.trim(),
      requestType: urgencyLevel || 'urgent',
      equipmentId,
      contactPhone: contactPhone || session.email, // Fallback to email if no phone
      contactMethod: preferredContact,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'emergency_request_created',
      details: { requestId: result.requestId, urgencyLevel },
      request,
    });

    apiLogger.info({
      msg: 'Emergency request created via portal',
      requestId: result.requestId,
      customerId: session.customerId,
    });

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      message: 'Your emergency request has been submitted. We will contact you shortly.',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal emergency POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to submit emergency request' }, { status: 500 });
  }
}
