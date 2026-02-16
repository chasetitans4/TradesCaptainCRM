export { OnboardingChecklist } from './onboarding-checklist';
export { WelcomeModal } from './welcome-modal';
export { FeatureTooltip } from './feature-tooltip';
// InteractiveTour removed - consolidated into unified training system
// Tour functionality now handled by TrainingProvider + TrainingOverlay in @/components/training
export { PrerequisiteGate, SetupProgress } from './prerequisite-gate';
export {
  MilestoneCelebration,
  MilestoneCelebrationProvider,
  useMilestoneCelebration,
  resetAllMilestones,
  type MilestoneId,
} from './milestone-celebration';
