// =====================================================
// ADMIN REVENUE RECOVERY CLIENTS LIST API
// GET /api/admin/revenue-recovery/clients
// List all clients with recovery data
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all organizations with their settings
    const { data: settings } = await supabase
      .from('client_recovery_settings')
      .select('*');

    // Get all organizations
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name');

    // Get attributions grouped by organization
    const { data: attributions } = await supabase
      .from('revenue_attributions')
      .select('organization_id, revenue_amount_cents, confidence, outcome_id, trigger_at');

    // Build client data
    const settingsMap = new Map((settings || []).map(s => [s.organization_id, s]));
    const orgMap = new Map((organizations || []).map(o => [o.id, o]));

    // Group attributions by org
    const attrByOrg = new Map<string, any[]>();
    (attributions || []).forEach(a => {
      const list = attrByOrg.get(a.organization_id) || [];
      list.push(a);
      attrByOrg.set(a.organization_id, list);
    });

    // Build client list
    const clients = Array.from(new Set([
      ...(settings || []).map(s => s.organization_id),
      ...Array.from(attrByOrg.keys()),
    ])).map(orgId => {
      const org = orgMap.get(orgId);
      const orgSettings = settingsMap.get(orgId);
      const orgAttrs = attrByOrg.get(orgId) || [];

      // Calculate totals
      const totalInfluenced = orgAttrs.reduce((sum, a) => {
        const amount = a.confidence === 'high'
          ? a.revenue_amount_cents
          : Math.round(a.revenue_amount_cents * 0.7);
        return sum + amount;
      }, 0) / 100;

      const totalAttempts = orgAttrs.length;
      const successful = orgAttrs.filter(a => a.outcome_id).length;
      const recoveryRate = totalAttempts > 0 ? (successful / totalAttempts) * 100 : 0;

      // Get last activity
      const lastActivity = orgAttrs.length > 0
        ? orgAttrs.sort((a, b) =>
            new Date(b.trigger_at).getTime() - new Date(a.trigger_at).getTime()
          )[0].trigger_at
        : null;

      return {
        id: orgId,
        businessName: org?.name || 'Unknown Organization',
        recoveryEnabled: orgSettings?.recovery_enabled ?? true,
        recoveryLocked: orgSettings?.recovery_locked ?? false,
        clientCanDisable: orgSettings?.client_can_disable ?? true,
        attributionWindowHours: orgSettings?.attribution_window_hours ?? 72,
        totalInfluenced,
        recoveryRate,
        lastActivity,
      };
    });

    // Sort by total influenced (highest first)
    clients.sort((a, b) => b.totalInfluenced - a.totalInfluenced);

    return NextResponse.json({ clients });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin revenue recovery clients error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
