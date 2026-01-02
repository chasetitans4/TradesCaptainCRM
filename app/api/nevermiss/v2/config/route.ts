// =====================================================
// Leads Captain v2 Config API
// GET /api/nevermiss/v2/config - Get config
// PUT /api/nevermiss/v2/config - Update config
// POST /api/nevermiss/v2/config - Create config (if not exists)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { UpdateConfigRequest, NevermissConfig } from '@/types/nevermiss';

export async function GET() {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: config, error } = await supabase
      .from('nevermiss_config')
      .select('*')
      .eq('business_id', profile.business_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!config) {
      // Return empty config indicating setup needed
      return NextResponse.json({ config: null, needs_setup: true });
    }

    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('Error fetching Leads Captain config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();

    // Check if config already exists
    const { data: existing } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Config already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Get business name for default
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', profile.business_id)
      .single();

    // Create new config
    const { data: config, error } = await supabase
      .from('nevermiss_config')
      .insert({
        business_id: profile.business_id,
        business_name: body.business_name || business?.name || 'My Business',
        business_type: body.business_type || null,
        service_area: body.service_area || null,
        owner_name: body.owner_name || null,
        main_phone: body.main_phone || null,
        emergency_phone: body.emergency_phone || null,
        booking_link: body.booking_link || null,
        timezone: body.timezone || 'America/Chicago',
        tone: body.tone || 'friendly_professional',
        use_emojis: body.use_emojis ?? true,
        ai_enabled: body.ai_enabled ?? true,
        ai_confidence_threshold: body.ai_confidence_threshold || 70,
        ai_creativity_level: body.ai_creativity_level || 'low',
        ai_max_messages: body.ai_max_messages || 5,
        ai_pricing_mode: body.ai_pricing_mode || 'ranges',
      })
      .select()
      .single();

    if (error) throw error;

    // Seed default intents, templates, and rules
    await supabase.rpc('seed_nevermiss_intents', { p_config_id: config.id });
    await supabase.rpc('seed_nevermiss_templates', { p_config_id: config.id });
    await supabase.rpc('seed_nevermiss_rules', { p_config_id: config.id });

    // Log audit
    await supabase.from('nevermiss_audit_log').insert({
      config_id: config.id,
      action: 'config_changed',
      actor: profile.email || 'user',
      details: { action: 'created' },
    });

    return NextResponse.json({ config, message: 'Config created with defaults' });
  } catch (error: unknown) {
    console.error('Error creating NeverMiss config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body: UpdateConfigRequest = await request.json();

    // Get existing config
    const { data: existing } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Config not found. Use POST to create.' },
        { status: 404 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: Partial<NevermissConfig> = {};
    const allowedFields: (keyof UpdateConfigRequest)[] = [
      'business_name', 'business_type', 'service_area', 'owner_name',
      'main_phone', 'emergency_phone', 'booking_link', 'business_hours',
      'timezone', 'emergency_service', 'tone', 'use_emojis', 'languages',
      'ai_enabled', 'ai_confidence_threshold', 'ai_creativity_level',
      'ai_max_messages', 'ai_pricing_mode', 'memory_scope', 'memory_expiration_days',
      'global_mode', 'require_approval', 'approval_timeout_minutes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    const { data: config, error } = await supabase
      .from('nevermiss_config')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('nevermiss_audit_log').insert({
      config_id: existing.id,
      action: 'config_changed',
      actor: profile.email || 'user',
      details: { fields_updated: Object.keys(updateData) },
    });

    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('Error updating NeverMiss config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    );
  }
}
