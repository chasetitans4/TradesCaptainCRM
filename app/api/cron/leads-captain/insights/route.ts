// =====================================================
// Leads Captain - Insights Generation Cron
// Runs weekly to generate business insights
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/auth/cron-guard';
import {
  generateInsightsForBusiness,
  buildConversationSummary,
} from '@/lib/leads-captain/prompts/ai-insights-generator';
import { ConversationSummary } from '@/types/leads-captain/prompt-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute timeout for batch processing

/**
 * GET /api/cron/leads-captain/insights
 *
 * Cron endpoint for Vercel - runs weekly
 * Generates insights for all active businesses
 *
 * Cron configuration (add to vercel.json):
 * crons: [{ path: "/api/cron/leads-captain/insights", schedule: "0 6 * * 1" }]
 * (Runs at 6 AM every Monday)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Strict cron auth — fail-closed
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{ configId: string; error: string }>,
  };

  try {
    jobLogger.info({
      msg: 'Starting insights generation cron job',
    });

    // Get all active configs with the new orchestrator enabled
    const { data: configs, error: configError } = await supabase
      .from('leads_captain_config')
      .select('id, business_type')
      .eq('use_new_orchestrator', true)
      .eq('ai_enabled', true);

    if (configError) {
      throw new Error(`Failed to fetch configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      jobLogger.info({ msg: 'No active configs found for insights generation' });
      return NextResponse.json({
        success: true,
        message: 'No active configs',
        ...results,
        processingTimeMs: Date.now() - startTime,
      });
    }

    const periodDays = 7; // Weekly insights
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Process each config
    for (const config of configs) {
      try {
        // Check if insights were already generated this week
        const { data: existingInsights } = await supabase
          .from('leads_captain_insights')
          .select('id')
          .eq('config_id', config.id)
          .gte('generated_at', periodStart.toISOString())
          .limit(1);

        if (existingInsights && existingInsights.length > 0) {
          results.skipped++;
          continue;
        }

        // Get conversation analyses from the period
        const { data: analyses, error: analysesError } = await supabase
          .from('leads_captain_conversation_analysis')
          .select(`
            *,
            conversation:conversation_id (
              status,
              is_hot_lead
            )
          `)
          .eq('config_id', config.id)
          .gte('analyzed_at', periodStart.toISOString())
          .order('analyzed_at', { ascending: false });

        if (analysesError) {
          results.failed++;
          results.errors.push({
            configId: config.id,
            error: `Failed to fetch analyses: ${analysesError.message}`,
          });
          continue;
        }

        // Skip if no conversations to analyze
        if (!analyses || analyses.length === 0) {
          results.skipped++;
          continue;
        }

        // Build conversation summaries
        const summaries: ConversationSummary[] = analyses.map((analysis) =>
          buildConversationSummary(analysis, analysis.conversation)
        );

        // Generate insights
        const insights = await generateInsightsForBusiness(
          config.id,
          config.business_type || 'service',
          summaries,
          periodDays
        );

        // Save insights
        const periodEnd = new Date();
        const { error: insertError } = await supabase
          .from('leads_captain_insights')
          .insert({
            config_id: config.id,
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
          results.failed++;
          results.errors.push({
            configId: config.id,
            error: `Failed to save insights: ${insertError.message}`,
          });
        } else {
          results.processed++;
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          configId: config.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        jobLogger.error({
          msg: 'Error generating insights for config',
          configId: config.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const processingTime = Date.now() - startTime;

    jobLogger.info({
      msg: 'Insights cron job completed',
      processed: results.processed,
      failed: results.failed,
      skipped: results.skipped,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      ...results,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    jobLogger.error({
      msg: 'Insights cron job failed',
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...results,
      processingTimeMs: processingTime,
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/leads-captain/insights
 * Manual trigger for insights generation
 */
export async function POST(request: NextRequest) {
  // Strict cron auth — same guard for manual triggers
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const { configId, periodDays = 7 } = body;

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get config
    const { data: config, error: configError } = await supabase
      .from('leads_captain_config')
      .select('id, business_type')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Get conversation analyses
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
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 }
      );
    }

    if (!analyses || analyses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No conversations to analyze',
        insights: {
          insights: [],
          keyMetrics: {
            avgLeadQuality: 'warm',
            avgSentiment: 'neutral',
            topServices: [],
            topConcerns: [],
            conversionIndicators: 'stable',
          },
          executiveSummary: 'No conversations to analyze for this period.',
          generatedAt: new Date().toISOString(),
          periodDays,
          conversationsAnalyzed: 0,
        },
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Build summaries
    const summaries: ConversationSummary[] = analyses.map((analysis) =>
      buildConversationSummary(analysis, analysis.conversation)
    );

    // Generate insights
    const insights = await generateInsightsForBusiness(
      configId,
      config.business_type || 'service',
      summaries,
      periodDays
    );

    // Save insights
    const periodEnd = new Date();
    await supabase
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

    return NextResponse.json({
      success: true,
      insights,
      processingTimeMs: Date.now() - startTime,
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Manual insights generation failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
