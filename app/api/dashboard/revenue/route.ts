// =====================================================
// DASHBOARD REVENUE API
// GET /api/dashboard/revenue - Get revenue metrics for dashboard
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

interface RevenueMetrics {
  mtd: {
    collected: number;
    invoiced: number;
    outstanding: number;
  };
  ytd: {
    collected: number;
    invoiced: number;
  };
  lastMonth: {
    collected: number;
    invoiced: number;
  };
  comparison: {
    mtdVsLastMonth: number; // percentage change
    ytdVsLastYear: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and admins can view revenue
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date();

    // Date boundaries
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // MTD: First day of current month to now
    const mtdStart = new Date(currentYear, currentMonth, 1);

    // Last month: Full previous month
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // YTD: January 1st of current year to now
    const ytdStart = new Date(currentYear, 0, 1);

    // Last year same period (for comparison)
    const lastYtdStart = new Date(currentYear - 1, 0, 1);
    const lastYtdEnd = new Date(currentYear - 1, currentMonth, now.getDate(), 23, 59, 59, 999);

    // Get MTD invoiced amount (total of all invoices created this month)
    const { data: mtdInvoices } = await supabase
      .from('invoices')
      .select('total, status')
      .eq('business_id', profile.business_id)
      .gte('created_at', mtdStart.toISOString())
      .lte('created_at', now.toISOString());

    // Get MTD collected (paid invoices this month - by paid_at date)
    const { data: mtdPaid } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .eq('status', 'paid')
      .gte('paid_at', mtdStart.toISOString())
      .lte('paid_at', now.toISOString());

    // Get MTD outstanding (unpaid invoices - sent or past due)
    const { data: mtdOutstanding } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .in('status', ['sent', 'pending'])
      .gte('created_at', mtdStart.toISOString());

    // Get last month stats
    const { data: lastMonthInvoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString());

    const { data: lastMonthPaid } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .eq('status', 'paid')
      .gte('paid_at', lastMonthStart.toISOString())
      .lte('paid_at', lastMonthEnd.toISOString());

    // Get YTD stats
    const { data: ytdInvoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .gte('created_at', ytdStart.toISOString())
      .lte('created_at', now.toISOString());

    const { data: ytdPaid } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .eq('status', 'paid')
      .gte('paid_at', ytdStart.toISOString())
      .lte('paid_at', now.toISOString());

    // Get last year YTD for comparison
    const { data: lastYtdPaid } = await supabase
      .from('invoices')
      .select('total')
      .eq('business_id', profile.business_id)
      .eq('status', 'paid')
      .gte('paid_at', lastYtdStart.toISOString())
      .lte('paid_at', lastYtdEnd.toISOString());

    // Calculate totals
    const sumTotals = (data: { total: number }[] | null): number => {
      if (!data) return 0;
      return data.reduce((sum, inv) => sum + (inv.total || 0), 0);
    };

    const mtdCollected = sumTotals(mtdPaid);
    const mtdInvoiced = sumTotals(mtdInvoices);
    const mtdOutstandingAmount = sumTotals(mtdOutstanding);
    const lastMonthCollected = sumTotals(lastMonthPaid);
    const lastMonthInvoiced = sumTotals(lastMonthInvoices);
    const ytdCollected = sumTotals(ytdPaid);
    const ytdInvoiced = sumTotals(ytdInvoices);
    const lastYtdCollected = sumTotals(lastYtdPaid);

    // Calculate comparisons (percentage change)
    const mtdVsLastMonth = lastMonthCollected > 0
      ? Math.round(((mtdCollected - lastMonthCollected) / lastMonthCollected) * 100)
      : mtdCollected > 0 ? 100 : 0;

    const ytdVsLastYear = lastYtdCollected > 0
      ? Math.round(((ytdCollected - lastYtdCollected) / lastYtdCollected) * 100)
      : ytdCollected > 0 ? 100 : 0;

    const metrics: RevenueMetrics = {
      mtd: {
        collected: mtdCollected,
        invoiced: mtdInvoiced,
        outstanding: mtdOutstandingAmount,
      },
      ytd: {
        collected: ytdCollected,
        invoiced: ytdInvoiced,
      },
      lastMonth: {
        collected: lastMonthCollected,
        invoiced: lastMonthInvoiced,
      },
      comparison: {
        mtdVsLastMonth,
        ytdVsLastYear,
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    apiLogger.error({ error, context: 'dashboard revenue API' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
