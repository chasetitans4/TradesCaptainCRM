'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { TrainingContextState, TrainingContextActions } from '@/types/training';
import { getCourse } from '@/lib/training/content';
import { useTrainingProgress } from '@/lib/training/hooks/use-training-progress';
import { useTrainingTTS } from '@/lib/training/hooks/use-training-tts';
import {
  trackModuleStarted,
  trackModuleCompleted,
  trackModuleExited,
  flushAnalytics,
  setupAnalyticsAutoFlush,
} from '@/lib/training/services/training-analytics';

// =====================================================
// TRAINING CONTEXT
// =====================================================

interface TrainingContextValue extends TrainingContextState, TrainingContextActions {
  tts: ReturnType<typeof useTrainingTTS>;
  progress: ReturnType<typeof useTrainingProgress>;
}

const TrainingContext = createContext<TrainingContextValue | null>(null);

/**
 * Hook to access training context
 * Must be used within TrainingProvider
 */
export function useTrainingContext(): TrainingContextValue {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTrainingContext must be used within TrainingProvider');
  }
  return context;
}

// =====================================================
// TRAINING PROVIDER COMPONENT
// =====================================================

interface TrainingProviderProps {
  children: React.ReactNode;
  userId?: string;
  businessId?: string;
}

export function TrainingProvider({ children, userId, businessId }: TrainingProviderProps) {
  // State
  const [isActive, setIsActive] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [moduleIndex, setModuleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Hooks
  const tts = useTrainingTTS();
  const progress = useTrainingProgress();

  // Derived state
  const course = courseId ? getCourse(courseId) ?? null : null;
  const module = course?.modules[moduleIndex] ?? null;
  const step = module?.steps[stepIndex] ?? null;

  // Setup analytics auto-flush
  useEffect(() => {
    return setupAnalyticsAutoFlush();
  }, []);

  // Speak TTS when step changes
  useEffect(() => {
    if (isActive && step?.content.voice && !progress.isVoiceMuted()) {
      tts.speak(step.content.voice);
    }
  }, [isActive, step, tts, progress]);

  /**
   * Start training for a course
   */
  const start = useCallback((id: string, resumeModuleIndex?: number) => {
    const targetCourse = getCourse(id);
    if (!targetCourse) {
      console.warn(`[Training] Course not found: ${id}`);
      return;
    }

    const startModule = resumeModuleIndex ?? 0;

    setCourseId(id);
    setModuleIndex(startModule);
    setStepIndex(0);
    startTimeRef.current = Date.now();
    setIsActive(true);

    // Track analytics
    if (businessId && userId) {
      trackModuleStarted(
        businessId,
        userId,
        `${id}/${targetCourse.modules[startModule].id}`
      );
    }

    // Save position
    progress.setPosition(id, targetCourse.modules[startModule].id, 0);
  }, [businessId, userId, progress]);

  /**
   * Advance to next step
   */
  const next = useCallback(() => {
    if (!course || !module) return;

    if (stepIndex < module.steps.length - 1) {
      // Next step in current module
      const newIndex = stepIndex + 1;
      setStepIndex(newIndex);
      progress.setPosition(courseId!, module.id, newIndex);
    } else if (moduleIndex < course.modules.length - 1) {
      // Complete current module, start next
      progress.completeModule(courseId!, module.id);

      // Track analytics
      if (businessId && userId) {
        const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        trackModuleCompleted(
          businessId,
          userId,
          `${courseId}/${module.id}`,
          durationSeconds
        );
      }

      // Move to next module
      const newModuleIndex = moduleIndex + 1;
      setModuleIndex(newModuleIndex);
      setStepIndex(0);
      startTimeRef.current = Date.now();

      // Track new module started
      if (businessId && userId) {
        trackModuleStarted(
          businessId,
          userId,
          `${courseId}/${course.modules[newModuleIndex].id}`
        );
      }

      progress.setPosition(courseId!, course.modules[newModuleIndex].id, 0);
    } else {
      // Course complete
      progress.completeModule(courseId!, module.id);
      progress.completeCourse(courseId!);

      if (businessId && userId) {
        const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        trackModuleCompleted(
          businessId,
          userId,
          `${courseId}/${module.id}`,
          durationSeconds
        );
      }

      flushAnalytics();
      exit();
    }
  }, [course, module, stepIndex, moduleIndex, courseId, businessId, userId, progress]);

  /**
   * Go back to previous step
   */
  const back = useCallback(() => {
    if (stepIndex > 0) {
      const newIndex = stepIndex - 1;
      setStepIndex(newIndex);
      progress.setPosition(courseId!, module!.id, newIndex);
    } else if (moduleIndex > 0) {
      const prevModule = course!.modules[moduleIndex - 1];
      const newStepIndex = prevModule.steps.length - 1;
      setModuleIndex(moduleIndex - 1);
      setStepIndex(newStepIndex);
      progress.setPosition(courseId!, prevModule.id, newStepIndex);
    }
  }, [stepIndex, moduleIndex, course, module, courseId, progress]);

  /**
   * Jump to a specific module
   */
  const jumpToModule = useCallback((index: number) => {
    if (!course || index < 0 || index >= course.modules.length) return;

    setModuleIndex(index);
    setStepIndex(0);
    startTimeRef.current = Date.now();

    // Track analytics
    if (businessId && userId) {
      trackModuleStarted(
        businessId,
        userId,
        `${courseId}/${course.modules[index].id}`
      );
    }

    progress.setPosition(courseId!, course.modules[index].id, 0);
  }, [course, courseId, businessId, userId, progress]);

  /**
   * Exit training
   */
  const exit = useCallback(() => {
    // Track exit if in progress
    if (isActive && module && businessId && userId) {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      trackModuleExited(
        businessId,
        userId,
        `${courseId}/${module.id}`,
        stepIndex,
        durationSeconds
      );
    }

    // Flush analytics and sync progress
    flushAnalytics();
    progress.syncToServer();

    // Stop TTS
    tts.stop();

    // Reset state
    setIsActive(false);
    setCourseId(null);
    setModuleIndex(0);
    setStepIndex(0);
  }, [isActive, module, courseId, stepIndex, businessId, userId, progress, tts]);

  /**
   * Toggle voice narration
   */
  const toggleVoice = useCallback(() => {
    const newMuted = !progress.isVoiceMuted();
    progress.setVoiceMuted(newMuted);
    tts.setEnabled(!newMuted);

    if (newMuted) {
      tts.stop();
    }
  }, [progress, tts]);

  /**
   * Replay current step's voice
   */
  const replayVoice = useCallback(() => {
    if (step?.content.voice) {
      tts.speak(step.content.voice);
    }
  }, [step, tts]);

  // Build context value
  const contextValue: TrainingContextValue = {
    // State
    isActive,
    course,
    module,
    step,
    stepIndex,
    moduleIndex,
    totalSteps: module?.steps.length ?? 0,
    totalModules: course?.modules.length ?? 0,
    // Actions
    start,
    next,
    back,
    jumpToModule,
    exit,
    toggleVoice,
    replayVoice,
    // Hooks
    tts,
    progress,
  };

  return (
    <TrainingContext.Provider value={contextValue}>
      {children}
    </TrainingContext.Provider>
  );
}
