// =====================================================
// CLIENT REVENUE RECOVERY SUMMARY API
// GET /api/revenue-recovery/summary
// Returns recovery stats, coverage, opportunities, and activity
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const period = searchParams.get('period') || '30d';

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Verify portal session (JWT-based auth for customer portal)
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the requested businessId matches the session
    if (session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client since portal users don't have Supabase auth
    const supabase = createAdminClient();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 90 Days';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = 'Year to Date';
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 30 Days';
    }

    // Get business organization ID
    const { data: business } = await supabase
      .from('businesses')
      .select('organization_id')
      .eq('id', businessId)
      .single();

    if (!business?.organization_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const orgId = business.organization_id;

    // Get revenue attributions for the period
    const { data: attributions } = await supabase
      .from('revenue_attributions')
      .select('*')
      .eq('organization_id', orgId)
      .gte('trigger_at', startDate.toISOString());

    // Get recovery settings
    const { data: settings } = await supabase
      .from('client_recovery_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    // Calculate summary stats
    const totalRevenue = attributions?.reduce((sum, a) => {
      const amount = a.confidence === 'high'
        ? a.revenue_amount_cents
        : Math.round(a.revenue_amount_cents * 0.7);
      return sum + amount;
    }, 0) || 0;

    const missedCallsRecovered = attributions?.filter(
      a => a.trigger_type === 'missed_call' && a.outcome_id
    ).length || 0;

    const afterHoursConverted = attributions?.filter(
      a => a.trigger_type === 'after_hours' && a.outcome_id
    ).length || 0;

    const estimateFollowupsConverted = attributions?.filter(
      a => a.trigger_type === 'estimate_followup' && a.outcome_id
    ).length || 0;

    const totalAttempts = attributions?.length || 0;
    const successfulRecoveries = attributions?.filter(a => a.outcome_id).length || 0;
    const recoveryRate = totalAttempts > 0
      ? (successfulRecoveries / totalAttempts) * 100
      : 0;

    // Get recent opportunities (pending attributions)
    const { data: opportunities } = await supabase
      .from('revenue_attributions')
      .select('*')
      .eq('organization_id', orgId)
      .is('outcome_id', null)
      .order('trigger_at', { ascending: false })
      .limit(10);

    // Build coverage status based on settings
    const coverage = {
      missedCalls: {
        enabled: settings?.recovery_enabled ?? true,
        lastTriggered: attributions?.find(a => a.trigger_type === 'missed_call')?.trigger_at || null,
      },
      afterHours: {
        enabled: settings?.recovery_enabled ?? true,
        lastTriggered: attributions?.find(a => a.trigger_type === 'after_hours')?.trigger_at || null,
      },
      estimateFollowups: {
        enabled: settings?.recovery_enabled ?? true,
        lastTriggered: attributions?.find(a => a.trigger_type === 'estimate_followup')?.trigger_at || null,
      },
      noShows: {
        enabled: settings?.recovery_enabled ?? true,
        lastTriggered: attributions?.find(a => a.trigger_type === 'no_show')?.trigger_at || null,
      },
    };

    // Map opportunities to client format
    const mappedOpportunities = (opportunities || []).map(opp => ({
      id: opp.id,
      type: opp.trigger_type,
      customerName: 'Customer', // Would need to join with contacts
      timestamp: opp.trigger_at,
      status: opp.outcome_id ? 'converted' : opp.action_id ? 'sent' : 'pending',
      estimatedValue: opp.revenue_amount_cents / 100,
    }));

    // Get recent activity (completed attributions)
    const { data: recentActivity } = await supabase
      .from('revenue_attributions')
      .select('*')
      .eq('organization_id', orgId)
      .not('outcome_id', 'is', null)
      .order('outcome_at', { ascending: false })
      .limit(10);

    const mappedActivity = (recentActivity || []).map(act => ({
      id: act.id,
      type: act.trigger_type,
      description: `${act.trigger_type.replace('_', ' ')} converted to booking`,
      timestamp: act.outcome_at || act.action_at,
      outcome: 'success' as const,
      revenue: act.revenue_amount_cents / 100,
    }));

    return NextResponse.json({
      summary: {
        influencedRevenue: totalRevenue / 100,
        periodLabel,
        recoveryRate,
        missedCallsRecovered,
        afterHoursConverted,
        estimateFollowupsConverted,
      },
      coverage,
      opportunities: mappedOpportunities,
      recentActivity: mappedActivity,
      settings: {
        recoveryEnabled: settings?.recovery_enabled ?? true,
        canDisable: settings?.client_can_disable ?? true,
        isLocked: settings?.recovery_locked ?? false,
      },
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Revenue recovery summary error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch recovery summary' },
      { status: 500 }
    );
  }
}
