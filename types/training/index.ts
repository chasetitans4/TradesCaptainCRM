// =====================================================
// GUIDED TRAINING SYSTEM (GTS) TYPES
//
// In-product interactive training system
// Browser-based overlays, localStorage-first progress
//
// EXPLICIT LOCKS (Non-Negotiable):
//   1. Zero external APIs (TTS uses browser SpeechSynthesis)
//   2. Content is bundled with app (no runtime fetching)
//   3. Progress is localStorage-first, synced to DB on exit
//   4. Analytics are batched and module-level only
// =====================================================

// =====================================================
// ENUMS AND LITERAL TYPES
// =====================================================

/** Training step types */
export type StepType = 'MODAL' | 'SPOTLIGHT' | 'ACTION' | 'CHECKPOINT' | 'NAVIGATE';

/** Training progress status */
export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/** Portal type for training */
export type TrainingPortal = 'business' | 'admin';

/** Analytics event types */
export type TrainingEventType =
  | 'module_started'
  | 'module_completed'
  | 'module_skipped'
  | 'module_exited'
  | 'checkpoint_passed'
  | 'checkpoint_failed'
  | 'tts_enabled'
  | 'tts_disabled';

/** Dismissal types (includes 'tour' for migrated InteractiveTour dismissals) */
export type DismissalType = 'module' | 'all_training' | 'contextual_tip' | 'feature_tour' | 'tour';

/** Tooltip placement */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

/** Action type for ACTION steps */
export type ActionType = 'click' | 'input' | 'select' | 'toggle';

// =====================================================
// STEP INTERFACES
// =====================================================

/** Base step interface */
export interface BaseStep {
  id: string;
  type: StepType;
  title?: string;
  content: {
    title?: string;
    body: string;
    voice?: string; // TTS script (omit to skip voice)
    bullets?: string[]; // Key points as bullet list
    tip?: string; // Pro tip highlighted separately
  };
  skipCondition?: string; // Feature flag or condition ID
  navigateTo?: string; // URL to navigate to BEFORE showing this step
  waitForElement?: string; // Wait for this data-training element before showing step
}

/** Modal step - Full explanation overlay */
export interface ModalStep extends BaseStep {
  type: 'MODAL';
  display?: {
    overlay?: number; // 0-0.8, default 0.6
  };
  image?: string;
  videoUrl?: string;
}

/** Spotlight step - Highlight element + explain */
export interface SpotlightStep extends BaseStep {
  type: 'SPOTLIGHT';
  target: string; // data-training attribute value
  display?: {
    overlay?: number;
    position?: TooltipPlacement;
  };
}

/** Action step - User performs real action */
export interface ActionStep extends BaseStep {
  type: 'ACTION';
  target: string; // data-training attribute value
  action: {
    type: ActionType;
    value?: unknown; // Expected value for input/toggle
  };
  display?: {
    overlay?: number;
    position?: TooltipPlacement;
  };
  // Phase 2: Soft intelligence
  fallback?: {
    afterAttempts: number;
    alternateBody?: string;
    alternateVoice?: string;
  };
}

/** Checkpoint step - Quiz/validation */
export interface CheckpointStep extends BaseStep {
  type: 'CHECKPOINT';
  question?: string;
  options?: Array<{
    id: string;
    label: string;
    correct: boolean;
  }>;
  explanation?: string;
}

/** Navigate step - Transition to a different page */
export interface NavigateStep extends BaseStep {
  type: 'NAVIGATE';
  destination: string; // URL path to navigate to
  display?: {
    overlay?: number;
    showLoading?: boolean; // Show loading indicator during navigation
  };
}

/** Union type of all step types */
export type TrainingStep = ModalStep | SpotlightStep | ActionStep | CheckpointStep | NavigateStep;

// =====================================================
// MODULE AND COURSE INTERFACES
// =====================================================

/** Training module (collection of steps) */
export interface TrainingModule {
  id: string;
  title: string;
  steps: TrainingStep[];
}

/** Training course (collection of modules) */
export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  roles: string[]; // ['owner', 'admin', 'technician']
  featureFlag?: string; // Only show if feature enabled
  modules: TrainingModule[];
  // FUTURE: Prerequisites (NOT IMPLEMENTED in v1.x)
  // prerequisites?: string[];
}

