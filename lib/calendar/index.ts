// =====================================================
// CALENDAR LIBRARY - EXPORTS
// =====================================================

export {
  getAvailableSlots,
  isTimeSlotAvailable,
  suggestNextAvailableSlot,
  combineDateAndTime,
  addMinutes,
} from './availability';

export {
  JOB_TYPE_COLORS,
  JOB_STATUS_MODIFIERS,
  PRIORITY_COLORS,
  getJobColors,
  normalizeJobType,
  getJobTypeClasses,
} from './colors';

export type {
  JobType,
  JobStatus,
  JobColorScheme,
} from './colors';
