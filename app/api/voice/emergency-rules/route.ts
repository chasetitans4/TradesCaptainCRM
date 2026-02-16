/**
 * VOICE EMERGENCY RULES API
 * GET/POST /api/voice/emergency-rules
 *
 * Manages emergency rules and trigger phrases.
 * Delta 2: Rules are global (not location-specific).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getEmergencyRules,
  createEmergencyRule,
  initializeDefaultEmergencyRules,
} from '@/lib/voice/emergency-rules';
import { apiLogger } from '@/lib/logger';

const rulesLogger = apiLogger.child({ context: 'api.voice.emergency-rules' });

// GET /api/voice/emergency-rules - Get all emergency rules
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const rules = await getEmergencyRules(userData.business_id);

    return NextResponse.json({ rules });
  } catch (error) {
    rulesLogger.error({
      msg: 'Error fetching emergency rules',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch emergency rules' },
      { status: 500 }
    );
  }
}

// POST /api/voice/emergency-rules - Create emergency rule or initialize defaults
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Handle initialization action
    if (action === 'initialize_defaults') {
      const rules = await initializeDefaultEmergencyRules(
        userData.business_id,
        data.primaryContactId
      );
      return NextResponse.json({ rules, initialized: true });
    }

    // Create new rule
    if (!data.category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const rule = await createEmergencyRule(userData.business_id, {
      category: data.category,
      is_enabled: data.is_enabled,
      caller_confirmation_enabled: data.caller_confirmation_enabled,
      keypad_override_enabled: data.keypad_override_enabled,
      default_primary_contact_id: data.default_primary_contact_id,
      default_backup_contact_id: data.default_backup_contact_id,
      escalation_wait_minutes: data.escalation_wait_minutes,
      phrases: data.phrases,
    });

    rulesLogger.info({
      msg: 'Emergency rule created',
      businessId: userData.business_id,
      category: data.category,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    rulesLogger.error({
      msg: 'Error creating emergency rule',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create emergency rule' },
      { status: 500 }
    );
  }
}
