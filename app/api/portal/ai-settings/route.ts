// =====================================================
// PORTAL AI SETTINGS API
// GET /api/portal/ai-settings - Get AI pause state
// PATCH /api/portal/ai-settings - Toggle AI pause
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: access, error } = await supabase
      .from('customer_portal_access')
      .select('ai_paused, ai_paused_at, ai_paused_reason')
      .eq('business_id', session.businessId)
      .eq('customer_id', session.customerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      throw error;
    }

    return NextResponse.json({
      aiPaused: access?.ai_paused ?? false,
      aiPausedAt: access?.ai_paused_at ?? null,
      aiPausedReason: access?.ai_paused_reason ?? null,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get AI settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get AI settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { aiPaused, reason } = body;

    if (typeof aiPaused !== 'boolean') {
      return NextResponse.json(
        { error: 'aiPaused must be a boolean' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData = {
      ai_paused: aiPaused,
      ai_paused_at: aiPaused ? new Date().toISOString() : null,
      ai_paused_reason: aiPaused ? (reason || 'Customer requested') : null,
    };

    const { error } = await supabase
      .from('customer_portal_access')
      .update(updateData)
      .eq('business_id', session.businessId)
      .eq('customer_id', session.customerId);

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'AI pause state changed',
      customerId: session.customerId,
      businessId: session.businessId,
      aiPaused,
      reason: reason || 'Customer requested',
    });

    return NextResponse.json({
      success: true,
      aiPaused,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Update AI settings error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update AI settings' },
      { status: 500 }
    );
  }
}
