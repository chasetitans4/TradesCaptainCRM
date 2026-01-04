// =====================================================
// ADMIN SUPPORT - SMS TROUBLESHOOTING API
// GET /api/admin/support/sms - Get SMS delivery issues
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  getSmsDeliveryFailures,
  checkSuppressionList,
  getSmsUsage,
  TWILIO_ERROR_CODES,
} from '@/lib/admin/leads-captain-support';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id');
    const checkPhone = searchParams.get('check_phone');
    const action = searchParams.get('action') || 'failures';
    const hours = parseInt(searchParams.get('hours') || '24');

    switch (action) {
      case 'failures': {
        const failures = await getSmsDeliveryFailures(organizationId || undefined, hours);

        // Enrich with error code explanations
        const enrichedFailures = failures.map((failure) => ({
          ...failure,
          error_explanation: TWILIO_ERROR_CODES[failure.error_code] || {
            meaning: 'Unknown error',
            fix: 'Contact support for assistance',
          },
        }));

        return NextResponse.json({
          failures: enrichedFailures,
          count: enrichedFailures.length,
          hours,
        });
      }

      case 'suppression': {
        if (!checkPhone) {
          return NextResponse.json(
            { error: 'check_phone is required for suppression check' },
            { status: 400 }
          );
        }

        const suppressions = await checkSuppressionList(checkPhone, organizationId || undefined);

        return NextResponse.json({
          suppressions,
          is_suppressed: suppressions.length > 0,
          phone: checkPhone,
        });
      }

      case 'usage': {
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organization_id is required for usage check' },
            { status: 400 }
          );
        }

        const usage = await getSmsUsage(organizationId);

        // Calculate current period usage
        const currentPeriod = usage[0];
        const usagePercentage = currentPeriod
          ? Math.round((currentPeriod.sms_sent / currentPeriod.sms_limit) * 100)
          : 0;

        return NextResponse.json({
          usage,
          current_period: currentPeriod,
          usage_percentage: usagePercentage,
          is_over_limit: usagePercentage > 100,
        });
      }

      case 'error_codes': {
        return NextResponse.json({
          error_codes: TWILIO_ERROR_CODES,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    apiLogger.error({ msg: 'Error in GET /api/admin/support/sms', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get SMS data' },
      { status: 500 }
    );
  }
}
