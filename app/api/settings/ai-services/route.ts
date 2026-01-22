// =====================================================
// AI SERVICES SETTINGS API (v6.3)
// GET/PUT /api/settings/ai-services
// Master toggle for all AI services (Leads Captain, AI SMS)
// v6.3: Leads Captain is now a $49/mo add-on
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { hasLeadsCaptainAddon, getSMSLimit } from '@/lib/leads-captain';

// GET - Get AI services status
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get business settings
    const { data: business } = await supabase
      .from('businesses')
      .select('ai_sms_enabled, plan_type, has_leads_captain_addon')
      .eq('id', userData.business_id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // v6.3: Check if they have the LC add-on
    const hasAddon = business.has_leads_captain_addon ?? false;
    const smsLimit = await getSMSLimit(userData.business_id);

    // Determine plan tier for display
    const planType = business.plan_type || 'blue_starter';
    const planTier = planType.includes('starter') ? 'starter' :
                     planType.includes('pro') ? 'pro' : 'enterprise';

    return NextResponse.json({
      aiServicesEnabled: business.ai_sms_enabled ?? false,
      hasLeadsCaptainAddon: hasAddon, // v6.3: New field
      planType,
      planTier, // v6.3: Cleaner tier identifier
      smsLimit, // v6.3: Current SMS limit (0 if no addon)
      addonPrice: 49, // v6.3: LC addon price
      settingsPath: '/settings/ai-sms',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get AI services settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// PUT - Toggle AI services on/off
// v6.3: Only allowed if business has Leads Captain add-on
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners and admins can change AI settings
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // v6.3: Check if they have the LC add-on (only when enabling)
    if (enabled) {
      const hasAddon = await hasLeadsCaptainAddon(userData.business_id);
      if (!hasAddon) {
        return NextResponse.json({
          error: 'AI services require the Leads Captain add-on ($49/mo). Purchase it from your billing settings.',
          addonRequired: true,
          addonPrice: 49,
        }, { status: 403 });
      }
    }

    // Update the setting
    const { error } = await supabase
      .from('businesses')
      .update({
        ai_sms_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.business_id);

    if (error) {
      throw error;
    }

    // Also update feature_settings table for consistency
    await supabase
      .from('feature_settings')
      .upsert({
        business_id: userData.business_id,
        ai_sms_enabled: enabled,
      }, { onConflict: 'business_id' });

    // Log the change
    await supabase.from('business_audit_log').insert({
      business_id: userData.business_id,
      user_id: user.id,
      action: enabled ? 'ai_services_enabled' : 'ai_services_disabled',
      entity_type: 'settings',
      details: { ai_sms_enabled: enabled },
    });

    apiLogger.info({
      msg: 'AI services toggled',
      businessId: userData.business_id,
      enabled,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      aiServicesEnabled: enabled,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Toggle AI services error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
