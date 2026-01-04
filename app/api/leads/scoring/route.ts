import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
  getScoringRules,
  calculateLeadScore,
  trackLeadEngagement,
  getLeadEngagement,
  getHotLeads,
  getLeadsNeedingAttention,
  recalculateAllScores,
  getScoreDistribution,
} from '@/lib/leads/scoring';

// GET /api/leads/scoring - Get scoring data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const rules = searchParams.get('rules');
    const hot = searchParams.get('hot');
    const attention = searchParams.get('attention');
    const distribution = searchParams.get('distribution');
    const engagement = searchParams.get('engagement');

    // Get scoring rules
    if (rules === 'true') {
      const includeInactive = searchParams.get('includeInactive') === 'true';
      const scoringRules = await getScoringRules(userData.business_id, includeInactive);
      return NextResponse.json({ rules: scoringRules });
    }

    // Get hot leads
    if (hot === 'true') {
      const hotLeads = await getHotLeads(userData.business_id);
      return NextResponse.json({ leads: hotLeads });
    }

    // Get leads needing attention
    if (attention === 'true') {
      const leads = await getLeadsNeedingAttention(userData.business_id);
      return NextResponse.json({ leads });
    }

    // Get score distribution
    if (distribution === 'true') {
      const dist = await getScoreDistribution(userData.business_id);
      return NextResponse.json({ distribution: dist });
    }

    // Get engagement for a specific lead
    if (leadId && engagement === 'true') {
      const engagementData = await getLeadEngagement(leadId);
      return NextResponse.json({ engagement: engagementData });
    }

    // Get score for a specific lead
    if (leadId) {
      const score = await calculateLeadScore(leadId);
      return NextResponse.json({ score });
    }

    // Default: get scoring rules
    const scoringRules = await getScoringRules(userData.business_id);
    return NextResponse.json({ rules: scoringRules });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching scoring data',
      error,
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch scoring data' }, { status: 500 });
  }
}

// POST /api/leads/scoring - Scoring actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const { action, ruleId, leadId, ...data } = body;

    let result;

    switch (action) {
      case 'createRule':
        if (!data.name || !data.conditionType || !data.conditionOperator || !data.conditionValue) {
          return NextResponse.json(
            { error: 'Name, condition type, operator, and value are required' },
            { status: 400 }
          );
        }
        result = await createScoringRule(userData.business_id, data);
        break;

      case 'updateRule':
        if (!ruleId) {
          return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
        }
        result = await updateScoringRule(ruleId, data);
        break;

      case 'deleteRule':
        if (!ruleId) {
          return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
        }
        result = await deleteScoringRule(ruleId);
        break;

      case 'calculateScore':
        if (!leadId) {
          return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
        }
        const score = await calculateLeadScore(leadId);
        return NextResponse.json({ score });

      case 'trackEngagement':
        if (!leadId || !data.engagementType) {
          return NextResponse.json(
            { error: 'Lead ID and engagement type are required' },
            { status: 400 }
          );
        }
        result = await trackLeadEngagement(leadId, data.engagementType, data.metadata);
        break;

      case 'recalculateAll':
        const updated = await recalculateAllScores(userData.business_id);
        return NextResponse.json({ success: true, updated });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (result && !result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result || { success: true });
  } catch (error) {
    apiLogger.error({
      message: 'Error with scoring action',
      error,
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed with scoring action' }, { status: 500 });
  }
}
