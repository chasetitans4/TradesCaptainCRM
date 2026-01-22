// =====================================================
// BUSINESS LOCATIONS API
// GET /api/locations - List business locations
// POST /api/locations - Create a new location
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabase
      .from('business_locations')
      .select('*')
      .eq('business_id', userData.business_id)
      .order('is_headquarters', { ascending: false })
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: locations, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ locations });
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching business locations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners and admins can create locations
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country = 'US',
      phone,
      email,
      timezone = 'America/New_York',
      latitude,
      longitude,
      isHeadquarters = false,
      operatingHours,
      serviceAreaRadiusMiles = 25,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If marking as headquarters, unset any existing headquarters
    if (isHeadquarters) {
      await supabase
        .from('business_locations')
        .update({ is_headquarters: false })
        .eq('business_id', userData.business_id)
        .eq('is_headquarters', true);
    }

    const { data: location, error } = await supabase
      .from('business_locations')
      .insert({
        business_id: userData.business_id,
        name,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        postal_code: postalCode,
        country,
        phone,
        email,
        timezone,
        latitude,
        longitude,
        is_headquarters: isHeadquarters,
        operating_hours: operatingHours || {},
        service_area_radius_miles: serviceAreaRadiusMiles,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Business location created',
      locationId: location.id,
      name,
      isHeadquarters,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      msg: 'Error creating business location',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
