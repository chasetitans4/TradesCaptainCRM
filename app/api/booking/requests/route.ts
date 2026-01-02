import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createBookingRequest,
  getBookingRequests,
  BookingRequestInput,
} from '@/lib/booking/requests';
import { getBookingSettingsBySlug } from '@/lib/booking/settings';
import { z } from 'zod';
import { schemas, validateRequest, formatZodErrors, sanitizeEmail, sanitizePhone } from '@/lib/validation';
import { logApiError } from '@/lib/logger';
import { formatPhoneE164 } from '@/lib/twilio/sms';

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
    const raw = {
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: Number(searchParams.get('limit') || '20'),
      offset: Number(searchParams.get('offset') || '0'),
    };

    const querySchema = z.object({
      status: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }).refine((data) => {
      if (data.startDate && isNaN(Date.parse(data.startDate))) return false;
      if (data.endDate && isNaN(Date.parse(data.endDate))) return false;
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    }, { message: 'Invalid date range' });

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const result = await getBookingRequests(userData.business_id, {
      status: parsed.data.status,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logApiError('GET', '/api/booking/requests', error);
    return NextResponse.json({ error: 'Failed to fetch booking requests' }, { status: 500 });
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

    const bookingSchema = z.object({
      customerName: z.string().min(1).max(200),
      customerEmail: schemas.email,
      customerPhone: z.string().min(10).max(20),
      serviceType: z.string().min(1).max(100),
      description: z.string().optional(),
      urgency: z.enum(['normal', 'urgent', 'emergency']).optional(),
      preferredDate: schemas.date,
      preferredTimeSlot: z.string().optional(),
      alternateDate: schemas.date.optional(),
      alternateTimeSlot: z.string().optional(),
      address: z.string().min(1).max(200),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      source: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    });

    const validation = validateRequest(bookingSchema, requestData);
    if (!validation.success) {
      return NextResponse.json({ error: formatZodErrors(validation.errors) }, { status: 400 });
    }

    const cleanEmail = sanitizeEmail(validation.data.customerEmail);
    const sanitizedPhone = sanitizePhone(validation.data.customerPhone);
    if (!cleanEmail || !sanitizedPhone) {
      return NextResponse.json({ error: 'Invalid email or phone' }, { status: 400 });
    }
    const cleanPhone = formatPhoneE164(sanitizedPhone);

    const input: BookingRequestInput = {
      customerName: validation.data.customerName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      serviceType: validation.data.serviceType,
      description: validation.data.description,
      urgency: validation.data.urgency,
      preferredDate: validation.data.preferredDate,
      preferredTimeSlot: validation.data.preferredTimeSlot,
      alternateDate: validation.data.alternateDate,
      alternateTimeSlot: validation.data.alternateTimeSlot,
      address: validation.data.address,
      city: validation.data.city,
      state: validation.data.state,
      zip: validation.data.zip,
      source: validation.data.source || 'website',
      utmSource: validation.data.utmSource,
      utmMedium: validation.data.utmMedium,
      utmCampaign: validation.data.utmCampaign,
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
    logApiError('POST', '/api/booking/requests', error);
    return NextResponse.json({ error: 'Failed to create booking request' }, { status: 500 });
  }
}
