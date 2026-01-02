// =====================================================
// Leads Captain v2 Analytics API
// GET /api/nevermiss/v2/analytics - Get analytics overview
// GET /api/nevermiss/v2/analytics?type=rules - Get rule analytics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { canAccessFeature } from '@/lib/nevermiss/v2/features';
import type { AnalyticsOverviewResponse, RuleAnalyticsResponse } from '@/types/nevermiss';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check feature access
    const hasAccess = await canAccessFeature(profile.business_id, 'analytics');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Analytics not available on your plan. Upgrade to access.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '30');

    // Get config
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (type === 'rules') {
      return NextResponse.json(await getRuleAnalytics(supabase, config.id, startDate));
    }

    return NextResponse.json(await getOverviewAnalytics(supabase, config.id, startDate, days));
  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics(
  supabase: ReturnType<typeof createAdminClient>,
  configId: string,
  startDate: Date,
  days: number
): Promise<AnalyticsOverviewResponse> {
  const startDateStr = startDate.toISOString();
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - days);

  // Get conversation counts
  const { count: totalConversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .gte('started_at', startDateStr);

  const { count: activeConversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .eq('status', 'active')
    .gte('started_at', startDateStr);

  const { count: humanTakeoverConversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .eq('status', 'human_takeover')
    .gte('started_at', startDateStr);

  const { count: closedConversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .eq('status', 'closed')
    .gte('started_at', startDateStr);

  // Previous period for comparison
  const { count: previousTotalConversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .gte('started_at', previousStartDate.toISOString())
    .lt('started_at', startDateStr);

  const changePercent = previousTotalConversations
    ? Math.round(((totalConversations || 0) - previousTotalConversations) / previousTotalConversations * 100)
    : 0;

  // Get message counts
  const { data: messageStats } = await supabase
    .from('nevermiss_messages_v2')
    .select('direction, ai_used, template_used')
    .eq('conversation_id', configId);

  // This query won't work as intended - we need to join through conversations
  // For now, get all messages for conversations in this config
  const { data: conversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('id')
    .eq('config_id', configId)
    .gte('started_at', startDateStr);

  const conversationIds = (conversations || []).map(c => c.id);

  let totalMessages = 0;
  let inboundMessages = 0;
  let outboundMessages = 0;
  let aiGeneratedMessages = 0;
  let templateUsedMessages = 0;

  if (conversationIds.length > 0) {
    const { data: messages } = await supabase
      .from('nevermiss_messages_v2')
      .select('direction, ai_used, template_used')
      .in('conversation_id', conversationIds);

    totalMessages = messages?.length || 0;
    inboundMessages = messages?.filter(m => m.direction === 'inbound').length || 0;
    outboundMessages = messages?.filter(m => m.direction === 'outbound').length || 0;
    aiGeneratedMessages = messages?.filter(m => m.ai_used).length || 0;
    templateUsedMessages = messages?.filter(m => m.template_used).length || 0;
  }

  // Get lead stats
  const { count: hotLeads } = await supabase
    .from('nevermiss_conversations_v2')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .eq('is_hot_lead', true)
    .gte('started_at', startDateStr);

  // Get intent distribution
  const { data: intentData } = await supabase
    .from('nevermiss_conversations_v2')
    .select('initial_intent')
    .eq('config_id', configId)
    .gte('started_at', startDateStr)
    .not('initial_intent', 'is', null);

  const intentCounts: Record<string, number> = {};
  for (const conv of intentData || []) {
    if (conv.initial_intent) {
      intentCounts[conv.initial_intent] = (intentCounts[conv.initial_intent] || 0) + 1;
    }
  }

  const totalIntentCount = Object.values(intentCounts).reduce((a, b) => a + b, 0);
  const intents = Object.entries(intentCounts)
    .map(([intent_code, count]) => ({
      intent_code,
      count,
      percentage: Math.round(count / totalIntentCount * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    period: {
      start: startDateStr,
      end: new Date().toISOString(),
    },
    conversations: {
      total: totalConversations || 0,
      active: activeConversations || 0,
      human_takeover: humanTakeoverConversations || 0,
      closed: closedConversations || 0,
      change_percent: changePercent,
    },
    messages: {
      total: totalMessages,
      inbound: inboundMessages,
      outbound: outboundMessages,
      ai_generated: aiGeneratedMessages,
      template_used: templateUsedMessages,
    },
    leads: {
      total: totalConversations || 0,
      hot_leads: hotLeads || 0,
      converted: 0, // Would need CRM integration
      conversion_rate: 0,
    },
    response_metrics: {
      avg_response_time_seconds: 0, // Would need message timestamps analysis
      ai_confidence_avg: 0,
      approval_rate: 0,
    },
    intents,
  };
}

async function getRuleAnalytics(
  supabase: ReturnType<typeof createAdminClient>,
  configId: string,
  startDate: Date
): Promise<RuleAnalyticsResponse> {
  const startDateStr = startDate.toISOString();

  // Get all rules
  const { data: rules } = await supabase
    .from('nevermiss_rules')
    .select('id, name')
    .eq('config_id', configId);

  // Get conversations for this config
  const { data: conversations } = await supabase
    .from('nevermiss_conversations_v2')
    .select('id')
    .eq('config_id', configId)
    .gte('started_at', startDateStr);

  const conversationIds = (conversations || []).map(c => c.id);

  // Get rule hit counts from messages
  const ruleStats: Array<{
    rule_id: string;
    rule_name: string;
    hits: number;
    hit_rate: number;
    avg_confidence: number;
    last_hit: string | null;
  }> = [];

  for (const rule of rules || []) {
    if (conversationIds.length === 0) {
      ruleStats.push({
        rule_id: rule.id,
        rule_name: rule.name,
        hits: 0,
        hit_rate: 0,
        avg_confidence: 0,
        last_hit: null,
      });
      continue;
    }

    const { data: ruleMessages, count } = await supabase
      .from('nevermiss_messages_v2')
      .select('ai_confidence, created_at', { count: 'exact' })
      .in('conversation_id', conversationIds)
      .eq('rule_matched', rule.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const hits = count || 0;
    const totalMessages = conversationIds.length; // Approximation
    const avgConfidence = ruleMessages?.length
      ? Math.round(ruleMessages.reduce((sum, m) => sum + (m.ai_confidence || 0), 0) / ruleMessages.length)
      : 0;

    ruleStats.push({
      rule_id: rule.id,
      rule_name: rule.name,
      hits,
      hit_rate: totalMessages > 0 ? Math.round(hits / totalMessages * 100) : 0,
      avg_confidence: avgConfidence,
      last_hit: ruleMessages?.[0]?.created_at || null,
    });
  }

  return {
    rules: ruleStats.sort((a, b) => b.hits - a.hits),
    period: {
      start: startDateStr,
      end: new Date().toISOString(),
    },
  };
}
