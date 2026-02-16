/**
 * VOICE LOCATION OVERRIDE API
 * PUT /api/voice/locations/[id] - Update voice override for a location
 * DELETE /api/voice/locations/[id] - Delete voice override for a location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  upsertLocationOverride,
  deleteLocationOverride,
  isGlobalOnlyField,
} from '@/lib/voice/config-resolver';
import { apiLogger } from '@/lib/logger';

const locationLogger = apiLogger.child({ context: 'api.voice.locations.id' });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: locationId } = await context.params;
    const supabase = await createClient();
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
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only owners and admins can update overrides
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify the location belongs to this business
    const { data: location, error: locationError } = await supabase
      .from('business_locations')
      .select('id')
      .eq('id', locationId)
      .eq('business_id', userData.business_id)
      .single();

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate that only overrideable fields are being set
    const invalidFields = Object.keys(body).filter((field) => isGlobalOnlyField(field));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Cannot override global-only fields: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    const override = await upsertLocationOverride(userData.business_id, locationId, body);

    if (!override) {
      return NextResponse.json({ error: 'Failed to update override' }, { status: 500 });
    }

    locationLogger.info({
      msg: 'Location override updated',
      businessId: userData.business_id,
      locationId,
    });

    return NextResponse.json({ override });
  } catch (error) {
    locationLogger.error({
      msg: 'Error updating location override',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update override' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: locationId } = await context.params;
    const supabase = await createClient();
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
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only owners and admins can delete overrides
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const success = await deleteLocationOverride(userData.business_id, locationId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 });
    }

    locationLogger.info({
      msg: 'Location override deleted',
      businessId: userData.business_id,
      locationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    locationLogger.error({
      msg: 'Error deleting location override',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to delete override' },
      { status: 500 }
    );
  }
}
