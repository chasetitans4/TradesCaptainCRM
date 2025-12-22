import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { submitServiceRequest, getCustomerEquipment } from '@/lib/portal/data';

// GET /api/portal/service-request - Get data for service request form
export async function GET() {
  try {
    const session = await requirePortalSession();

    // Get customer's equipment for service request form
    const equipment = await getCustomerEquipment(session.customerId);

    return NextResponse.json({
      equipment,
      serviceTypes: [
        'Repair',
        'Maintenance',
        'Installation',
        'Inspection',
        'Emergency Service',
        'Other',
      ],
      urgencyLevels: [
        { value: 'normal', label: 'Normal', description: 'Schedule at your convenience' },
        { value: 'urgent', label: 'Urgent', description: 'Need service within 24-48 hours' },
        { value: 'emergency', label: 'Emergency', description: 'Need immediate assistance' },
      ],
    });
  } catch (error: any) {
    if (error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Portal service request GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/portal/service-request - Submit service request
export async function POST(request: NextRequest) {
  try {
    const session = await requirePortalSession();

    const body = await request.json();
    const {
      serviceType,
      description,
      urgency,
      preferredDate,
      preferredTimeSlot,
      flexibleScheduling,
      equipmentId,
      notes,
    } = body;

    // Validate required fields
    if (!serviceType || !description) {
      return NextResponse.json(
        { error: 'Service type and description are required' },
        { status: 400 }
      );
    }

    const result = await submitServiceRequest(
      session.customerId,
      session.businessId,
      {
        serviceType,
        description,
        urgency: urgency || 'normal',
        preferredDate,
        preferredTimeSlot,
        flexibleScheduling: flexibleScheduling !== false,
        equipmentId,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      requestId: result.id,
    });
  } catch (error: any) {
    if (error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Portal service request POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
