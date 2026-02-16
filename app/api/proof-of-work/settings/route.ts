import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/proof-of-work/settings
 * Get Proof of Work settings for the current user's business
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with business
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get PoW settings from business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`
        pow_enabled,
        pow_auto_delivery,
        pow_delivery_channel,
        pow_delivery_delay_minutes,
        pow_show_zip,
        pow_require_photos,
        pow_finalization_delay_minutes
      `)
      .eq('id', profile.business_id)
      .single();

    if (businessError) {
      logger.error({
        msg: 'Failed to get PoW settings',
        businessId: profile.business_id,
        error: businessError,
      });
      return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: {
        pow_enabled: business.pow_enabled ?? true,
        pow_auto_delivery: business.pow_auto_delivery ?? true,
        pow_delivery_channel: business.pow_delivery_channel || 'SMS',
        pow_delivery_delay_minutes: business.pow_delivery_delay_minutes ?? 15,
        pow_show_zip: business.pow_show_zip ?? true,
        pow_require_photos: business.pow_require_photos ?? false,
        pow_finalization_delay_minutes: business.pow_finalization_delay_minutes ?? 30,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting PoW settings',
      error,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/proof-of-work/settings
 * Update Proof of Work settings for the current user's business
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners can change settings
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only business owners can update settings' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate settings
    const validChannels = ['SMS', 'EMAIL', 'BOTH'];
    if (body.pow_delivery_channel && !validChannels.includes(body.pow_delivery_channel)) {
      return NextResponse.json(
        { error: 'Invalid delivery channel' },
        { status: 400 }
      );
    }

    // Build update object with only valid fields
    const updates: Record<string, unknown> = {};

    if (typeof body.pow_enabled === 'boolean') {
      updates.pow_enabled = body.pow_enabled;
    }
    if (typeof body.pow_auto_delivery === 'boolean') {
      updates.pow_auto_delivery = body.pow_auto_delivery;
    }
    if (body.pow_delivery_channel && validChannels.includes(body.pow_delivery_channel)) {
      updates.pow_delivery_channel = body.pow_delivery_channel;
    }
    if (typeof body.pow_delivery_delay_minutes === 'number') {
      updates.pow_delivery_delay_minutes = Math.max(0, Math.min(120, body.pow_delivery_delay_minutes));
    }
    if (typeof body.pow_show_zip === 'boolean') {
      updates.pow_show_zip = body.pow_show_zip;
    }
    if (typeof body.pow_require_photos === 'boolean') {
      updates.pow_require_photos = body.pow_require_photos;
    }
    if (typeof body.pow_finalization_delay_minutes === 'number') {
      // Minimum 15 minutes, max 8 hours
      updates.pow_finalization_delay_minutes = Math.max(15, Math.min(480, body.pow_finalization_delay_minutes));
    }

    // Update business
    const { error: updateError } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', profile.business_id);

    if (updateError) {
      logger.error({
        msg: 'Failed to update PoW settings',
        businessId: profile.business_id,
        error: updateError,
      });
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    logger.info({
      msg: 'PoW settings updated',
      businessId: profile.business_id,
      updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      msg: 'Error updating PoW settings',
      error,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
