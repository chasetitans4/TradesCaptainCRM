'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice input status
 */
export type VoiceInputStatus = 'idle' | 'listening' | 'processing' | 'error';

/**
 * Voice input options
 */
export interface VoiceInputOptions {
  /** Language for speech recognition. Default: 'en-US' */
  language?: string;
  /** Continuous listening mode. Default: false */
  continuous?: boolean;
  /** Show interim results while speaking. Default: true */
  interimResults?: boolean;
  /** Callback when transcription is received */
  onResult?: (transcript: string, isFinal: boolean) => void;
  /** Callback when listening starts */
  onStart?: () => void;
  /** Callback when listening ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

/**
 * Voice input result
 */
export interface VoiceInputResult {
  /** Current status */
  status: VoiceInputStatus;
  /** Whether currently listening */
  isListening: boolean;
  /** Whether voice input is supported */
  isSupported: boolean;
  /** Current transcript (interim or final) */
  transcript: string;
  /** Interim transcript (currently being spoken) */
  interimTranscript: string;
  /** Error message if any */
  error: string | null;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening */
  toggleListening: () => void;
  /** Clear transcript */
  clearTranscript: () => void;
  /** Reset transcript (alias for clearTranscript) */
  resetTranscript: () => void;
}

// Check for browser support
const isBrowser = typeof window !== 'undefined';
const SpeechRecognition =
  isBrowser &&
  ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

/**
 * Voice Input Hook
 *
 * Per Design Constitution Section 3.9.1 - Input Minimization:
 * Voice-to-text is the preferred input method for free text fields
 * when hands are dirty, gloved, or occupied.
 *
 * Hierarchy of input methods (most to least preferred):
 * 1. No input - Auto-populated from context
 * 2. Single tap - Toggles, yes/no
 * 3. Selection - Dropdowns, radio buttons
 * 4. Constrained input - Number pads, date pickers
 * 5. Free text - Avoid when possible; when required, offer voice-to-text
 */
export function useVoiceInput(options: VoiceInputOptions = {}): VoiceInputResult {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onStart,
    onEnd,
    onError,
  } = options;

  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isSupported = Boolean(SpeechRecognition);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setStatus('listening');
      setError(null);
      onStart?.();
    };

    recognition.onend = () => {
      setStatus('idle');
      onEnd?.();
    };

    recognition.onerror = (event: any) => {
      let errorMessage = 'Voice input error';

      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          break;
        case 'network':
          errorMessage = 'Network error. Voice input requires internet connection.';
          break;
        case 'aborted':
          // User cancelled, not an error
          errorMessage = '';
          break;
        default:
          errorMessage = `Voice input error: ${event.error}`;
      }

      if (errorMessage) {
        setError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);
      } else {
        setStatus('idle');
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // For continuous mode, append to existing transcript
      if (continuous && finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        onResult?.(finalTranscript, true);
      } else if (finalTranscript) {
        setTranscript(finalTranscript);
        onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        // Show interim results (not final yet)
        onResult?.(interimTranscript, false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }
    };
  }, [language, continuous, interimResults, isSupported, onResult, onStart, onEnd, onError]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Voice input is not supported in this browser');
      setStatus('error');
      return;
    }

    if (status === 'listening') return;

    setError(null);
    setTranscript('');

    try {
      recognitionRef.current.start();
    } catch (err) {
      // Already started, ignore
      console.warn('Speech recognition already started');
    }
  }, [isSupported, status]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore stop errors
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [status, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    status,
    isListening: status === 'listening',
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    resetTranscript: clearTranscript,
  };
}

/**
 * Check if voice input is supported in the current browser
 */
export function isVoiceInputSupported(): boolean {
  return Boolean(SpeechRecognition);
}

/**
 * Request microphone permission
 * Call this before starting voice input to ensure permission is granted
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (!isBrowser) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks immediately after getting permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.warn('Microphone permission denied:', error);
    return false;
  }
}
