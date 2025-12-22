import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createBookingRequest,
  getBookingRequests,
  BookingRequestInput,
} from '@/lib/booking/requests';
import { getBookingSettingsBySlug } from '@/lib/booking/settings';

// GET /api/booking/requests - Get booking requests (authenticated)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getBookingRequests(userData.business_id, {
      status,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching booking requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/booking/requests - Create booking request (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, slug, ...requestData } = body;

    let targetBusinessId = businessId;

    // Get business ID from slug if provided
    if (slug && !businessId) {
      const result = await getBookingSettingsBySlug(slug);
      if (!result) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      targetBusinessId = result.settings.businessId;
    }

    if (!targetBusinessId) {
      return NextResponse.json(
        { error: 'Business ID or slug is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const required = ['customerName', 'customerEmail', 'customerPhone', 'serviceType', 'preferredDate', 'address'];
    for (const field of required) {
      if (!requestData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const input: BookingRequestInput = {
      customerName: requestData.customerName,
      customerEmail: requestData.customerEmail,
      customerPhone: requestData.customerPhone,
      serviceType: requestData.serviceType,
      description: requestData.description,
      urgency: requestData.urgency,
      preferredDate: requestData.preferredDate,
      preferredTimeSlot: requestData.preferredTimeSlot,
      alternateDate: requestData.alternateDate,
      alternateTimeSlot: requestData.alternateTimeSlot,
      address: requestData.address,
      city: requestData.city,
      state: requestData.state,
      zip: requestData.zip,
      source: requestData.source || 'website',
      utmSource: requestData.utmSource,
      utmMedium: requestData.utmMedium,
      utmCampaign: requestData.utmCampaign,
    };

    const result = await createBookingRequest(targetBusinessId, input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
    });
  } catch (error: any) {
    console.error('Error creating booking request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
