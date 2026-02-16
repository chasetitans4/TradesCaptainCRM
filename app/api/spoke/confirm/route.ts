// =====================================================
// SPOKE CONFIRMATION API
// POST /api/spoke/confirm
//
// Per Spoke Spec Section 8:
// Send confirmation SMS after job is matched and data extracted.
//
// Called internally after matching completes.
// Target: <30 seconds from hang-up
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { sendSMS } from '@/lib/twilio/sms';
import {
  buildConfirmationMessage,
  buildPartialConfirmation,
  parsedToConfirmation,
  compressMessage,
} from '@/lib/spoke/confirmation';
import type { SpokeParsedData } from '@/lib/spoke/types';
import { getConfidenceThresholds } from '@/lib/spoke/config';

const confirmLogger = smsLogger.child({ context: 'api.spoke.confirm' });

// Internal service authentication
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify internal service auth
    const authHeader = request.headers.get('X-Internal-Secret');
    if (!INTERNAL_SECRET || authHeader !== INTERNAL_SECRET) {
      confirmLogger.warn({ msg: 'Unauthorized confirmation request' });
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

    confirmLogger.info({
      msg: 'Starting confirmation',
      spokeUpdateId,
    });

    const supabase = createAdminClient();

    // Fetch spoke update with related data
    const { data: spokeUpdate, error: fetchError } = await supabase
      .from('spoke_updates')
      .select(`
        id,
        job_id,
        parsed_data,
        confidence_scores,
        match_confidence,
        status,
        contractor_phones (
          id,
          phone_number,
          display_name
        ),
        jobs (
          id,
          organization_id,
          service_type,
          customers (
            name
          )
        )
      `)
      .eq('id', spokeUpdateId)
      .single();

    if (fetchError || !spokeUpdate) {
      confirmLogger.error({
        msg: 'Spoke update not found',
        spokeUpdateId,
        error: fetchError,
      });
      return NextResponse.json(
        { error: 'Spoke update not found' },
        { status: 404 }
      );
    }

    const contractorPhone = (spokeUpdate.contractor_phones as any)?.phone_number;
    if (!contractorPhone) {
      confirmLogger.error({
        msg: 'No contractor phone for confirmation',
        spokeUpdateId,
      });
      return NextResponse.json(
        { error: 'No contractor phone' },
        { status: 400 }
      );
    }

    const parsedData = spokeUpdate.parsed_data as SpokeParsedData;
    const customerName = (spokeUpdate.jobs as any)?.customers?.name || 'Unknown';
    const serviceType = (spokeUpdate.jobs as any)?.service_type;

    // Check what fields meet confidence thresholds and can be written
    const confidenceScores = spokeUpdate.confidence_scores as Record<string, number>;
    const missingFields: string[] = [];

    // Check payment confidence
    if (parsedData.payment) {
      const paymentConf = confidenceScores?.payment || parsedData.payment.confidence;
      if (paymentConf < getConfidenceThresholds().payment) {
        missingFields.push('payment');
      }
    } else {
      // No payment detected - might want to follow up
      // But don't mark as missing unless job typically has payment
    }

    // Check status confidence
    if (parsedData.status) {
      const statusConf = confidenceScores?.status || parsedData.status.confidence;
      if (statusConf < getConfidenceThresholds().status) {
        missingFields.push('status');
      }
    }

    // Build confirmation message
    const confirmationData = parsedToConfirmation(
      parsedData,
      customerName,
      serviceType
    );

    let template;
    if (missingFields.length > 0) {
      template = buildPartialConfirmation(confirmationData, missingFields);
    } else {
      template = buildConfirmationMessage(confirmationData, {
        includeEditPrompt: true,
        maxLength: 160,
      });
    }

    // Compress if needed
    let finalMessage = template.message;
    if (template.message.length > 160) {
      const compressed = compressMessage(template.message, 160);
      finalMessage = compressed.message;
    }

    // Send confirmation SMS
    const businessId = (spokeUpdate.jobs as any)?.organization_id;
    
    if (!businessId) {
      confirmLogger.error({
        msg: 'No business ID found for job',
        spokeUpdateId,
        jobId: spokeUpdate.job_id,
      });
      return NextResponse.json(
        { error: 'Business ID not found' },
        { status: 400 }
      );
    }

    const smsResult = await sendSMS({
      to: contractorPhone,
      body: finalMessage,
      businessId,
    });

    if (!smsResult.success) {
      confirmLogger.error({
        msg: 'Failed to send confirmation SMS',
        error: smsResult.error,
        spokeUpdateId,
        contractorPhone,
      });

      // Update status to indicate SMS failure
      await supabase
        .from('spoke_updates')
        .update({
          status: 'PROCESSED', // Still processed, just no SMS
          confirmation_sent_at: null,
          error_message: `SMS failed: ${smsResult.error}`,
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({
        status: 'processed_no_sms',
        error: smsResult.error,
        latencyMs: Date.now() - startTime,
      });
    }

    // Update spoke_update status
    await supabase
      .from('spoke_updates')
      .update({
        status: 'CONFIRMED',
        confirmation_sent_at: new Date().toISOString(),
      })
      .eq('id', spokeUpdateId);

    // Write to job if confidence is sufficient
    if (spokeUpdate.job_id && missingFields.length === 0) {
      await writeToJob(
        supabase,
        spokeUpdate.job_id,
        parsedData,
        spokeUpdateId
      );
    }

    const latencyMs = Date.now() - startTime;

    confirmLogger.info({
      msg: 'Confirmation sent',
      spokeUpdateId,
      contractorPhone,
      messageLength: finalMessage.length,
      segmentCount: template.segmentCount,
      templateType: template.templateType,
      latencyMs,
    });

    return NextResponse.json({
      status: 'confirmed',
      spokeUpdateId,
      messageLength: finalMessage.length,
      segmentCount: template.segmentCount,
      missingFields,
      latencyMs,
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    confirmLogger.error({
      msg: 'Error in confirmation endpoint',
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
 * Write extracted data to job record
 */
async function writeToJob(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  parsedData: SpokeParsedData,
  spokeUpdateId: string
): Promise<void> {
  const updates: Record<string, any> = {};

  // Status
  if (parsedData.status?.value === 'complete') {
    updates.status = 'COMPLETED';
    updates.completed_at = new Date().toISOString();
  } else if (parsedData.status?.value === 'issue') {
    updates.status = 'ISSUE';
  } else if (parsedData.status?.value === 'delayed') {
    updates.status = 'RESCHEDULED';
  }

  // Duration
  if (parsedData.duration?.minutes) {
    updates.actual_duration_minutes = parsedData.duration.minutes;
  }

  // Payment (if job has payment tracking)
  if (parsedData.payment?.amount) {
    updates.payment_amount = parsedData.payment.amount;
    updates.payment_method = parsedData.payment.method || null;
    updates.payment_received_at = new Date().toISOString();
  }

  // Notes
    if (parsedData.notes?.value) {
      // Append to existing notes
      const { data: job } = await supabase
        .from('jobs')
        .select('notes')
        .eq('id', jobId)
        .single();

      const existingNotes = job?.notes || '';
      const timestamp = new Date().toLocaleString();
      updates.notes = existingNotes
        ? `${existingNotes}\n\n[Spoke ${timestamp}] ${parsedData.notes.value}`
        : `[Spoke ${timestamp}] ${parsedData.notes.value}`;
    }

  // Add spoke reference
  updates.last_spoke_update_id = spokeUpdateId;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId);

    confirmLogger.info({
      msg: 'Wrote to job',
      jobId,
      spokeUpdateId,
      fields: Object.keys(updates),
    });
  }
}
