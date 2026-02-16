// =====================================================
// GUIDED TRAINING SYSTEM (GTS) - TYPE DEFINITIONS
//
// TypeScript types for the in-product training system
// Version: v1.5 - Empty State Integration
// =====================================================

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

/**
 * Step types (4 only - per GTS spec)
 */
export type StepType = 'MODAL' | 'SPOTLIGHT' | 'ACTION' | 'CHECKPOINT' | 'NAVIGATE';

/**
 * Training progress status
 */
export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * Portal types
 */
export type TrainingPortal = 'business' | 'admin';

/**
 * Analytics event types
 */
export type TrainingEventType =
  | 'module_started'
  | 'module_completed'
  | 'module_skipped'
  | 'module_exited'
  | 'checkpoint_passed'
  | 'checkpoint_failed'
  | 'tts_enabled'
  | 'tts_disabled';

/**
 * Dismissal types
 */
export type DismissalType = 'module' | 'all_training' | 'contextual_tip' | 'feature_tour' | 'tour';

/**
 * Tooltip placement options
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

/**
 * Action types for ACTION steps
 */
export type ActionType = 'click' | 'toggle' | 'input';

// =====================================================
// CONSTANTS
// =====================================================

export const DEFAULT_OVERLAY_OPACITY = 0.6;

export const DEFAULT_VOICE_SETTINGS = {
  rate: 0.95,
  pitch: 1,
  lang: 'en-US',
} as const;

export const TRAINING_STORAGE_KEY = 'trades_captain_training';
export const TRAINING_DISMISSALS_KEY = 'trades_captain_training_dismissals';
export const TRAINING_ANON_ID_KEY = 'tc_anon_id';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  MODAL: 'Overview',
  SPOTLIGHT: 'Highlight',
  ACTION: 'Your Turn',
  CHECKPOINT: 'Checkpoint',
  NAVIGATE: 'Navigation',
};

export const STATUS_LABELS: Record<TrainingStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

// =====================================================
// STEP INTERFACES
// =====================================================

/**
 * Base content for all step types
 */
export interface StepContent {
  title?: string;
  body: string;
  voice?: string; // TTS script (omit to skip voice)
  bullets?: string[]; // Bullet points for rich content
  tip?: string; // Pro tip callout
}

/**
 * Display options
 */
export interface StepDisplay {
  overlay?: number; // 0-0.8, default 0.6
  position?: TooltipPlacement;
}

/**
 * Action configuration for ACTION steps
 */
export interface StepAction {
  type: ActionType;
  value?: unknown; // Expected value for input/toggle
}

/**
 * Fallback for Phase 2 soft intelligence
 */
export interface StepFallback {
  afterAttempts: number;
  alternateBody?: string;
  alternateVoice?: string;
}

/**
 * Checkpoint options for quiz-style checkpoints
 */
export interface CheckpointOption {
  id: string;
  label: string;
  correct: boolean;
}

/**
 * Base step interface (shared properties)
 */
export interface BaseStep {
  id: string;
  type: StepType;
  content: StepContent;
  display?: StepDisplay;
  navigateTo?: string; // Optional: Navigate to this path before showing step
  waitForElement?: string; // Optional: Wait for this data-training element before proceeding
  fallback?: StepFallback; // Phase 2: Soft intelligence
}

/**
 * MODAL step - Full explanation overlay
 */
export interface ModalStep extends BaseStep {
  type: 'MODAL';
}

/**
 * SPOTLIGHT step - Highlight element + explain
 */
export interface SpotlightStep extends BaseStep {
  type: 'SPOTLIGHT';
  target: string; // data-training attribute value
}

/**
 * ACTION step - User performs real action
 */
export interface ActionStep extends BaseStep {
  type: 'ACTION';
  target: string; // data-training attribute value
  action?: StepAction;
}

/**
 * CHECKPOINT step - Mark progress milestone
 */
export interface CheckpointStep extends BaseStep {
  type: 'CHECKPOINT';
  options?: CheckpointOption[]; // Optional quiz options
}