// =====================================================
// PROGRESS INTERFACES
// =====================================================

/** User training progress record (includes preferences per GTS v1.3 spec) */
export interface UserTrainingProgress {
  id: string;
  user_id: string;
  business_id: string;
  portal: TrainingPortal;
  module_id: string;
  current_step_index: number;
  status: TrainingStatus;
  started_at?: string;
  completed_at?: string;
  total_time_seconds: number;
  last_synced_at?: string;
  local_progress_hash?: string;
  // Preferences (merged from training_preferences table per GTS v1.3)
  voice_muted: boolean;
  // Course-level completion tracking
  completed_courses: string[];
  created_at: string;
  updated_at: string;
}

/** localStorage training state (GTS v1.3 spec-compliant) */
export interface TrainingLocalState {
  // Current position
  current: {
    courseId: string;
    moduleId: string;
    stepIndex: number;
  } | null;

  // Completed modules (format: "courseId/moduleId")
  completedModules: string[];

  // Completed courses (full course completions)
  completedCourses: string[];

  // Preferences (simplified per spec - only voice mute needed)
  preferences: {
    voiceMuted: boolean;
  };

  // Sync tracking
  updatedAt: number;
  syncedAt?: number;
}

// =====================================================
// ANALYTICS INTERFACES
// =====================================================

/** Training analytics event */
export interface TrainingAnalyticsEvent {
  id?: string;
  business_id: string;
  user_id: string;
  module_id: string;
  event_type: TrainingEventType;
  step_index?: number;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  timestamp?: number;
  created_at?: string;
}

// =====================================================
// DISMISSAL INTERFACES
// =====================================================

/** Training dismissal record */
export interface TrainingDismissal {
  id: string;
  user_id: string;
  dismissal_type: DismissalType;
  module_id?: string;
  tip_id?: string;
  dismissed_at: string;
  show_again_after?: string; // NULL = never show again
}

// =====================================================
// PREFERENCE INTERFACES
// =====================================================

// NOTE: TrainingPreferences table removed in GTS v1.3 consolidation
// Voice preference (voice_muted) is now stored in user_training table
// See Migration 127: training_consolidation.sql

// =====================================================
// CONTEXT AND HOOK RETURN TYPES
// =====================================================

/** Training context state */
export interface TrainingContextState {
  isActive: boolean;
  course: TrainingCourse | null;
  module: TrainingModule | null;
  step: TrainingStep | null;
  stepIndex: number;
  moduleIndex: number;
  totalSteps: number;
  totalModules: number;
}

/** Training context actions */
export interface TrainingContextActions {
  start: (courseId: string, resumeModuleIndex?: number) => void;
  next: () => void;
  back: () => void;
  jumpToModule: (index: number) => void;
  exit: () => void;
  toggleVoice: () => void;
  replayVoice: () => void;
}

/** TTS hook return type */
export interface TrainingTTSState {
  enabled: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  setEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
  replay: () => void;
}

// =====================================================
// CONSTANTS
// =====================================================

/** Default overlay opacity */
export const DEFAULT_OVERLAY_OPACITY = 0.6;

/** Default voice settings */
export const DEFAULT_VOICE_SETTINGS = {
  rate: 0.95,
  pitch: 1.0,
  lang: 'en-US',
};

/** localStorage key for training state */
export const TRAINING_STORAGE_KEY = 'trades_captain_training';

/** localStorage key for training dismissals */
export const TRAINING_DISMISSALS_KEY = 'trades_captain_training_seen';

/** Anonymous user ID key */
export const TRAINING_ANON_ID_KEY = 'tc_training_anon_id';

// =====================================================
// DISPLAY HELPERS
// =====================================================

/** Step type display labels */
export const STEP_TYPE_LABELS: Record<StepType, string> = {
  MODAL: 'Introduction',
  SPOTLIGHT: 'Highlight',
  ACTION: 'Practice',
  CHECKPOINT: 'Quiz',
  NAVIGATE: 'Moving to...',
};

/** Training status display labels */
export const STATUS_LABELS: Record<TrainingStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};
