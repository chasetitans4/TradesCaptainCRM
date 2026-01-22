// =====================================================
// JOB TYPE COLOR DEFINITIONS
// Pastel color palette for field-optimized calendar
// =====================================================

export type JobType =
  | 'estimate'
  | 'install'
  | 'repair'
  | 'maintenance'
  | 'follow_up'
  | 'service'
  | 'inspection'
  | 'callback'
  | 'other';

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface JobColorScheme {
  bg: string;
  border: string;
  text: string;
  dot: string;
  // Optional Tailwind classes for status overrides
  bgClass?: string;
  borderClass?: string;
  textClass?: string;
  dotClass?: string;
}

// Pastel colors optimized for readability in field conditions
export const JOB_TYPE_COLORS: Record<JobType, JobColorScheme> = {
  estimate: {
    bg: '#FFD6D6',
    border: '#FFB3B3',
    text: '#8B0000',
    dot: '#FF6B6B',
  },
  install: {
    bg: '#D6EEFF',
    border: '#B3D9FF',
    text: '#00008B',
    dot: '#4A90D9',
  },
  repair: {
    bg: '#FFFFD6',
    border: '#FFFFB3',
    text: '#8B8B00',
    dot: '#FFD93D',
  },
  maintenance: {
    bg: '#D6FFD6',
    border: '#B3FFB3',
    text: '#006400',
    dot: '#4ADE80',
  },
  follow_up: {
    bg: '#E6D6FF',
    border: '#D1B3FF',
    text: '#4B0082',
    dot: '#A855F7',
  },
  service: {
    bg: '#D6FFF5',
    border: '#B3FFE8',
    text: '#006450',
    dot: '#2DD4BF',
  },
  inspection: {
    bg: '#FFE6D6',
    border: '#FFD1B3',
    text: '#8B4500',
    dot: '#F97316',
  },
  callback: {
    bg: '#FFD6E6',
    border: '#FFB3D1',
    text: '#8B0045',
    dot: '#EC4899',
  },
  other: {
    bg: '#E8E8E8',
    border: '#D0D0D0',
    text: '#4A4A4A',
    dot: '#6B7280',
  },
};

// Status overlay colors (applied on top of job type colors)
export const JOB_STATUS_MODIFIERS: Record<JobStatus, { opacity: number; strikethrough?: boolean }> = {
  scheduled: { opacity: 1 },
  in_progress: { opacity: 1 },
  completed: { opacity: 0.6, strikethrough: true },
  cancelled: { opacity: 0.4, strikethrough: true },
};

// Priority indicators
export const PRIORITY_COLORS = {
  low: '#94A3B8',
  normal: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

// Helper function to get colors for a job
export function getJobColors(
  jobType: string | null | undefined,
  status?: string | null
): JobColorScheme {
  const normalizedType = (jobType?.toLowerCase().replace(/[- ]/g, '_') || 'other') as JobType;
  const colors = JOB_TYPE_COLORS[normalizedType] || JOB_TYPE_COLORS.other;

  // Apply status modifiers if completed/cancelled
  if (status === 'completed' || status === 'cancelled') {
    return {
      ...colors,
      bg: status === 'completed' ? '#E8E8E8' : '#F3F4F6',
      border: status === 'completed' ? '#D0D0D0' : '#E5E7EB',
      text: '#6B7280',
      bgClass: status === 'completed' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900',
      borderClass: status === 'completed' ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800',
      textClass: 'text-gray-500 dark:text-gray-400',
      dotClass: 'bg-gray-400 dark:bg-gray-600',
    };
  }

  return colors;
}

// Map common job type names to our standard types
export function normalizeJobType(jobType: string | null | undefined): JobType {
  if (!jobType) return 'other';

  const normalized = jobType.toLowerCase().replace(/[- ]/g, '_');

  const typeMap: Record<string, JobType> = {
    estimate: 'estimate',
    quote: 'estimate',
    bid: 'estimate',
    install: 'install',
    installation: 'install',
    new_install: 'install',
    repair: 'repair',
    fix: 'repair',
    troubleshoot: 'repair',
    maintenance: 'maintenance',
    tune_up: 'maintenance',
    pm: 'maintenance',
    preventive: 'maintenance',
    follow_up: 'follow_up',
    followup: 'follow_up',
    check_back: 'follow_up',
    service: 'service',
    service_call: 'service',
    inspection: 'inspection',
    evaluate: 'inspection',
    callback: 'callback',
    warranty: 'callback',
  };

  return typeMap[normalized] || 'other';
}

// CSS class helpers for Tailwind integration
export function getJobTypeClasses(jobType: string | null | undefined): string {
  const colors = getJobColors(jobType);
  return `bg-[${colors.bg}] border-[${colors.border}] text-[${colors.text}]`;
}
