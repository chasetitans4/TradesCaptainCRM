/**
 * VOICE LOCATIONS API
 * GET /api/voice/locations - Get business locations with voice overrides
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

const locationsLogger = apiLogger.child({ context: 'api.voice.locations' });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Get all business locations
    const { data: locations, error: locationsError } = await supabase
      .from('business_locations')
      .select('*')
      .eq('business_id', userData.business_id)
      .eq('is_active', true)
      .order('name');

    if (locationsError) {
      locationsLogger.error({
        msg: 'Failed to fetch locations',
        error: locationsError.message,
        businessId: userData.business_id,
      });
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Get all voice location overrides
    const { data: overrides, error: overridesError } = await supabase
      .from('voice_location_overrides')
      .select('*')
      .eq('business_id', userData.business_id);

    if (overridesError) {
      locationsLogger.error({
        msg: 'Failed to fetch voice overrides',
        error: overridesError.message,
        businessId: userData.business_id,
      });
    }

    // Create a map of location_id to override
    const overrideMap = new Map(
      (overrides || []).map((o: any) => [o.location_id, o])
    );

    // Merge locations with overrides
    const locationsWithOverrides = (locations || []).map((location: any) => ({
      ...location,
      voice_override: overrideMap.get(location.id) || null,
    }));

    return NextResponse.json({ locations: locationsWithOverrides });
  } catch (error) {
    locationsLogger.error({
      msg: 'Error fetching voice locations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
