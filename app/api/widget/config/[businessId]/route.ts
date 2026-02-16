/**
 * Widget Configuration API
 * GET /api/widget/config/[businessId]
 *
 * Returns public business configuration for the booking widget.
 * This endpoint is called by the embedded widget script.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// CORS headers for widget embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300', // 5 minute cache
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();

    // Fetch business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, timezone')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch active services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');

    // Fetch availability rules
    const { data: availability } = await supabase
      .from('availability_rules')
      .select('day_of_week, start_time, end_time')
      .eq('business_id', businessId)
      .eq('is_active', true);

    // Return widget configuration
    return NextResponse.json(
      {
        business: {
          id: business.id,
          name: business.name,
          timezone: business.timezone || 'America/New_York',
        },
        services: services || [],
        availability: availability || [],
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Widget Config] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
