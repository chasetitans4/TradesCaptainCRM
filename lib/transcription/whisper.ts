// =====================================================
// WHISPER TRANSCRIPTION SERVICE
// Voice-to-text using OpenAI Whisper API
// =====================================================

import 'openai/shims/node';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';

const transcriptionLogger = logger.child({ context: 'transcription.whisper' });

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for transcription');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export function isTranscriptionConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  duration?: number;
  language?: string;
  confidence?: number;
  error?: string;
}

export interface TranscriptionOptions {
  language?: string; // ISO-639-1 language code (e.g., 'en')
  prompt?: string; // Optional prompt to guide transcription
  responseFormat?: 'json' | 'text' | 'verbose_json';
}

/**
 * Transcribe audio using OpenAI Whisper
 *
 * @param audioBuffer - Audio data as Buffer
 * @param filename - Original filename with extension
 * @param options - Transcription options
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    if (!isTranscriptionConfigured()) {
      return {
        success: false,
        error: 'Transcription not configured. Set OPENAI_API_KEY.',
      };
    }

    const openai = getOpenAI();

    // Create a File-like object for the API
    // Convert Buffer to Uint8Array for compatibility
    const uint8Array = new Uint8Array(audioBuffer);
    const file = new File([uint8Array], filename, {
      type: getMimeType(filename),
    });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options?.language || 'en',
      prompt: options?.prompt,
      response_format: options?.responseFormat || 'verbose_json',
    });

    const latencyMs = Date.now() - startTime;

    // The API returns an object with at least 'text' field
    const transcriptionResponse = response as {
      text: string;
      duration?: number;
      language?: string;
    };

    transcriptionLogger.info({
      msg: 'Transcription completed',
      latencyMs,
      duration: transcriptionResponse.duration,
      language: transcriptionResponse.language,
      textLength: transcriptionResponse.text.length,
    });

    return {
      success: true,
      transcript: transcriptionResponse.text,
      duration: transcriptionResponse.duration,
      language: transcriptionResponse.language,
      confidence: 0.95, // Whisper doesn't provide confidence, estimate high
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    transcriptionLogger.error({
      msg: 'Transcription failed',
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed',
    };
  }
}

/**
 * Transcribe audio from a URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch audio: ${response.statusText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL or use default
    const urlParts = audioUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || 'audio.webm';

    return transcribeAudio(buffer, filename, options);
  } catch (error) {
    transcriptionLogger.error({
      msg: 'Failed to fetch audio for transcription',
      audioUrl,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audio',
    };
  }
}

/**
 * Transcribe audio from base64
 */
export async function transcribeFromBase64(
  base64Data: string,
  mimeType: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    const buffer = Buffer.from(base64Content, 'base64');
    const extension = getExtensionFromMime(mimeType);
    const filename = `audio.${extension}`;

    return transcribeAudio(buffer, filename, options);
  } catch (error) {
    transcriptionLogger.error({
      msg: 'Failed to decode base64 audio',
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: 'Invalid audio data',
    };
  }
}

/**
 * Generate a summary/notes from transcription
 * Uses GPT to clean up and format technician voice notes
 */
export async function formatTranscriptionAsNotes(
  transcript: string,
  jobContext?: string
): Promise<{ success: boolean; notes?: string; error?: string }> {
  try {
    if (!isTranscriptionConfigured()) {
      return { success: false, error: 'OpenAI not configured' };
    }

    const openai = getOpenAI();

    const systemPrompt = `You are helping format technician voice notes into clean, professional job notes.

Convert the transcription into clear bullet points or short paragraphs.
- Fix any obvious speech-to-text errors
- Remove filler words (um, uh, like, you know)
- Keep technical details accurate
- Maintain the technician's observations and recommendations
- Keep it concise but complete`;

    const userPrompt = jobContext
      ? `Job context: ${jobContext}\n\nTranscription:\n${transcript}`
      : `Transcription:\n${transcript}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const notes = response.choices[0]?.message?.content;

    if (!notes) {
      return { success: false, error: 'No response from formatting' };
    }

    return { success: true, notes };
  } catch (error) {
    transcriptionLogger.error({
      msg: 'Failed to format transcription',
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Formatting failed',
    };
  }
}

// Helper functions

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return mimeTypes[ext || ''] || 'audio/webm';
}

function getExtensionFromMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  };
  return extensions[mimeType] || 'webm';
}
