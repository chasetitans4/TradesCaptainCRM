import type {
  FeatureRequestStatus,
  FeatureRequestPriority,
  FeatureRequestCategory,
} from '@/lib/admin/types';

// Category labels for display
export const FEATURE_CATEGORY_LABELS: Record<FeatureRequestCategory, string> = {
  leads_customers: 'Leads & Customers',
  jobs_scheduling: 'Jobs & Scheduling',
  quotes_invoices: 'Quotes & Invoices',
  communication: 'Communication (SMS/Email)',
  reporting: 'Reports & Analytics',
  integrations: 'Integrations',
  mobile_app: 'Mobile App',
  admin_settings: 'Admin & Settings',
  other: 'Other',
};

// Status labels and colors
export const FEATURE_STATUS_CONFIG: Record<FeatureRequestStatus, { label: string; color: string; description: string }> = {
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-700',
    description: 'Your request has been received',
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Our team is evaluating this request',
  },
  planned: {
    label: 'Planned',
    color: 'bg-purple-100 text-purple-700',
    description: 'This feature is on our roadmap',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-700',
    description: 'Currently being developed',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
    description: 'This feature has been released',
  },
  declined: {
    label: 'Declined',
    color: 'bg-gray-100 text-gray-600',
    description: 'Not planned at this time',
  },
};

// Priority config
export const FEATURE_PRIORITY_CONFIG: Record<FeatureRequestPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
};
