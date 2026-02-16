// =====================================================
// SPOKE MATCHING API
// POST /api/spoke/match
//
// Per Spoke Spec Section 6:
// Match a parsed voice update to the correct job.
//
// Called internally after parsing completes.
// Uses signal stack: GPS, schedule, name, last-viewed
//
// Beta Constraint: No route prediction
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { MATCHING_CONFIG } from '@/lib/spoke/config';
import {
  calculateCompositeMatch,
  detectMultipleJobs,
  sendClarificationSms,
  generateMultiJobClarificationMessage,
} from '@/lib/spoke/matching';

const matchLogger = smsLogger.child({ context: 'api.spoke.match' });

// Internal service authentication
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify internal service auth
    const authHeader = request.headers.get('X-Internal-Secret');
    if (!INTERNAL_SECRET || authHeader !== INTERNAL_SECRET) {
      matchLogger.warn({ msg: 'Unauthorized matching request' });
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

    matchLogger.info({
      msg: 'Starting job matching',
      spokeUpdateId,
    });

    const supabase = createAdminClient();

    // Fetch the spoke update with parsed data
    const { data: spokeUpdate, error: fetchError } = await supabase
      .from('spoke_updates')
      .select(`
        id,
        business_id,
        contractor_phone_id,
        raw_transcript,
        parsed_data,
        confidence_scores,
        status,
        contractor_phones (
          id,
          phone_number,
          display_name
        )
      `)
      .eq('id', spokeUpdateId)
      .single();

    if (fetchError || !spokeUpdate) {
      matchLogger.error({
        msg: 'Spoke update not found',
        spokeUpdateId,
        error: fetchError,
      });
      return NextResponse.json(
        { error: 'Spoke update not found' },
        { status: 404 }
      );
    }

    const parsedData = spokeUpdate.parsed_data as any;
    const transcript = spokeUpdate.raw_transcript || '';
    const contractorPhone = (spokeUpdate.contractor_phones as any)?.phone_number;

    // Step 1: Check for multi-job detection
    // Per Beta Constraint: Detection only, create DRAFT if multi-job
    const multiJobResult = detectMultipleJobs(transcript);

    if (multiJobResult.isMultiJob) {
      matchLogger.info({
        msg: 'Multi-job detected',
        spokeUpdateId,
        jobCount: multiJobResult.jobCount,
        confidence: multiJobResult.confidence,
      });

      // Create DRAFT and send clarification
      await supabase
        .from('spoke_updates')
        .update({
          status: 'DRAFT',
          needs_clarification: true,
          clarification_type: 'MULTI_JOB',
          match_signals: {
            multiJobDetected: true,
            jobCount: multiJobResult.jobCount,
            evidence: multiJobResult.evidence,
          },
        })
        .eq('id', spokeUpdateId);

      // Get candidate jobs for clarification
      const { data: candidateJobs } = await supabase
        .from('jobs')
        .select(`
          id,
          customers!inner (name)
        `)
        .eq('business_id', spokeUpdate.business_id)
        .in('status', ['SCHEDULED', 'IN_PROGRESS'])
        .limit(4);

      const clarificationMessage = generateMultiJobClarificationMessage(
        multiJobResult.segments,
        candidateJobs?.map(j => ({
          jobId: j.id,
          customerName: (j.customers as any).name,
        }))
      );

      // Create draft record
      await supabase
        .from('spoke_drafts')
        .insert({
          spoke_update_id: spokeUpdateId,
          business_id: spokeUpdate.business_id,
          clarification_options: clarificationMessage.options,
          clarification_sent_at: new Date().toISOString(),
        });

      // Send clarification SMS
      if (contractorPhone) {
        const { sendSMS } = await import('@/lib/twilio/sms');
        await sendSMS({
          to: contractorPhone,
          body: clarificationMessage.message,
          businessId: spokeUpdate.business_id,
        });
      }

      return NextResponse.json({
        status: 'DRAFT',
        reason: 'multi_job_detected',
        jobCount: multiJobResult.jobCount,
        clarificationSent: !!contractorPhone,
        latencyMs: Date.now() - startTime,
      });
    }

    // Step 2: Calculate composite match score
    const matchResult = await calculateCompositeMatch(
      spokeUpdate.business_id,
      spokeUpdate.contractor_phone_id,
      {
        customerName: parsedData?.customer?.name,
        customerConfidence: parsedData?.customer?.confidence,
        status: parsedData?.status?.value,
      },
      transcript
    );

    // Step 3: Handle match result
    if (matchResult.matchedJob && matchResult.meetsThreshold && !matchResult.isAmbiguous) {
      // High confidence match - assign job
      matchLogger.info({
        msg: 'Job matched with high confidence',
        spokeUpdateId,
        jobId: matchResult.matchedJob.jobId,
        confidence: matchResult.confidence,
      });

      await supabase
        .from('spoke_updates')
        .update({
          job_id: matchResult.matchedJob.jobId,
          status: 'MATCHED',
          match_signals: matchResult.matchSignals,
          match_confidence: matchResult.confidence,
        })
        .eq('id', spokeUpdateId);

      // Trigger confirmation flow
      triggerConfirmationPipeline(spokeUpdateId).catch(error => {
        matchLogger.error({
          msg: 'Confirmation pipeline trigger failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          spokeUpdateId,
        });
      });

      return NextResponse.json({
        status: 'MATCHED',
        jobId: matchResult.matchedJob.jobId,
        customerName: matchResult.matchedJob.customerName,
        confidence: matchResult.confidence,
        signals: matchResult.matchSignals,
        explanation: matchResult.explanation,
        latencyMs: Date.now() - startTime,
      });
    }

    // Low confidence or ambiguous - create DRAFT and send clarification
    matchLogger.info({
      msg: 'Match needs clarification',
      spokeUpdateId,
      confidence: matchResult.confidence,
      isAmbiguous: matchResult.isAmbiguous,
      hasMatch: !!matchResult.matchedJob,
    });

    if (contractorPhone) {
      await sendClarificationSms({
        spokeUpdateId,
        contractorPhone,
        matchResult,
        transcript,
      });
    } else {
      // No phone, just mark as draft
      await supabase
        .from('spoke_updates')
        .update({
          status: 'DRAFT',
          needs_clarification: true,
          clarification_type: matchResult.isAmbiguous ? 'AMBIGUOUS_MATCH' : 'LOW_CONFIDENCE',
          match_signals: matchResult.matchSignals,
          match_confidence: matchResult.confidence,
        })
        .eq('id', spokeUpdateId);
    }

    return NextResponse.json({
      status: 'DRAFT',
      reason: matchResult.isAmbiguous ? 'ambiguous_match' : 'low_confidence',
      confidence: matchResult.confidence,
      candidateCount: matchResult.alternatives.length + (matchResult.matchedJob ? 1 : 0),
      clarificationSent: !!contractorPhone,
      latencyMs: Date.now() - startTime,
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    matchLogger.error({
      msg: 'Error in matching endpoint',
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error' },
      latencyMs,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Trigger confirmation SMS pipeline
 */
async function triggerConfirmationPipeline(spokeUpdateId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/spoke/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET || '',
    },
    body: JSON.stringify({ spokeUpdateId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Confirmation API returned ${response.status}: ${errorText}`);
  }
}
