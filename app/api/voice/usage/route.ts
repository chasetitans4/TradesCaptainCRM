/**
 * VOICE USAGE API
 * GET/POST /api/voice/usage
 *
 * Get usage stats and manage overage settings.
 * Delta 3: Hard minute caps with explicit customer choice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getVoiceUsageStatus,
  enableOverageBilling,
  disableOverageBilling,
  calculateOverageCharges,
} from '@/lib/billing/voice-usage';
import { VOICE_OVERAGE_RATE } from '@/types/voice-receptionist';
import { apiLogger } from '@/lib/logger';

const usageLogger = apiLogger.child({ context: 'api.voice.usage' });

// GET /api/voice/usage - Get current usage status
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

    const status = await getVoiceUsageStatus(userData.business_id);

    if (!status) {
      return NextResponse.json({
        usage: null,
        message: 'No voice usage record found for current billing period',
      });
    }

    // Calculate estimated overage cost
    const estimatedOverageCost = status.overageMinutes > 0
      ? calculateOverageCharges(status.overageMinutes)
      : 0;

    return NextResponse.json({
      usage: {
        ...status,
        estimatedOverageCost,
        overageRate: VOICE_OVERAGE_RATE,
      },
    });
  } catch (error) {
    usageLogger.error({
      msg: 'Error fetching voice usage',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch voice usage' },
      { status: 500 }
    );
  }
}

// POST /api/voice/usage - Manage overage settings
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
    const { action } = body;

    // Delta 3: Enable overage billing (explicit opt-in)
    if (action === 'enable_overage') {
      // Require explicit acknowledgment
      if (!body.acknowledged) {
        return NextResponse.json(
          {
            error: 'You must acknowledge the overage billing terms',
            requiresAcknowledgment: true,
            terms: {
              rate: VOICE_OVERAGE_RATE,
              rateDescription: `$${VOICE_OVERAGE_RATE} per minute`,
              message: 'By enabling overage billing, you agree to be charged for usage beyond your plan limits at the rate shown.',
            },
          },
          { status: 400 }
        );
      }

      const success = await enableOverageBilling(userData.business_id, user.id);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to enable overage billing' },
          { status: 500 }
        );
      }

      usageLogger.info({
        msg: 'Overage billing enabled',
        businessId: userData.business_id,
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Overage billing has been enabled',
      });
    }

    // Disable overage billing (switch to hard stop)
    if (action === 'disable_overage') {
      const success = await disableOverageBilling(userData.business_id);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to disable overage billing' },
          { status: 500 }
        );
      }

      usageLogger.info({
        msg: 'Overage billing disabled',
        businessId: userData.business_id,
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Overage billing has been disabled. Voice AI will pause when limits are reached.',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    usageLogger.error({
      msg: 'Error managing voice usage',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage voice usage' },
      { status: 500 }
    );
  }
}
