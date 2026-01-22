import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { transcribeAudio, isTranscriptionConfigured } from '@/lib/transcription/whisper';
import { logger } from '@/lib/logger';

const technicianLogger = logger.child({ context: 'technician.voice-note' });

/**
 * POST /api/technician/voice-note
 * Upload a voice note for a job
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const jobId = formData.get('jobId') as string;
    const audioFile = formData.get('audioFile') as File;
    const durationStr = formData.get('duration') as string;

    if (!jobId || !audioFile) {
      return NextResponse.json(
        { error: 'Job ID and audio file required' },
        { status: 400 }
      );
    }

    const duration = parseInt(durationStr) || 0;

    const supabase = await createServerSupabaseClient();

    // Verify job exists and user has access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, assigned_user_id, business_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify technician is assigned (or is owner/admin)
    if (job.assigned_user_id !== user.id && user.role === 'technician') {
      return NextResponse.json(
        { error: 'You are not assigned to this job' },
        { status: 403 }
      );
    }

    // Convert File to buffer for upload
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `voice-notes/${job.business_id}/${jobId}/${user.id}-${timestamp}.webm`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('job-media')
      .upload(fileName, buffer, {
        contentType: audioFile.type || 'audio/webm',
        cacheControl: '3600',
      });

    if (uploadError) {
      technicianLogger.error({
        msg: 'Failed to upload voice note',
        error: uploadError.message,
        jobId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to upload voice note' },
        { status: 500 }
      );
    }

    // Start transcription if configured (non-blocking)
    let transcriptionPending = false;
    let transcript: string | undefined;

    if (isTranscriptionConfigured()) {
      transcriptionPending = true;

      // Transcribe immediately (this typically takes 2-5 seconds)
      try {
        const transcriptionResult = await transcribeAudio(
          buffer,
          audioFile.name || 'voice-note.webm'
        );

        if (transcriptionResult.success && transcriptionResult.transcript) {
          transcript = transcriptionResult.transcript;
          transcriptionPending = false;
        }
      } catch (transcribeError) {
        technicianLogger.warn({
          msg: 'Transcription failed, will retry async',
          error: transcribeError instanceof Error ? transcribeError.message : String(transcribeError),
        });
      }
    }

    // Create voice note record
    const { data: voiceNote, error: insertError } = await supabase
      .from('job_voice_notes')
      .insert({
        job_id: jobId,
        user_id: user.id,
        storage_path: fileName,
        duration_seconds: duration,
        transcript: transcript || null,
        transcription_status: transcript ? 'completed' : (transcriptionPending ? 'pending' : 'none'),
        transcription_started_at: transcriptionPending || transcript ? new Date().toISOString() : null,
        transcription_completed_at: transcript ? new Date().toISOString() : null,
        transcription_provider: transcript ? 'whisper' : null,
      })
      .select('id')
      .single();

    if (insertError) {
      technicianLogger.error({
        msg: 'Failed to create voice note record',
        error: insertError.message,
        jobId,
        userId: user.id,
      });

      // Try to delete the uploaded file
      await supabase.storage.from('job-media').remove([fileName]);

      return NextResponse.json(
        { error: 'Failed to save voice note' },
        { status: 500 }
      );
    }

    technicianLogger.info({
      msg: 'Voice note uploaded',
      userId: user.id,
      jobId,
      noteId: voiceNote.id,
      duration,
      hasTranscript: !!transcript,
    });

    return NextResponse.json({
      success: true,
      noteId: voiceNote.id,
      duration,
      transcript,
      transcriptionPending,
    });
  } catch (error) {
    technicianLogger.error({
      msg: 'Error uploading voice note',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
