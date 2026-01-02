// =====================================================
// ADMIN PAYOUT PROCESSING API - v5.9
// GET /api/admin/commissions/process-payouts - Get payout summary
// POST /api/admin/commissions/process-payouts - Process scheduled payouts
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import {
  getPayoutSummary,
  processScheduledPayouts,
  getUpcomingPayoutDates,
  isPayoutDate,
  formatPayoutDate,
  getPayoutDateISO,
} from '@/lib/admin/payout-scheduler';

/**
 * GET /api/admin/commissions/process-payouts
 * Get payout summary for a specific date or upcoming payouts
 *
 * Query params:
 * - date: ISO date string (YYYY-MM-DD) for specific payout date
 * - upcoming: "true" to get next 3 payout dates with summaries
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and finance roles can view payout information
    if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const upcoming = searchParams.get('upcoming') === 'true';

    if (upcoming) {
      // Get upcoming payout dates with summaries
      const payoutDates = getUpcomingPayoutDates(new Date());
      const summaries = await Promise.all(
        payoutDates.map(async (date) => ({
          date: getPayoutDateISO(date),
          formatted: formatPayoutDate(date),
          isToday: getPayoutDateISO(date) === getPayoutDateISO(new Date()),
          summary: await getPayoutSummary(date),
        }))
      );

      return NextResponse.json({
        upcomingPayouts: summaries,
        todayIsPayoutDate: isPayoutDate(new Date()),
      });
    }

    if (dateParam) {
      // Get summary for specific date
      const payoutDate = new Date(dateParam);
      if (isNaN(payoutDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      const summary = await getPayoutSummary(payoutDate);
      return NextResponse.json({
        date: getPayoutDateISO(payoutDate),
        formatted: formatPayoutDate(payoutDate),
        isValidPayoutDate: isPayoutDate(payoutDate),
        summary,
      });
    }

    // Default: return today's summary if it's a payout date, else next payout
    const today = new Date();
    const targetDate = isPayoutDate(today)
      ? today
      : getUpcomingPayoutDates(today)[0];

    const summary = await getPayoutSummary(targetDate);
    return NextResponse.json({
      date: getPayoutDateISO(targetDate),
      formatted: formatPayoutDate(targetDate),
      isToday: getPayoutDateISO(targetDate) === getPayoutDateISO(today),
      summary,
    });
  } catch (error: any) {
    console.error('Get payout summary error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payout summary' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/commissions/process-payouts
 * Process all eligible commissions for a payout date
 *
 * Body:
 * - date: ISO date string (YYYY-MM-DD) - required
 * - dryRun: boolean - if true, only returns what would be processed
 *
 * Headers:
 * - X-Cron-Secret: For automated cron job authentication (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret (for automated processing)
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedCronSecret = process.env.CRON_SECRET;

    let processedBy: string | undefined;

    if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
      // Cron job authentication
      processedBy = 'system:cron';
    } else {
      // Regular admin authentication
      const auth = await verifyAdminAuth(request);
      if (!auth.valid || !auth.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Only admin and finance roles can process payouts
      if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      processedBy = auth.user.id;
    }

    const body = await request.json();
    const { date, dryRun = false } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    const payoutDate = new Date(date);
    if (isNaN(payoutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate it's a valid payout date (1st or 15th)
    if (!isPayoutDate(payoutDate)) {
      return NextResponse.json(
        { error: 'Invalid payout date. Payouts only occur on 1st or 15th of the month' },
        { status: 400 }
      );
    }

    if (dryRun) {
      // Return summary of what would be processed
      const summary = await getPayoutSummary(payoutDate);
      return NextResponse.json({
        dryRun: true,
        date: getPayoutDateISO(payoutDate),
        formatted: formatPayoutDate(payoutDate),
        wouldProcess: summary,
      });
    }

    // Process the payouts
    const result = await processScheduledPayouts(payoutDate, processedBy);

    return NextResponse.json({
      success: true,
      date: getPayoutDateISO(payoutDate),
      formatted: formatPayoutDate(payoutDate),
      result: {
        processed: result.processed,
        failed: result.failed,
        totalAmountCents: result.totalAmountCents,
        totalAmountDollars: (result.totalAmountCents / 100).toFixed(2),
        commissionIds: result.commissionIds,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Process payouts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payouts' },
      { status: 500 }
    );
  }
}
