// =====================================================
// CLIENT REVENUE RECOVERY SETTINGS API
// GET/PATCH /api/revenue-recovery/settings
// Manage client recovery settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Verify portal session (JWT-based auth for customer portal)
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the requested businessId matches the session
    if (session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client since portal users don't have Supabase auth
    const supabase = createAdminClient();

    // Get business organization ID
    const { data: business } = await supabase
      .from('businesses')
      .select('organization_id')
      .eq('id', businessId)
      .single();

    if (!business?.organization_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get settings
    const { data: settings } = await supabase
      .from('client_recovery_settings')
      .select('*')
      .eq('organization_id', business.organization_id)
      .single();

    return NextResponse.json({
      recoveryEnabled: settings?.recovery_enabled ?? true,
      recoveryLocked: settings?.recovery_locked ?? false,
      clientCanDisable: settings?.client_can_disable ?? true,
      attributionWindowHours: settings?.attribution_window_hours ?? 72,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get recovery settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Verify portal session (JWT-based auth for customer portal)
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the requested businessId matches the session
    if (session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client since portal users don't have Supabase auth
    const supabase = createAdminClient();

    // Get business organization ID
    const { data: business } = await supabase
      .from('businesses')
      .select('organization_id')
      .eq('id', businessId)
      .single();

    if (!business?.organization_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get current settings to check if locked
    const { data: currentSettings } = await supabase
      .from('client_recovery_settings')
      .select('*')
      .eq('organization_id', business.organization_id)
      .single();

    // Check if settings are locked
    if (currentSettings?.recovery_locked) {
      return NextResponse.json(
        { error: 'Recovery settings are locked by administrator' },
        { status: 403 }
      );
    }

    // Check if client can disable
    const body = await request.json();
    if (body.recoveryEnabled === false && !currentSettings?.client_can_disable) {
      return NextResponse.json(
        { error: 'You do not have permission to disable recovery' },
        { status: 403 }
      );
    }

    // Update settings
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.recoveryEnabled === 'boolean') {
      updates.recovery_enabled = body.recoveryEnabled;
    }

    // Upsert settings
    const { error: upsertError } = await supabase
      .from('client_recovery_settings')
      .upsert({
        organization_id: business.organization_id,
        ...updates,
      }, {
        onConflict: 'organization_id',
      });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Update recovery settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
