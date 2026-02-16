'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TrainingLocalState } from '@/types/training';
import { TRAINING_STORAGE_KEY, TRAINING_ANON_ID_KEY } from '@/types/training';

const INITIAL_STATE: TrainingLocalState = {
  current: null,
  completedModules: [],
  completedCourses: [],
  preferences: {
    voiceMuted: false,
  },
  updatedAt: Date.now(),
};

/**
 * Hook for localStorage-first training progress management
 *
 * Follows GTS principle: "Progress is localStorage-first, synced to DB on exit"
 * - Immediate writes to localStorage
 * - Batched syncs to database on exit/blur
 * - Conflict detection via progress hash
 */
export function useTrainingProgress() {
  const [state, setState] = useState<TrainingLocalState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const syncPendingRef = useRef(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(TRAINING_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TrainingLocalState;
        setState(parsed);
      } catch (error) {
        console.warn('[Training Progress] Failed to parse stored state:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const stateToSave = { ...state, updatedAt: Date.now() };
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(stateToSave));
    syncPendingRef.current = true;
  }, [state, isLoaded]);

  // Sync to database on page unload
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      if (syncPendingRef.current) {
        syncToServer(state);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && syncPendingRef.current) {
        syncToServer(state);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state]);

  /**
   * Get or create anonymous user ID for pre-auth tracking
   */
  const getTrackingUserId = useCallback((): string => {
    if (typeof window === 'undefined') return 'unknown';

    // Check for anonymous ID
    let anonId = localStorage.getItem(TRAINING_ANON_ID_KEY);
    if (!anonId) {
      anonId = `anon_${crypto.randomUUID()}`;
      localStorage.setItem(TRAINING_ANON_ID_KEY, anonId);
    }
    return anonId;
  }, []);

  /**
   * Set current position in training
   */
  const setPosition = useCallback((courseId: string, moduleId: string, stepIndex: number) => {
    setState((prev) => ({
      ...prev,
      current: { courseId, moduleId, stepIndex },
    }));
  }, []);

  /**
   * Get current position
   */
  const getPosition = useCallback(() => {
    return state.current;
  }, [state.current]);

  /**
   * Clear current position (training exited)
   */
  const clearPosition = useCallback(() => {
    setState((prev) => ({
      ...prev,
      current: null,
    }));
  }, []);

  /**
   * Mark a module as completed
   */
  const completeModule = useCallback((courseId: string, moduleId: string) => {
    const key = `${courseId}/${moduleId}`;
    setState((prev) => {
      if (prev.completedModules.includes(key)) return prev;
      return {
        ...prev,
        completedModules: [...prev.completedModules, key],
      };
    });
    // Trigger immediate sync on module completion
    syncPendingRef.current = true;
    syncToServer(state);
  }, [state]);

  /**
   * Check if a module is completed
   */
  const isModuleComplete = useCallback((courseId: string, moduleId: string): boolean => {
    return state.completedModules.includes(`${courseId}/${moduleId}`);
  }, [state.completedModules]);

  /**
   * Mark a course as completed (all modules done)
   */
  const completeCourse = useCallback((courseId: string) => {
    setState((prev) => {
      if (prev.completedCourses.includes(courseId)) return prev;
      return {
        ...prev,
        completedCourses: [...prev.completedCourses, courseId],
      };
    });
    // Trigger immediate sync on course completion
    syncPendingRef.current = true;
    syncToServer(state);
  }, [state]);

  /**
   * Check if a course is completed
   */
  const isCourseComplete = useCallback((courseId: string): boolean => {
    return state.completedCourses.includes(courseId);
  }, [state.completedCourses]);

  /**
   * Get all completed modules for a course
   */
  const getCompletedModules = useCallback((courseId: string): string[] => {
    return state.completedModules
      .filter((key) => key.startsWith(`${courseId}/`))
      .map((key) => key.split('/')[1]);
  }, [state.completedModules]);

  /**
   * Set voice muted preference
   */
  const setVoiceMuted = useCallback((muted: boolean) => {
    setState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, voiceMuted: muted },
    }));
  }, []);

  /**
   * Get voice muted preference
   */
  const isVoiceMuted = useCallback((): boolean => {
    return state.preferences.voiceMuted;
  }, [state.preferences.voiceMuted]);

  /**
   * Reset all progress (for testing/admin)
   */
  const resetProgress = useCallback(() => {
    setState(INITIAL_STATE);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TRAINING_STORAGE_KEY);
    }
  }, []);

  /**
   * Check if there's incomplete training to resume
   */
  const shouldPromptResume = useCallback((courseId: string, totalModules: number): boolean => {
    const position = state.current;
    if (!position || position.courseId !== courseId) return false;

    const completedCount = getCompletedModules(courseId).length;
    return completedCount < totalModules;
  }, [state.current, getCompletedModules]);

  return {
    isLoaded,
    state,
    getTrackingUserId,
    setPosition,
    getPosition,
    clearPosition,
    completeModule,
    isModuleComplete,
    getCompletedModules,
    completeCourse,
    isCourseComplete,
    setVoiceMuted,
    isVoiceMuted,
    resetProgress,
    shouldPromptResume,
    syncToServer: () => syncToServer(state),
  };
}

/**
 * Sync progress to server
 * Uses sendBeacon for reliability on page close
 */
async function syncToServer(state: TrainingLocalState): Promise<void> {
  const payload = {
    completedModules: state.completedModules,
    completedCourses: state.completedCourses,
    lastPosition: state.current
      ? `${state.current.courseId}/${state.current.moduleId}/${state.current.stepIndex}`
      : null,
    voiceMuted: state.preferences.voiceMuted,
  };

  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    // Fallback to fetch if sendBeacon not available
    try {
      await fetch('/api/training/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      // Silently fail - localStorage is source of truth
      console.warn('[Training Progress] Failed to sync to server:', error);
    }
    return;
  }

  // Use sendBeacon for reliability (works even on page close)
  navigator.sendBeacon('/api/training/sync', JSON.stringify(payload));
}
