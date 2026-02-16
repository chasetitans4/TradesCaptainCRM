/**
 * VOICE EMERGENCY RULE API (Single Rule)
 * GET/PUT/DELETE /api/voice/emergency-rules/[id]
 *
 * Manage individual emergency rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getEmergencyRule,
  updateEmergencyRule,
  deleteEmergencyRule,
} from '@/lib/voice/emergency-rules';
import { apiLogger } from '@/lib/logger';

const rulesLogger = apiLogger.child({ context: 'api.voice.emergency-rules.id' });

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/voice/emergency-rules/[id] - Get single rule
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const rule = await getEmergencyRule(id, userData.business_id);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    rulesLogger.error({
      msg: 'Error fetching emergency rule',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch emergency rule' },
      { status: 500 }
    );
  }
}

// PUT /api/voice/emergency-rules/[id] - Update rule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const rule = await updateEmergencyRule(id, userData.business_id, {
      category: body.category,
      is_enabled: body.is_enabled,
      caller_confirmation_enabled: body.caller_confirmation_enabled,
      keypad_override_enabled: body.keypad_override_enabled,
      default_primary_contact_id: body.default_primary_contact_id,
      default_backup_contact_id: body.default_backup_contact_id,
      escalation_wait_minutes: body.escalation_wait_minutes,
      phrases: body.phrases,
    });

    rulesLogger.info({
      msg: 'Emergency rule updated',
      businessId: userData.business_id,
      ruleId: id,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    rulesLogger.error({
      msg: 'Error updating emergency rule',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update emergency rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/voice/emergency-rules/[id] - Delete rule
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    await deleteEmergencyRule(id, userData.business_id);

    rulesLogger.info({
      msg: 'Emergency rule deleted',
      businessId: userData.business_id,
      ruleId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    rulesLogger.error({
      msg: 'Error deleting emergency rule',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete emergency rule' },
      { status: 500 }
    );
  }
}
