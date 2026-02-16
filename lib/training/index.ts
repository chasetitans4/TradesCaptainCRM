// =====================================================
// GUIDED TRAINING SYSTEM (GTS) - MAIN EXPORTS
//
// In-product interactive training system
// Browser-based overlays, localStorage-first progress
// =====================================================

// Hooks
export { useTrainingTTS } from './hooks/use-training-tts';
export { useTrainingProgress } from './hooks/use-training-progress';

// Content
export {
  TRAINING_CONTENT,
  getCourse,
  getCoursesForRole,
  getCoursesWithFeature,
  getAllCourseIds,
} from './content';

// Analytics
export {
  trackTrainingEvent,
  trackModuleStarted,
  trackModuleCompleted,
  trackModuleSkipped,
  trackModuleExited,
  trackCheckpointPassed,
  trackCheckpointFailed,
  trackTTSToggle,
  flushAnalytics,
  setupAnalyticsAutoFlush,
} from './services/training-analytics';

// Re-export types for convenience
export type {
  StepType,
  TrainingStatus,
  TrainingPortal,
  TrainingEventType,
  DismissalType,
  TooltipPlacement,
  ActionType,
  BaseStep,
  ModalStep,
  SpotlightStep,
  ActionStep,
  CheckpointStep,
  TrainingStep,
  TrainingModule,
  TrainingCourse,
  UserTrainingProgress,
  TrainingLocalState,
  TrainingAnalyticsEvent,
  TrainingDismissal,
  TrainingContextState,
  TrainingContextActions,
  TrainingTTSState,
} from '@/types/training';

export {
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_VOICE_SETTINGS,
  TRAINING_STORAGE_KEY,
  TRAINING_DISMISSALS_KEY,
  TRAINING_ANON_ID_KEY,
  STEP_TYPE_LABELS,
  STATUS_LABELS,
} from '@/types/training';
