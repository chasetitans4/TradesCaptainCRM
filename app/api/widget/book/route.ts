/**
 * Widget Booking API
 * POST /api/widget/book
 *
 * Creates a new booking from the embedded widget.
 * Creates customer if not exists, then creates job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkWidgetBookingRateLimit } from '@/lib/rate-limit';

// CORS headers for widget embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface BookingRequest {
  businessId: string;
  serviceId: string;
  datetime: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
  };
  attribution?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    referrer?: string | null;
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit per IP to prevent booking spam
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkWidgetBookingRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many booking requests. Please try again later.' },
        { status: 429, headers: { ...corsHeaders, 'Retry-After': (rateLimit.retryAfter || 3600).toString() } }
      );
    }

    const body: BookingRequest = await request.json();
    const { businessId, serviceId, datetime, customer, attribution } = body;

    // Validate required fields
    if (!businessId || !serviceId || !datetime || !customer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!customer.name || !customer.phone || !customer.email || !customer.address) {
      return NextResponse.json(
        { success: false, error: 'Missing customer information' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify service exists and belongs to business
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Find or create customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('email', customer.email.toLowerCase())
      .single();

    let customerId = existingCustomer?.id;

    if (!customerId) {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: customer.name,
          email: customer.email.toLowerCase(),
          phone: normalizePhone(customer.phone),
          address: customer.address,
          source: 'WIDGET',
          utm_source: attribution?.utm_source || null,
          utm_medium: attribution?.utm_medium || null,
          utm_campaign: attribution?.utm_campaign || null,
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('[Widget Book] Failed to create customer:', customerError);
        return NextResponse.json(
          { success: false, error: 'Failed to create customer' },
          { status: 500, headers: corsHeaders }
        );
      }

      customerId = newCustomer?.id;
    }

    // Calculate end time based on service duration
    const startTime = new Date(datetime);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60 * 1000);

    // Create job/booking
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: serviceId,
        service_type: service.name,
        status: 'SCHEDULED',
        source: 'WIDGET',
        scheduled_start: startTime.toISOString(),
        scheduled_end: endTime.toISOString(),
        notes: customer.notes || null,
        // Attribution for tracking
        metadata: {
          widget_booking: true,
          attribution: {
            utm_source: attribution?.utm_source,
            utm_medium: attribution?.utm_medium,
            utm_campaign: attribution?.utm_campaign,
            utm_content: attribution?.utm_content,
            utm_term: attribution?.utm_term,
            referrer: attribution?.referrer,
          },
        },
      })
      .select('id, scheduled_start')
      .single();

    if (jobError) {
      console.error('[Widget Book] Failed to create job:', jobError);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Log customer activity
    await supabase.from('customer_activity').insert({
      customer_id: customerId,
      business_id: businessId,
      activity_type: 'BOOKING_CREATED',
      description: `Booked ${service.name} via website widget`,
      metadata: {
        job_id: job?.id,
        source: 'WIDGET',
      },
    });

    console.log('[Widget Book] Booking created:', {
      bookingId: job?.id,
      businessId,
      customerId,
      serviceId,
    });

    return NextResponse.json(
      {
        success: true,
        bookingId: job?.id,
        scheduledTime: job?.scheduled_start,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Widget Book] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return as-is if already formatted or international
  if (phone.startsWith('+')) {
    return phone;
  }

  // Fallback - return with + prefix
  return `+${digits}`;
}
