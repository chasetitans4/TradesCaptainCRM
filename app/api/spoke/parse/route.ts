// =====================================================
// SPOKE PARSING API
// POST /api/spoke/parse
//
// Per Spoke Spec v1.0:
// Parses transcribed text into structured CRM data.
// Called after transcription completes.
//
// Pipeline: Transcript → Tokenize → Normalize → Claude → Confidence
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { extractStructuredData } from '@/lib/spoke/parser';
import { PERFORMANCE_BUDGETS } from '@/lib/spoke/config';

const spokeLogger = smsLogger.child({ context: 'api.spoke.parse' });

// Internal service authentication
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify internal service auth
    const authHeader = request.headers.get('X-Internal-Secret');
    if (!INTERNAL_SECRET || authHeader !== INTERNAL_SECRET) {
      spokeLogger.warn({ msg: 'Unauthorized parse request' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { spokeUpdateId } = body;

    if (!spokeUpdateId) {
      return NextResponse.json(
        { error: 'Missing spokeUpdateId' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch the spoke update with transcript
    const { data: update, error: fetchError } = await supabase
      .from('spoke_updates')
      .select(`
        id,
        business_id,
        contractor_phone_id,
        raw_transcript,
        audio_quality_score,
        transcription_confidence,
        contractor_phones (
          id,
          display_name,
          business_id
        )
      `)
      .eq('id', spokeUpdateId)
      .single();

    if (fetchError || !update) {
      spokeLogger.error({
        msg: 'Failed to fetch spoke update',
        error: fetchError,
        spokeUpdateId,
      });
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    if (!update.raw_transcript) {
      spokeLogger.error({
        msg: 'No transcript available for parsing',
        spokeUpdateId,
      });
      return NextResponse.json({ error: 'No transcript' }, { status: 400 });
    }

    spokeLogger.info({
      msg: 'Starting parsing',
      spokeUpdateId,
      transcriptLength: update.raw_transcript.length,
    });

    // Fetch context for better extraction
    const context = await getExtractionContext(
      supabase,
      update.business_id,
      update.contractor_phone_id
    );

    // Extract structured data
    const extractionPromise = extractStructuredData(update.raw_transcript, {
      contractorId: update.contractor_phone_id,
      contractorName: (update.contractor_phones as any)?.display_name,
      businessId: update.business_id,
      recentCustomers: context.recentCustomers,
      recentJobs: context.recentJobs,
      audioQualityScore: update.audio_quality_score,
    });

    // Apply timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Parsing timeout'));
      }, PERFORMANCE_BUDGETS.PARSING_MS + 1000);
    });

    const result = await Promise.race([extractionPromise, timeoutPromise]);

    const parseLatency = Date.now() - startTime;

    if (!result.success) {
      spokeLogger.error({
        msg: 'Parsing failed',
        spokeUpdateId,
        error: result.error,
        latencyMs: parseLatency,
      });

      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'PARSING_FAILED',
          error_message: result.error || 'Unknown parsing error',
          parsing_completed_at: new Date().toISOString(),
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    spokeLogger.info({
      msg: 'Parsing successful',
      spokeUpdateId,
      confidence: result.confidence.overall,
      assessment: result.confidence.assessment,
      writeableFields: result.confidence.writeable,
      hadCorrections: result.hadCorrections,
      latencyMs: parseLatency,
    });

    // Build confidence scores object for storage
    const confidenceScores: Record<string, number> = {};
    for (const [field, data] of Object.entries(result.confidence.fields)) {
      if (data) {
        confidenceScores[field] = data.score;
      }
    }

    // Update the spoke_update with parsed data
    const { error: updateError } = await supabase
      .from('spoke_updates')
      .update({
        parsed_data: result.parsed,
        confidence_scores: confidenceScores,
        quality_score: result.confidence.overall,
        parsing_completed_at: new Date().toISOString(),
      })
      .eq('id', spokeUpdateId);

    if (updateError) {
      spokeLogger.error({
        msg: 'Failed to save parsed data',
        error: updateError,
        spokeUpdateId,
      });
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Trigger the matching pipeline (Phase 4)
    triggerMatchingPipeline(spokeUpdateId).catch((error) => {
      spokeLogger.error({
        msg: 'Matching pipeline trigger failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        spokeUpdateId,
      });
    });

    return NextResponse.json({
      status: 'parsed',
      spokeUpdateId,
      confidence: {
        overall: result.confidence.overall,
        assessment: result.confidence.assessment,
        writeable: result.confidence.writeable,
      },
      parsed: {
        hasStatus: !!result.parsed.status,
        hasPayment: !!result.parsed.payment,
        hasDuration: !!result.parsed.duration,
        hasNotes: !!result.parsed.notes,
        hasCustomer: !!result.parsed.customer,
      },
      latencyMs: parseLatency,
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    spokeLogger.error({
      msg: 'Error in parse endpoint',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      latencyMs,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get context for extraction (recent customers, jobs)
 */
async function getExtractionContext(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  contractorPhoneId: string | null
): Promise<{
  recentCustomers: string[];
  recentJobs: { customerName: string; serviceType: string }[];
}> {
  const result = {
    recentCustomers: [] as string[],
    recentJobs: [] as { customerName: string; serviceType: string }[],
  };

  try {
    // Get recent jobs for this business (today)
    const today = new Date().toISOString().split('T')[0];

    const { data: jobs } = await supabase
      .from('jobs')
      .select(`
        id,
        service_type,
        customers (
          name
        )
      `)
      .eq('business_id', businessId)
      .eq('scheduled_date', today)
      .in('status', ['scheduled', 'in_progress'])
      .limit(10);

    if (jobs) {
      for (const job of jobs) {
        const customerName = (job.customers as any)?.name;
        if (customerName) {
          result.recentCustomers.push(customerName);
          result.recentJobs.push({
            customerName,
            serviceType: job.service_type,
          });
        }
      }
    }

    // Dedupe customers
    result.recentCustomers = [...new Set(result.recentCustomers)];

  } catch (error) {
    spokeLogger.warn({
      msg: 'Failed to get extraction context',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Trigger the matching pipeline
 * Calls the /api/spoke/match endpoint
 */
async function triggerMatchingPipeline(spokeUpdateId: string): Promise<void> {
  const matchingLogger = smsLogger.child({ context: 'spoke.matching' });

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/spoke/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET || '',
      },
      body: JSON.stringify({ spokeUpdateId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Matching API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    matchingLogger.info({
      msg: 'Matching pipeline completed',
      spokeUpdateId,
      status: result.status,
      jobId: result.jobId,
      confidence: result.confidence,
    });

  } catch (error) {
    matchingLogger.error({
      msg: 'Matching pipeline failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      spokeUpdateId,
    });

    // Update spoke_update with failure
    const supabase = createAdminClient();
    await supabase
      .from('spoke_updates')
      .update({
        status: 'FAILED',
        error_code: 'MATCHING_TRIGGER_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown matching error',
      })
      .eq('id', spokeUpdateId);

    throw error;
  }
}
