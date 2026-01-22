import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { submitServiceRequest, getCustomerEquipmentSimple } from '@/lib/portal/data';
import { checkSimpleRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/portal/service-request - Get data for service request form
export async function GET() {
  try {
    const session = await requirePortalSession();

    // Get customer's equipment for service request form
    const equipment = await getCustomerEquipmentSimple(session.customerId);

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
  } catch (error) {
    if (error instanceof Error && error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    apiLogger.error({ error, context: 'Portal service request GET error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// POST /api/portal/service-request - Submit service request
export async function POST(request: NextRequest) {
  try {
    const session = await requirePortalSession();

    // Rate limit: 10 service requests per hour per customer
    const rateLimit = await checkSimpleRateLimit(
      `portal_service_request:${session.customerId}`,
      10,
      3600
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many service requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 3600).toString(),
          },
        }
      );
    }

    // Check Content-Type to handle both JSON (legacy) and FormData (with photos)
    const contentType = request.headers.get('content-type') || '';
    
    let serviceType, description, urgency, preferredDate, preferredTimeSlot, flexibleScheduling, equipmentId, notes;
    let photoFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      serviceType = formData.get('serviceType') as string;
      description = formData.get('description') as string;
      urgency = formData.get('urgency') as any;
      preferredDate = formData.get('preferredDate') as string;
      preferredTimeSlot = formData.get('preferredTimeSlot') as string;
      
      const flexVal = formData.get('flexibleScheduling');
      flexibleScheduling = flexVal === null ? undefined : flexVal === 'true';
      
      equipmentId = formData.get('equipmentId') as string;
      notes = formData.get('notes') as string;
      
      // Get all files with key 'photos'
      const files = formData.getAll('photos');
      photoFiles = files.filter(f => f instanceof File) as File[];
    } else {
      const body = await request.json();
      serviceType = body.serviceType;
      description = body.description;
      urgency = body.urgency;
      preferredDate = body.preferredDate;
      preferredTimeSlot = body.preferredTimeSlot;
      flexibleScheduling = body.flexibleScheduling;
      equipmentId = body.equipmentId;
      notes = body.notes;
    }

    // Validate required fields
    if (!serviceType || !description) {
      return NextResponse.json(
        { error: 'Service type and description are required' },
        { status: 400 }
      );
    }

    // Upload photos if any
    const photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      const supabase = createAdminClient();
      
      for (const file of photoFiles) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${session.businessId}/${session.customerId}/${timestamp}-${safeName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('portal-uploads')
          .upload(path, file, {
            contentType: file.type,
            upsert: false
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('portal-uploads')
            .getPublicUrl(path);
          
          photoUrls.push(publicUrl);
        } else {
            apiLogger.error({ error: uploadError, context: 'Portal photo upload failed' });
        }
      }
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
        photos: photoUrls,
      }
    );

    return NextResponse.json({
      success: true,
      requestId: result.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    apiLogger.error({ error, context: 'Portal service request POST error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
