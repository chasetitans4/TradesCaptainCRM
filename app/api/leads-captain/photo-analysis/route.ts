// =====================================================
// Leads Captain - Photo Analysis API
// Analyze customer-submitted photos of equipment/issues
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  executePhotoAnalyzer,
  analyzePhotoSet,
  quickPhotoAnalysisFromContext,
} from '@/lib/leads-captain/prompts/photo-analyzer';
import { PhotoAnalyzerInput } from '@/types/leads-captain/prompt-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout for image processing

/**
 * GET /api/leads-captain/photo-analysis
 * Retrieve previous photo analyses
 */
export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');

    const searchParams = request.nextUrl.searchParams;
    const configId = searchParams.get('configId');
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('leads_captain_photo_analysis')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: analyses, error } = await query;

    if (error) {
      jobLogger.error({
        msg: 'Failed to fetch photo analyses',
        configId,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analyses: analyses || [],
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Photo analysis GET failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads-captain/photo-analysis
 * Analyze a new photo
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await checkPermission('manage_leads_captain');

    const body = await request.json();
    const {
      configId,
      conversationId,
      imageUrl,
      imageBase64,
      contextMessage,
      analyzeMultiple, // For batch analysis
      images, // Array of images for batch
    } = body;

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    if (!imageUrl && !imageBase64 && !images) {
      return NextResponse.json(
        { error: 'imageUrl, imageBase64, or images array is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get config for business type
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

    const businessType = config.business_type || 'service';

    // Handle batch analysis
    if (analyzeMultiple && images && Array.isArray(images)) {
      const photoInputs: PhotoAnalyzerInput[] = images.map((img: { imageUrl?: string; imageBase64?: string; contextMessage?: string }) => ({
        imageUrl: img.imageUrl || '',
        imageBase64: img.imageBase64,
        businessType,
        contextMessage: img.contextMessage,
      }));

      const batchResult = await analyzePhotoSet(photoInputs, businessType);

      // Save each analysis
      for (let i = 0; i < batchResult.analyses.length; i++) {
        const analysis = batchResult.analyses[i];
        if (analysis.success && analysis.data) {
          await savePhotoAnalysis(
            supabase,
            configId,
            conversationId,
            images[i].imageUrl || 'base64-upload',
            analysis.data,
            analysis.tokensUsed
          );
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'batch',
        analyses: batchResult.analyses.map(a => a.data),
        overallAssessment: batchResult.overallAssessment,
        combinedUrgency: batchResult.combinedUrgency,
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Single photo analysis
    const input: PhotoAnalyzerInput = {
      imageUrl: imageUrl || '',
      imageBase64,
      businessType,
      contextMessage,
    };

    const result = await executePhotoAnalyzer(input);

    if (result.success && result.data) {
      // Save to database
      await savePhotoAnalysis(
        supabase,
        configId,
        conversationId,
        imageUrl || 'base64-upload',
        result.data,
        result.tokensUsed
      );
    }

    const processingTime = Date.now() - startTime;

    jobLogger.info({
      msg: 'Photo analysis completed',
      configId,
      conversationId,
      category: result.data?.category,
      urgency: result.data?.urgency,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: result.success,
      mode: 'single',
      analysis: result.data,
      error: result.error,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Photo analysis failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      processingTimeMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

/**
 * Save photo analysis to database
 */
async function savePhotoAnalysis(
  supabase: ReturnType<typeof createAdminClient>,
  configId: string,
  conversationId: string | null,
  imageUrl: string,
  analysis: NonNullable<Awaited<ReturnType<typeof executePhotoAnalyzer>>['data']>,
  tokensUsed: number
): Promise<void> {
  const { error } = await supabase
    .from('leads_captain_photo_analysis')
    .insert({
      config_id: configId,
      conversation_id: conversationId,
      image_url: imageUrl,
      category: analysis.category,
      summary: analysis.summary,
      detected_issues: analysis.detectedIssues,
      equipment: analysis.equipment,
      urgency: analysis.urgency,
      safety_warnings: analysis.safetyWarnings,
      recommended_actions: analysis.recommendedActions,
      estimated_service_type: analysis.estimatedServiceType,
      confidence: analysis.confidence,
      analyzed_at: new Date().toISOString(),
      model_used: 'claude-3-5-sonnet-20241022',
      tokens_used: tokensUsed,
    });

  if (error) {
    jobLogger.warn({
      msg: 'Failed to save photo analysis',
      configId,
      error: error.message,
    });
  }
}

/**
 * DELETE /api/leads-captain/photo-analysis
 * Delete photo analysis records
 */
export async function DELETE(request: NextRequest) {
  try {
    await checkPermission('manage_leads_captain');

    const searchParams = request.nextUrl.searchParams;
    const analysisId = searchParams.get('analysisId');
    const configId = searchParams.get('configId');
    const conversationId = searchParams.get('conversationId');

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (analysisId) {
      // Delete single analysis
      const { error } = await supabase
        .from('leads_captain_photo_analysis')
        .delete()
        .eq('id', analysisId)
        .eq('config_id', configId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to delete analysis' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Analysis deleted',
      });
    }

    if (conversationId) {
      // Delete all analyses for a conversation
      const { error } = await supabase
        .from('leads_captain_photo_analysis')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('config_id', configId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to delete analyses' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Conversation analyses deleted',
      });
    }

    return NextResponse.json(
      { error: 'analysisId or conversationId is required' },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
