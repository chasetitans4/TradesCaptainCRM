// =====================================================
// BOOKING INFO API
// GET /api/booking/info - Get business info for public booking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get business info
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, phone, email, logo_url, primary_color')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if booking is enabled
    const { data: settings } = await supabase
      .from('booking_settings')
      .select('enabled, service_types')
      .eq('business_id', businessId)
      .single();

    if (!settings?.enabled) {
      return NextResponse.json(
        { error: 'Online booking is not available' },
        { status: 400 }
      );
    }

    // Get service types
    const { data: serviceTypes } = await supabase
      .from('service_types')
      .select('id, name, description, default_duration')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order');

    return NextResponse.json({
      business,
      serviceTypes: serviceTypes || [],
    });
  } catch (error: any) {
    logApiError('GET', '/api/booking/info', error);
    return NextResponse.json(
      { error: 'Failed to load booking info' },
      { status: 500 }
    );
  }
}
