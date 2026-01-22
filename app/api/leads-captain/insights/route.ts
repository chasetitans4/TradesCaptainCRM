// =====================================================
// Leads Captain - Insights API
// Generate and retrieve AI business insights
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  generateInsightsForBusiness,
  buildConversationSummary,
} from '@/lib/leads-captain/prompts/ai-insights-generator';
import { ConversationSummary } from '@/types/leads-captain/prompt-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/leads-captain/insights
 * Retrieve existing insights for a business
 */
export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');

    const searchParams = request.nextUrl.searchParams;
    const configId = searchParams.get('configId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get recent insights
    const { data: insights, error } = await supabase
      .from('leads_captain_insights')
      .select('*')
      .eq('config_id', configId)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) {
      jobLogger.error({
        msg: 'Failed to fetch insights',
        configId,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      insights: insights || [],
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Insights GET failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads-captain/insights
 * Generate new insights for a business
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await checkPermission('manage_leads_captain');

    const body = await request.json();
    const {
      configId,
      periodDays = 7,
    } = body;

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get config to determine business type
    const { data: config, error: configError } = await supabase
      .from('leads_captain_config')
      .select('business_type')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    // Get conversation analyses from the period
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const { data: analyses, error: analysesError } = await supabase
      .from('leads_captain_conversation_analysis')
      .select(`
        *,
        conversation:conversation_id (
          status,
          is_hot_lead
        )
      `)
      .eq('config_id', configId)
      .gte('analyzed_at', periodStart.toISOString())
      .order('analyzed_at', { ascending: false });

    if (analysesError) {
      jobLogger.error({
        msg: 'Failed to fetch analyses for insights',
        configId,
        error: analysesError.message,
      });
      return NextResponse.json(
        { error: 'Failed to fetch conversation data' },
        { status: 500 }
      );
    }

    // Build conversation summaries
    const summaries: ConversationSummary[] = (analyses || []).map((analysis) =>
      buildConversationSummary(analysis, analysis.conversation)
    );

    // Generate insights
    const insights = await generateInsightsForBusiness(
      configId,
      config.business_type || 'service',
      summaries,
      periodDays
    );

    // Save insights to database
    const periodEnd = new Date();
    const { error: insertError } = await supabase
      .from('leads_captain_insights')
      .insert({
        config_id: configId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        insights: insights.insights,
        key_metrics: insights.keyMetrics,
        executive_summary: insights.executiveSummary,
        conversations_analyzed: insights.conversationsAnalyzed,
        generated_at: insights.generatedAt,
        model_used: 'claude-3-5-sonnet-20241022',
      });

    if (insertError) {
      jobLogger.error({
        msg: 'Failed to save insights',
        configId,
        error: insertError.message,
      });
      // Continue anyway - return insights even if save failed
    }

    const processingTime = Date.now() - startTime;

    jobLogger.info({
      msg: 'Generated insights',
      configId,
      periodDays,
      conversationsAnalyzed: insights.conversationsAnalyzed,
      insightsCount: insights.insights.length,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      insights,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Insights generation failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
