// =====================================================
// PLANS API
// GET /api/pricing/plans - Get all plans with optional filtering
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_PLANS,
  ADDONS,
  getPlansByTrack,
  getPlanById,
  getTrackLabel,
  getTierLabel,
  isAddOnAvailableForPlan,
  type PlanTrack,
} from '@/lib/pricing/plans';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const track = searchParams.get('track') as PlanTrack | null;
    const planId = searchParams.get('plan_id');
    const includeAddons = searchParams.get('include_addons') === 'true';

    // Get specific plan
    if (planId) {
      const plan = getPlanById(planId);
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      const response: { plan: typeof plan; available_addons?: typeof ADDONS } = { plan };

      if (includeAddons) {
        response.available_addons = ADDONS.filter(addon =>
          isAddOnAvailableForPlan(addon.id, planId)
        );
      }

      return NextResponse.json(response);
    }

    // Get plans by track or all
    let plans = track ? getPlansByTrack(track) : ALL_PLANS.filter(p => p.is_active);

    // Group by track for easier UI rendering
    const tracks = ['blue', 'web', 'seo', 'gold'] as PlanTrack[];
    const plansByTrack = tracks.reduce((acc, t) => {
      acc[t] = {
        label: getTrackLabel(t),
        plans: getPlansByTrack(t),
      };
      return acc;
    }, {} as Record<PlanTrack, { label: string; plans: typeof plans }>);

    const response = {
      plans,
      plans_by_track: plansByTrack,
      addons: includeAddons ? ADDONS : undefined,
      meta: {
        total_plans: ALL_PLANS.filter(p => p.is_active).length,
        tracks: tracks.map(t => ({ id: t, label: getTrackLabel(t) })),
        tiers: ['starter', 'pro', 'enterprise', 'custom'].map(t => ({
          id: t,
          label: getTierLabel(t as any),
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching plans' });
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
