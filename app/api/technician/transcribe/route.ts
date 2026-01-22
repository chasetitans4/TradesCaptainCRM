import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import {
  transcribeAudio,
  transcribeFromUrl,
  formatTranscriptionAsNotes,
  isTranscriptionConfigured,
} from '@/lib/transcription/whisper';
import { logger } from '@/lib/logger';

const transcribeLogger = logger.child({ context: 'technician.transcribe' });

/**
 * POST /api/technician/transcribe
 * Transcribe a voice note (file upload or URL)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isTranscriptionConfigured()) {
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 503 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(request, user);
    }

    // Handle JSON body (URL or voiceNoteId)
    return handleJsonRequest(request, user);
  } catch (error) {
    transcribeLogger.error({
      msg: 'Transcription error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle file upload transcription
 */
async function handleFileUpload(
  request: NextRequest,
  user: { id: string; role: string; business_id?: string }
) {
  const formData = await request.formData();
  const audioFile = formData.get('audioFile') as File;
  const voiceNoteId = formData.get('voiceNoteId') as string;
  const formatNotes = formData.get('formatNotes') === 'true';
  const jobContext = formData.get('jobContext') as string;

  if (!audioFile) {
    return NextResponse.json(
      { error: 'Audio file is required' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!audioFile.type.startsWith('audio/')) {
    return NextResponse.json(
      { error: 'Invalid file type. Please upload an audio file.' },
      { status: 400 }
    );
  }

  // Validate file size (max 25MB - Whisper limit)
  if (audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Audio file too large. Maximum size is 25MB.' },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  // Convert to buffer
  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Transcribe
  const result = await transcribeAudio(buffer, audioFile.name || 'audio.webm');

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 422 }
    );
  }

  let formattedNotes: string | undefined;

  // Optionally format as professional notes
  if (formatNotes && result.transcript) {
    const notesResult = await formatTranscriptionAsNotes(
      result.transcript,
      jobContext
    );
    if (notesResult.success) {
      formattedNotes = notesResult.notes;
    }
  }

  // If voiceNoteId provided, update the database record
  if (voiceNoteId) {
    await updateVoiceNoteTranscript(voiceNoteId, result.transcript!, user.id);
  }

  const latencyMs = Date.now() - startTime;

  transcribeLogger.info({
    msg: 'Voice note transcribed',
    userId: user.id,
    voiceNoteId,
    duration: result.duration,
    textLength: result.transcript?.length,
    latencyMs,
  });

  return NextResponse.json({
    success: true,
    transcript: result.transcript,
    formattedNotes,
    duration: result.duration,
    language: result.language,
    confidence: result.confidence,
  });
}

/**
 * Handle JSON request (URL or voiceNoteId)
 */
async function handleJsonRequest(
  request: NextRequest,
  user: { id: string; role: string; business_id?: string }
) {
  const body = await request.json();
  const { voiceNoteId, audioUrl, formatNotes, jobContext } = body;

  if (!voiceNoteId && !audioUrl) {
    return NextResponse.json(
      { error: 'Either voiceNoteId or audioUrl is required' },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  let urlToTranscribe = audioUrl;
  let noteId = voiceNoteId;

  // If voiceNoteId provided, fetch the storage URL
  if (voiceNoteId && !audioUrl) {
    const { data: voiceNote, error } = await supabase
      .from('job_voice_notes')
      .select('storage_path, job_id, user_id, transcript')
      .eq('id', voiceNoteId)
      .single();

    if (error || !voiceNote) {
      return NextResponse.json(
        { error: 'Voice note not found' },
        { status: 404 }
      );
    }

    // Check if already transcribed
    if (voiceNote.transcript) {
      return NextResponse.json({
        success: true,
        transcript: voiceNote.transcript,
        cached: true,
      });
    }

    // Verify user has access
    if (voiceNote.user_id !== user.id && user.role === 'technician') {
      // Check if they're assigned to the job
      const { data: job } = await supabase
        .from('jobs')
        .select('assigned_user_id')
        .eq('id', voiceNote.job_id)
        .single();

      if (!job || job.assigned_user_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have access to this voice note' },
          { status: 403 }
        );
      }
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('job-media')
      .getPublicUrl(voiceNote.storage_path);

    urlToTranscribe = urlData.publicUrl;
  }

  const startTime = Date.now();

  // Transcribe from URL
  const result = await transcribeFromUrl(urlToTranscribe);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 422 }
    );
  }

  let formattedNotes: string | undefined;

  // Optionally format as professional notes
  if (formatNotes && result.transcript) {
    const notesResult = await formatTranscriptionAsNotes(
      result.transcript,
      jobContext
    );
    if (notesResult.success) {
      formattedNotes = notesResult.notes;
    }
  }

  // Update database record
  if (noteId) {
    await updateVoiceNoteTranscript(noteId, result.transcript!, user.id);
  }

  const latencyMs = Date.now() - startTime;

  transcribeLogger.info({
    msg: 'Voice note transcribed from URL',
    userId: user.id,
    voiceNoteId: noteId,
    duration: result.duration,
    textLength: result.transcript?.length,
    latencyMs,
  });

  return NextResponse.json({
    success: true,
    transcript: result.transcript,
    formattedNotes,
    duration: result.duration,
    language: result.language,
    confidence: result.confidence,
  });
}

/**
 * Update voice note record with transcript
 */
async function updateVoiceNoteTranscript(
  voiceNoteId: string,
  transcript: string,
  userId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  await supabase
    .from('job_voice_notes')
    .update({
      transcript,
      transcription_status: 'completed',
      transcription_completed_at: new Date().toISOString(),
      transcription_provider: 'whisper',
    })
    .eq('id', voiceNoteId);
}
