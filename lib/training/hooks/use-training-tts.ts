'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TrainingTTSState } from '@/types/training';
import { DEFAULT_VOICE_SETTINGS } from '@/types/training';

/**
 * Hook for browser-based text-to-speech using SpeechSynthesis API
 *
 * Follows GTS principle: "Voice narration is optional and non-blocking."
 * If TTS fails or is unsupported, training continues silently.
 */
export function useTrainingTTS(): TrainingTTSState {
  const [enabled, setEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const currentTextRef = useRef<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check if SpeechSynthesis is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);

      // Load saved preference
      const savedEnabled = localStorage.getItem('training_tts_enabled');
      if (savedEnabled !== null) {
        setEnabled(savedEnabled === 'true');
      }
    }
  }, []);

  // Save preference when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('training_tts_enabled', String(enabled));
    }
  }, [enabled]);

  /**
   * Speak the given text using SpeechSynthesis
   * Graceful degradation: if TTS fails, log warning and continue
   */
  const speak = useCallback((text: string) => {
    if (!enabled || !text || !synthRef.current) {
      return;
    }

    try {
      // Stop any current speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = DEFAULT_VOICE_SETTINGS.rate;
      utterance.pitch = DEFAULT_VOICE_SETTINGS.pitch;
      utterance.lang = DEFAULT_VOICE_SETTINGS.lang;

      // Track speaking state
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.warn('[Training TTS] Speech error:', event.error);
        setIsSpeaking(false);
        // Continue without voice — never block training
      };

      currentTextRef.current = text;
      synthRef.current.speak(utterance);
    } catch (error) {
      console.warn('[Training TTS] Failed to speak:', error);
      setIsSpeaking(false);
      // Continue without voice — never block training
    }
  }, [enabled]);

  /**
   * Stop current speech
   */
  const stop = useCallback(() => {
    if (!synthRef.current) return;

    try {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } catch (error) {
      console.warn('[Training TTS] Failed to stop:', error);
    }
  }, []);

  /**
   * Replay the last spoken text
   */
  const replay = useCallback(() => {
    if (currentTextRef.current) {
      speak(currentTextRef.current);
    }
  }, [speak]);

  /**
   * Toggle enabled state
   */
  const toggleEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    if (!value) {
      stop();
    }
  }, [stop]);

  return {
    enabled,
    isSupported,
    isSpeaking,
    setEnabled: toggleEnabled,
    speak,
    stop,
    replay,
  };
}