/**
 * NAVIGATE step - Navigate to a different page
 */
export interface NavigateStep extends BaseStep {
  type: 'NAVIGATE';
  destination: string; // Path to navigate to
}

/**
 * Union type for all step types
 */
export type TrainingStep = ModalStep | SpotlightStep | ActionStep | CheckpointStep | NavigateStep;

// =====================================================
// MODULE & COURSE INTERFACES
// =====================================================

/**
 * Training module (specific workflow)
 */
export interface TrainingModule {
  id: string;
  title: string;
  steps: TrainingStep[];
}

/**
 * Training course (feature area)
 */
export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  roles: string[];
  featureFlag?: string;
  modules: TrainingModule[];
  // FUTURE: Course prerequisites (NOT IMPLEMENTED in v1.x)
  // prerequisites?: string[];
}

// =====================================================
// PROGRESS & STATE INTERFACES
// =====================================================

/**
 * User training progress (database record)
 */
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
  voice_muted: boolean;
  completed_courses: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Current training position
 */
export interface TrainingPosition {
  courseId: string;
  moduleId: string;
  stepIndex: number;
}

/**
 * User preferences stored in localStorage
 */
export interface TrainingPreferences {
  voiceMuted: boolean;
}

/**
 * Local training state (localStorage schema)
 */
export interface TrainingLocalState {
  current: TrainingPosition | null;
  completedModules: string[]; // ["course-id/module-id", ...]
  completedCourses: string[]; // ["course-id", ...]
  preferences: TrainingPreferences;
  updatedAt: number;
}

// =====================================================
// ANALYTICS INTERFACES
// =====================================================

/**
 * Training analytics event
 */
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

/**
 * Training dismissal record
 */
export interface TrainingDismissal {
  id: string;
  user_id: string;
  dismissal_type: DismissalType;
  module_id?: string;
  tip_id?: string;
  dismissed_at: string;
  show_again_after?: string | null; // NULL = never show again
}

// =====================================================
// CONTEXT INTERFACES
// =====================================================

/**
 * Training context state
 */
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

/**
 * Training context actions
 */
export interface TrainingContextActions {
  start: (courseId: string, resumeModuleIndex?: number) => void;
  next: () => void;
  back: () => void;
  jumpToModule: (index: number) => void;
  exit: () => void;
  toggleVoice: () => void;
  replayVoice: () => void;
}

// =====================================================
// TTS INTERFACES
// =====================================================

/**
 * TTS state and controls
 */
export interface TrainingTTSState {
  enabled: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  setEnabled: (value: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
  replay: () => void;
}

// =====================================================
// EMPTY STATE INTEGRATION (v1.5)
// =====================================================

/**
 * Empty state to training course mapping
 */
export interface EmptyStateTrainingConfig {
  location: string;
  courseId: string;
  learnButtonText: string;
}

/**
 * Pre-defined empty state training mappings
 */
export const EMPTY_STATE_TRAINING_MAP: EmptyStateTrainingConfig[] = [
  { location: 'jobs-list', courseId: 'job-workflow', learnButtonText: 'Learn how to create jobs' },
  { location: 'leads-inbox', courseId: 'leads-captain', learnButtonText: 'Learn how leads work' },
  { location: 'customers-list', courseId: 'customer-management', learnButtonText: 'Learn how to add customers' },
  { location: 'calendar', courseId: 'calendar-dispatch', learnButtonText: 'Learn scheduling' },
  { location: 'ai-voice', courseId: 'ai-voice-sms', learnButtonText: 'Set up AI Voice' },
  { location: 'proof-of-work', courseId: 'proof-of-work', learnButtonText: 'Learn about Proof of Work' },
  { location: 'quotes', courseId: 'quotes-invoices', learnButtonText: 'Learn about quotes' },
  { location: 'invoices', courseId: 'quotes-invoices', learnButtonText: 'Learn about invoices' },
  { location: 'messages', courseId: 'messaging', learnButtonText: 'Learn about messaging' },
];
