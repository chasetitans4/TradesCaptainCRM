// =====================================================
// ADMIN REVENUE RECOVERY CLIENT SETTINGS API
// GET/PATCH /api/admin/revenue-recovery/clients/:clientId/settings
// Manage per-client recovery settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const supabase = await createClient();

    const { data: settings } = await supabase
      .from('client_recovery_settings')
      .select('*')
      .eq('organization_id', clientId)
      .single();

    return NextResponse.json({
      recoveryEnabled: settings?.recovery_enabled ?? true,
      recoveryLocked: settings?.recovery_locked ?? false,
      clientCanDisable: settings?.client_can_disable ?? true,
      attributionWindowHours: settings?.attribution_window_hours ?? 72,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get client recovery settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/super_admin can modify client settings
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { clientId } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Build update object
    const updates: Record<string, any> = {
      organization_id: clientId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.recoveryEnabled === 'boolean') {
      updates.recovery_enabled = body.recoveryEnabled;
    }
    if (typeof body.recoveryLocked === 'boolean') {
      updates.recovery_locked = body.recoveryLocked;
    }
    if (typeof body.clientCanDisable === 'boolean') {
      updates.client_can_disable = body.clientCanDisable;
    }
    if (typeof body.attributionWindowHours === 'number') {
      updates.attribution_window_hours = body.attributionWindowHours;
    }

    // Upsert settings
    const { error: upsertError } = await supabase
      .from('client_recovery_settings')
      .upsert(updates, {
        onConflict: 'organization_id',
      });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Update client recovery settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
