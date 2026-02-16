// =====================================================
// SPOKE RECORDING STATUS WEBHOOK
// POST /api/spoke/recording-status
//
// Per Spoke Spec v1.0:
// Receives the recording URL from Twilio when recording completes.
// Triggers the transcription → parsing → matching pipeline.
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { AUDIO_QUALITY_CONFIG } from '@/lib/spoke/config';

const spokeLogger = smsLogger.child({ context: 'api.spoke.recording-status' });

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Get the updateId from query params
    const { searchParams } = new URL(request.url);
    const spokeUpdateId = searchParams.get('updateId');

    if (!spokeUpdateId) {
      spokeLogger.error({ msg: 'Missing updateId in recording-status webhook' });
      return NextResponse.json({ error: 'Missing updateId' }, { status: 400 });
    }

    // Validate Twilio signature in all environments
    const headersList = await headers();
    const sigHeader = headersList.get('x-twilio-signature') || '';

    if (!validateTwilioSignature(sigHeader, request.url, params)) {
      spokeLogger.warn({ msg: 'Invalid Twilio signature for recording-status', url: request.url });
      return new NextResponse('Forbidden', { status: 403 });
    }

    const {
      RecordingUrl: recordingUrl,
      RecordingDuration: recordingDuration,
      RecordingSid: recordingSid,
      RecordingStatus: recordingStatus,
    } = params;

    spokeLogger.info({
      msg: 'Recording status webhook received',
      spokeUpdateId,
      recordingSid,
      recordingStatus,
      recordingDuration,
      hasUrl: !!recordingUrl,
    });

    // Only process completed recordings
    if (recordingStatus !== 'completed') {
      spokeLogger.info({
        msg: 'Ignoring non-completed recording status',
        recordingStatus,
        spokeUpdateId,
      });
      return NextResponse.json({ status: 'ignored' });
    }

    if (!recordingUrl) {
      spokeLogger.error({
        msg: 'No recording URL in completed status',
        spokeUpdateId,
        recordingSid,
      });

      // Mark update as failed
      const supabase = createAdminClient();
      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'NO_RECORDING',
          error_message: 'Recording completed but no URL provided',
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({ error: 'No recording URL' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const durationSeconds = parseFloat(recordingDuration) || 0;

    // Check minimum duration
    if (durationSeconds < AUDIO_QUALITY_CONFIG.MIN_RECORDING_DURATION_SECONDS) {
      spokeLogger.warn({
        msg: 'Recording too short',
        spokeUpdateId,
        durationSeconds,
        minDuration: AUDIO_QUALITY_CONFIG.MIN_RECORDING_DURATION_SECONDS,
      });

      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'RECORDING_TOO_SHORT',
          error_message: `Recording was only ${durationSeconds}s (minimum: ${AUDIO_QUALITY_CONFIG.MIN_RECORDING_DURATION_SECONDS}s)`,
          audio_url: recordingUrl,
          audio_duration_seconds: durationSeconds,
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({ status: 'too_short' });
    }

    // Update the spoke_update with recording info
    // The transcription will be triggered via a background job or direct call
    const { error: updateError } = await supabase
      .from('spoke_updates')
      .update({
        audio_url: recordingUrl,
        audio_duration_seconds: durationSeconds,
        status: 'PROCESSING',
      })
      .eq('id', spokeUpdateId);

    if (updateError) {
      spokeLogger.error({
        msg: 'Failed to update spoke_update with recording',
        error: updateError,
        spokeUpdateId,
      });
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    spokeLogger.info({
      msg: 'Recording info saved, triggering transcription',
      spokeUpdateId,
      recordingUrl,
      durationSeconds,
      latencyMs: Date.now() - startTime,
    });

    // Trigger the transcription pipeline asynchronously
    // We don't await this - it runs in the background
    triggerTranscriptionPipeline(spokeUpdateId, recordingUrl).catch((error) => {
      spokeLogger.error({
        msg: 'Transcription pipeline failed',
        error: error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error' },
        spokeUpdateId,
      });
    });

    return NextResponse.json({
      status: 'processing',
      spokeUpdateId,
      durationSeconds,
    });

  } catch (error) {
    spokeLogger.error({
      msg: 'Error processing recording status webhook',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Trigger the transcription pipeline
 * This calls our internal transcription endpoint
 */
async function triggerTranscriptionPipeline(spokeUpdateId: string, recordingUrl: string): Promise<void> {
  const spokeLogger = smsLogger.child({ context: 'spoke.pipeline' });

  try {
    // Call our transcription endpoint
    // In production, this would be a proper internal service call
    // For now, we'll make an HTTP request to our own API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/spoke/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Internal service auth
        'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET || '',
      },
      body: JSON.stringify({
        spokeUpdateId,
        recordingUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription API returned ${response.status}: ${errorText}`);
    }

    spokeLogger.info({
      msg: 'Transcription pipeline triggered successfully',
      spokeUpdateId,
    });

  } catch (error) {
    // Update spoke_update with failure
    const supabase = createAdminClient();
    await supabase
      .from('spoke_updates')
      .update({
        status: 'FAILED',
        error_code: 'PIPELINE_TRIGGER_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown pipeline error',
      })
      .eq('id', spokeUpdateId);

    throw error;
  }
}
