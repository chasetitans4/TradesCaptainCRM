// =====================================================
// SPOKE TRANSCRIPTION API
// POST /api/spoke/transcribe
//
// Per Spoke Spec v1.0:
// Receives recording URL and triggers the transcription pipeline.
// Called internally by the recording-status webhook.
//
// Pipeline: Audio URL → Whisper → Update DB → Trigger Parsing
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { transcribeFromUrl, isTranscriptionConfigured } from '@/lib/transcription/whisper';
import { PERFORMANCE_BUDGETS, WHISPER_CONFIG } from '@/lib/spoke/config';
import { estimateAudioQuality, isQualitySufficient } from '@/lib/spoke/audio/quality';

const spokeLogger = smsLogger.child({ context: 'api.spoke.transcribe' });

// Internal service authentication — no fallback default
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify internal service auth in all environments
    const authHeader = request.headers.get('X-Internal-Secret');
    if (!INTERNAL_SECRET || authHeader !== INTERNAL_SECRET) {
      spokeLogger.warn({ msg: 'Unauthorized transcription request' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { spokeUpdateId, recordingUrl } = body;

    if (!spokeUpdateId || !recordingUrl) {
      return NextResponse.json(
        { error: 'Missing spokeUpdateId or recordingUrl' },
        { status: 400 }
      );
    }

    spokeLogger.info({
      msg: 'Starting transcription',
      spokeUpdateId,
      recordingUrl,
    });

    // Check if transcription is configured
    if (!isTranscriptionConfigured()) {
      spokeLogger.error({ msg: 'Whisper transcription not configured' });

      const supabase = createAdminClient();
      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'TRANSCRIPTION_NOT_CONFIGURED',
          error_message: 'OpenAI API key not configured',
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json(
        { error: 'Transcription not configured' },
        { status: 500 }
      );
    }

    // Twilio recording URLs need .mp3 appended to get the audio file
    const audioUrl = recordingUrl.endsWith('.mp3')
      ? recordingUrl
      : `${recordingUrl}.mp3`;

    // Perform transcription with timeout
    const transcriptionPromise = transcribeFromUrl(audioUrl, {
      language: WHISPER_CONFIG.LANGUAGE,
      responseFormat: WHISPER_CONFIG.RESPONSE_FORMAT,
      // Prompt to help Whisper understand contractor speech
      prompt: 'This is a voice update from a field technician about a job they completed. They may mention customer names, payment amounts, work duration, and job status. Common phrases include: finished, complete, done, cash, check, card, hours, minutes.',
    });

    // Apply timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Transcription timeout'));
      }, PERFORMANCE_BUDGETS.TRANSCRIPTION_MS + 2000); // Add buffer
    });

    const result = await Promise.race([transcriptionPromise, timeoutPromise]);

    const transcriptionLatency = Date.now() - startTime;

    const supabase = createAdminClient();

    if (!result.success) {
      spokeLogger.error({
        msg: 'Transcription failed',
        spokeUpdateId,
        error: result.error,
        latencyMs: transcriptionLatency,
      });

      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'TRANSCRIPTION_FAILED',
          error_message: result.error || 'Unknown transcription error',
          transcription_completed_at: new Date().toISOString(),
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Check for empty transcription
    if (!result.transcript || result.transcript.trim().length === 0) {
      spokeLogger.warn({
        msg: 'Empty transcription',
        spokeUpdateId,
        latencyMs: transcriptionLatency,
      });

      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'EMPTY_TRANSCRIPTION',
          error_message: 'No speech detected in recording',
          raw_transcript: '',
          transcription_completed_at: new Date().toISOString(),
          transcription_confidence: 0,
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({ error: 'No speech detected' }, { status: 400 });
    }

    // Estimate audio quality based on transcription results
    const audioDuration = result.duration || 0;
    const audioQuality = estimateAudioQuality(
      result.transcript,
      result.confidence || 0.95,
      audioDuration
    );

    spokeLogger.info({
      msg: 'Transcription successful',
      spokeUpdateId,
      transcriptLength: result.transcript.length,
      language: result.language,
      duration: result.duration,
      latencyMs: transcriptionLatency,
      audioQuality: {
        score: audioQuality.score,
        tier: audioQuality.tier,
        issues: audioQuality.issues,
      },
    });

    // Check if quality is sufficient
    if (!isQualitySufficient(audioQuality)) {
      spokeLogger.warn({
        msg: 'Audio quality insufficient',
        spokeUpdateId,
        qualityScore: audioQuality.score,
        qualityTier: audioQuality.tier,
        issues: audioQuality.issues,
      });

      await supabase
        .from('spoke_updates')
        .update({
          status: 'FAILED',
          error_code: 'POOR_AUDIO_QUALITY',
          error_message: `Audio quality too low: ${audioQuality.issues.join(', ')}`,
          raw_transcript: result.transcript,
          transcript_language: result.language || 'en',
          transcription_confidence: result.confidence || 0.95,
          audio_quality_score: audioQuality.score,
          transcription_completed_at: new Date().toISOString(),
        })
        .eq('id', spokeUpdateId);

      return NextResponse.json({
        error: 'Audio quality too low',
        qualityScore: audioQuality.score,
        issues: audioQuality.issues,
      }, { status: 400 });
    }

    // Update the spoke_update with transcription and quality
    const { error: updateError } = await supabase
      .from('spoke_updates')
      .update({
        raw_transcript: result.transcript,
        transcript_language: result.language || 'en',
        transcription_confidence: result.confidence || 0.95,
        audio_quality_score: audioQuality.score,
        transcription_completed_at: new Date().toISOString(),
      })
      .eq('id', spokeUpdateId);

    if (updateError) {
      spokeLogger.error({
        msg: 'Failed to save transcription',
        error: updateError,
        spokeUpdateId,
      });
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Trigger the parsing pipeline
    // This would be implemented in Phase 2
    triggerParsingPipeline(spokeUpdateId, result.transcript).catch((error) => {
      spokeLogger.error({
        msg: 'Parsing pipeline trigger failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        spokeUpdateId,
      });
    });

    return NextResponse.json({
      status: 'transcribed',
      spokeUpdateId,
      transcriptLength: result.transcript.length,
      language: result.language,
      latencyMs: transcriptionLatency,
      audioQuality: {
        score: audioQuality.score,
        tier: audioQuality.tier,
      },
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    spokeLogger.error({
      msg: 'Error in transcription endpoint',
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
 * Trigger the parsing pipeline
 * Calls the /api/spoke/parse endpoint
 */
async function triggerParsingPipeline(spokeUpdateId: string, _transcript: string): Promise<void> {
  const parsingLogger = smsLogger.child({ context: 'spoke.pipeline' });

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/spoke/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET || '',
      },
      body: JSON.stringify({ spokeUpdateId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Parsing API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    parsingLogger.info({
      msg: 'Parsing pipeline completed',
      spokeUpdateId,
      confidence: result.confidence,
    });

  } catch (error) {
    parsingLogger.error({
      msg: 'Parsing pipeline failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      spokeUpdateId,
    });

    // Update spoke_update with failure
    const supabase = createAdminClient();
    await supabase
      .from('spoke_updates')
      .update({
        status: 'FAILED',
        error_code: 'PARSING_TRIGGER_FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown parsing error',
      })
      .eq('id', spokeUpdateId);

    throw error;
  }
}
