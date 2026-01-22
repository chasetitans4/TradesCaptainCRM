// =====================================================
// PORTAL LEAD CAPTAIN CONFIG API
// GET /api/portal/lead-captain/config - Get config (subset of fields)
// PATCH /api/portal/lead-captain/config - Update config (allowed fields only)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import type { PortalLeadCaptainConfig } from '@/types/portal/lead-captain';

// Fields that portal users can read
const READABLE_FIELDS = [
  'tone',
  'use_emojis',
  'ai_enabled',
  'ai_confidence_threshold',
  'ai_creativity_level',
  'ai_max_messages',
  'ai_pricing_mode',
  'business_hours',
  'timezone',
  'emergency_service',
  'business_name',
] as const;

// Fields that portal users can update (excludes business_name)
const UPDATABLE_FIELDS = [
  'tone',
  'use_emojis',
  'ai_enabled',
  'ai_confidence_threshold',
  'ai_creativity_level',
  'ai_max_messages',
  'ai_pricing_mode',
  'business_hours',
  'timezone',
  'emergency_service',
] as const;

export async function GET(request: NextRequest) {
  // SECURITY WARNING: This endpoint exposes business configuration to customers.
  // Customers should not be able to see or modify AI settings, Business Hours, or Pricing.
  // This feature belongs in the Admin Dashboard, not the Customer Portal.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });

  /*
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session?.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: config, error } = await supabase
      .from('leads_captain_config')
      .select('*')
      .eq('business_id', session?.businessId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!config) {
      return NextResponse.json({
        config: null,
        needs_setup: true,
      });
    }

    // Return only allowed fields
    const portalConfig: PortalLeadCaptainConfig = {
      tone: config.tone,
      use_emojis: config.use_emojis,
      ai_enabled: config.ai_enabled,
      ai_confidence_threshold: config.ai_confidence_threshold,
      ai_creativity_level: config.ai_creativity_level,
      ai_max_messages: config.ai_max_messages,
      ai_pricing_mode: config.ai_pricing_mode,
      business_hours: config.business_hours,
      timezone: config.timezone,
      emergency_service: config.emergency_service,
      business_name: config.business_name,
    };

    return NextResponse.json({ config: portalConfig });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain config GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get Lead Captain config' },
      { status: 500 }
    );
  }
  */
}

export async function PATCH(request: NextRequest) {
  // SECURITY WARNING: This endpoint exposes business configuration to customers.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });

  /*
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session?.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Build update object with only allowed fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of UPDATABLE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate specific fields
    if (updates.ai_confidence_threshold !== undefined) {
      const threshold = updates.ai_confidence_threshold as number;
      if (threshold < 0 || threshold > 100) {
        return NextResponse.json(
          { error: 'AI confidence threshold must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (updates.ai_max_messages !== undefined) {
      const maxMessages = updates.ai_max_messages as number;
      if (maxMessages < 1 || maxMessages > 50) {
        return NextResponse.json(
          { error: 'AI max messages must be between 1 and 50' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('leads_captain_config')
      .update(updates)
      .eq('business_id', session?.businessId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Portal Lead Captain config updated',
      businessId: session?.businessId,
      customerId: session?.customerId,
      fieldsUpdated: Object.keys(updates).filter((k) => k !== 'updated_at'),
    });

    // Return updated config with only allowed fields
    const portalConfig: PortalLeadCaptainConfig = {
      tone: data.tone,
      use_emojis: data.use_emojis,
      ai_enabled: data.ai_enabled,
      ai_confidence_threshold: data.ai_confidence_threshold,
      ai_creativity_level: data.ai_creativity_level,
      ai_max_messages: data.ai_max_messages,
      ai_pricing_mode: data.ai_pricing_mode,
      business_hours: data.business_hours,
      timezone: data.timezone,
      emergency_service: data.emergency_service,
      business_name: data.business_name,
    };

    return NextResponse.json({ success: true, config: portalConfig });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal Lead Captain config PATCH error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update Lead Captain config' },
      { status: 500 }
    );
  }
  */
}
