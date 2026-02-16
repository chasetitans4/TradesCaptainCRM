/**
 * VOICE SETTINGS API
 * GET/POST /api/voice/settings
 *
 * Manage voice receptionist settings.
 * Delta 2: Global settings + location overrides.
 * Delta 6: training_opt_out is always true and cannot be changed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getVoiceSettings,
  upsertVoiceSettings,
  getLocationOverride,
  upsertLocationOverride,
  deleteLocationOverride,
  isGlobalOnlyField,
} from '@/lib/voice/config-resolver';
import { apiLogger } from '@/lib/logger';

const settingsLogger = apiLogger.child({ context: 'api.voice.settings' });

// GET /api/voice/settings - Get voice settings
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

    // Check for location_id query param
    const locationId = request.nextUrl.searchParams.get('location_id');

    const settings = await getVoiceSettings(userData.business_id);
    let locationOverride = null;

    if (locationId) {
      locationOverride = await getLocationOverride(userData.business_id, locationId);
    }

    // Get all location overrides if requested
    const includeAllLocations = request.nextUrl.searchParams.get('include_locations') === 'true';
    let allLocationOverrides = null;

    if (includeAllLocations) {
      const { data: overrides } = await supabase
        .from('voice_location_overrides')
        .select('*')
        .eq('business_id', userData.business_id);
      allLocationOverrides = overrides;
    }

    return NextResponse.json({
      settings,
      locationOverride,
      allLocationOverrides,
    });
  } catch (error) {
    settingsLogger.error({
      msg: 'Error fetching voice settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch voice settings' },
      { status: 500 }
    );
  }
}

// POST /api/voice/settings - Update voice settings
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, location_id, ...data } = body;

    // Handle location override actions
    if (action === 'set_location_override' && location_id) {
      // Validate that only overrideable fields are being set
      const invalidFields = Object.keys(data).filter((field) => isGlobalOnlyField(field));
      if (invalidFields.length > 0) {
        return NextResponse.json(
          { error: `Cannot override global-only fields: ${invalidFields.join(', ')}` },
          { status: 400 }
        );
      }

      const override = await upsertLocationOverride(userData.business_id, location_id, data);
      settingsLogger.info({
        msg: 'Location override updated',
        businessId: userData.business_id,
        locationId: location_id,
      });
      return NextResponse.json({ locationOverride: override });
    }

    if (action === 'delete_location_override' && location_id) {
      await deleteLocationOverride(userData.business_id, location_id);
      settingsLogger.info({
        msg: 'Location override deleted',
        businessId: userData.business_id,
        locationId: location_id,
      });
      return NextResponse.json({ success: true });
    }

    // Delta 6: Prevent changing training_opt_out
    if ('training_opt_out' in data && data.training_opt_out !== true) {
      return NextResponse.json(
        { error: 'training_opt_out cannot be disabled (Delta 6 compliance)' },
        { status: 400 }
      );
    }

    // Validate daytime AI voice consent
    if (data.enable_daytime_ai_voice === true) {
      const currentSettings = await getVoiceSettings(userData.business_id);
      if (!currentSettings?.daytime_ai_voice_consent_at) {
        // Record consent
        data.daytime_ai_voice_consent_at = new Date().toISOString();
        data.daytime_ai_voice_consent_by = user.id;
      }
    }

    // Update global settings
    const settings = await upsertVoiceSettings(userData.business_id, data);

    settingsLogger.info({
      msg: 'Voice settings updated',
      businessId: userData.business_id,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    settingsLogger.error({
      msg: 'Error updating voice settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update voice settings' },
      { status: 500 }
    );
  }
}
