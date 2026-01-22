// =====================================================
// Leads Captain v2 Intents API
// GET /api/leads-captain/v2/intents - List all intents
// PUT /api/leads-captain/v2/intents - Bulk update enabled intents
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import type { UpdateIntentsRequest } from '@/types/leads-captain';

export async function GET() {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get intents grouped by category
    const { data: intents, error } = await supabase
      .from('leads_captain_intents')
      .select('*')
      .eq('config_id', config.id)
      .order('intent_category')
      .order('intent_label');

    if (error) throw error;

    // Group by category
    const grouped = (intents || []).reduce((acc, intent) => {
      const category = intent.intent_category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(intent);
      return acc;
    }, {} as Record<string, typeof intents>);

    return NextResponse.json({
      intents: intents || [],
      grouped,
      total: intents?.length || 0,
      enabled_count: intents?.filter(i => i.enabled).length || 0,
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching intents',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch intents' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await checkPermission('manage_leads_captain');
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body: UpdateIntentsRequest = await request.json();

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', userData.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Update each intent
    const updates = body.intents.map(async ({ intent_code, enabled }) => {
      return supabase
        .from('leads_captain_intents')
        .update({ enabled })
        .eq('config_id', config.id)
        .eq('intent_code', intent_code);
    });

    await Promise.all(updates);

    // Get updated intents
    const { data: intents } = await supabase
      .from('leads_captain_intents')
      .select('*')
      .eq('config_id', config.id)
      .order('intent_category')
      .order('intent_label');

    return NextResponse.json({
      intents: intents || [],
      message: 'Intents updated successfully',
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error updating intents',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update intents' },
      { status: 500 }
    );
  }
}
