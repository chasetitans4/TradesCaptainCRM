// ===========================================
// TRADESCAPTAIN / BLUEHQ BRAND COLORS
// ===========================================

export const brandColors = {
  // Primary - Blue gradient base (from "Captain" text)
  // Use primary-500 for main actions, gradient for special emphasis
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // ← Main primary (royal blue)
    600: '#2563EB', // ← Deeper blue from gradient
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // Secondary - Cyan/Sky blue (light end of "Captain" gradient)
  // Use for highlights, hover states, secondary actions
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8', // ← Bright cyan from logo
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },

  // Accent - Success green for positive actions
  accent: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // ← Success green
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Dark - Charcoal from "TRADES" text
  // Use for dark backgrounds, sidebar, text
  dark: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // ← Main dark (from "TRADES")
    900: '#0F172A',
    950: '#020617',
  },
};

// Brand gradient (for special elements like CTAs, hero sections)
export const brandGradient = {
  // The "Captain" text gradient
  primary: 'linear-gradient(135deg, #38BDF8 0%, #3B82F6 50%, #2563EB 100%)',
  // Subtle version for backgrounds
  subtle: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
  // Dark gradient for sidebar/headers
  dark: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
};

// Semantic colors (don't change these)
export const semanticColors = {
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// Neutral palette
export const neutralColors = {
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
};

// Status badge colors
export const statusColors = {
  // Lead statuses
  new: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  contacted: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  quoted: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  scheduled: { bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-200' },
  won: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },

  // Job statuses
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  no_show: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },

  // Invoice statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
};

// Priority colors
export const priorityColors = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
  high: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300' },
  urgent: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300' },
};

// Chart color palette
export const chartColors = [
  '#3B82F6', // Primary blue
  '#22C55E', // Success green
  '#F59E0B', // Warning amber
  '#EF4444', // Destructive red
  '#8B5CF6', // Purple
  '#0EA5E9', // Secondary cyan
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

// Metric card color variants
export const metricCardColors = {
  primary: {
    icon: 'bg-primary-100 text-primary-600',
    value: 'text-primary-600',
  },
  secondary: {
    icon: 'bg-secondary-100 text-secondary-600',
    value: 'text-secondary-600',
  },
  success: {
    icon: 'bg-green-100 text-green-600',
    value: 'text-green-600',
  },
  warning: {
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-600',
  },
  danger: {
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-600',
  },
};
