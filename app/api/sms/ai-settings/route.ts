// =====================================================
// AI SMS SETTINGS
// GET/PUT /api/sms/ai-settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

// GET - Fetch AI SMS settings
export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: business, error } = await supabase
      .from('businesses')
      .select(`
        ai_sms_enabled,
        ai_sms_quiet_start,
        ai_sms_quiet_end,
        ai_sms_knowledge_base,
        ai_sms_tone
      `)
      .eq('id', profile.business_id)
      .single();

    if (error) {
      apiLogger.error({ error, context: 'fetching AI SMS settings' });
      return NextResponse.json(
        { error: 'Failed to fetch AI SMS settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enabled: business.ai_sms_enabled ?? true,
      quiet_start: business.ai_sms_quiet_start || '20:00',
      quiet_end: business.ai_sms_quiet_end || '08:00',
      knowledge_base: business.ai_sms_knowledge_base || '',
      tone: business.ai_sms_tone || 'professional',
    });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching AI SMS settings' });
    return NextResponse.json(
      { error: 'Failed to fetch AI SMS settings' },
      { status: 500 }
    );
  }
}

// PUT - Update AI SMS settings
export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can update AI SMS settings
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can update AI SMS settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enabled, quiet_start, quiet_end, knowledge_base, tone } = body;

    const supabase = await createServerSupabaseClient();

    const updates: Record<string, any> = {};

    if (typeof enabled === 'boolean') {
      updates.ai_sms_enabled = enabled;
    }
    if (quiet_start) {
      updates.ai_sms_quiet_start = quiet_start;
    }
    if (quiet_end) {
      updates.ai_sms_quiet_end = quiet_end;
    }
    if (knowledge_base !== undefined) {
      updates.ai_sms_knowledge_base = knowledge_base;
    }
    if (tone && ['professional', 'friendly', 'casual'].includes(tone)) {
      updates.ai_sms_tone = tone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', profile.business_id);

    if (error) {
      apiLogger.error({ error, context: 'updating AI SMS settings' });
      return NextResponse.json(
        { error: 'Failed to update AI SMS settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'updating AI SMS settings' });
    return NextResponse.json(
      { error: 'Failed to update AI SMS settings' },
      { status: 500 }
    );
  }
}
