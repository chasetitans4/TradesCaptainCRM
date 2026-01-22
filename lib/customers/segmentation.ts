// Customer Segmentation Logic
// Classify customers based on job history, revenue, and engagement

import type { Customer } from '@/types';

export type CustomerSegment = 'vip' | 'active' | 'at_risk' | 'inactive' | 'new';

export interface CustomerWithSegment extends Customer {
  segment?: CustomerSegment;
  days_since_last_job?: number;
}

export interface SegmentConfig {
  // VIP: High revenue customers
  vipRevenueThreshold: number; // Minimum total revenue to be VIP
  vipJobThreshold: number; // OR minimum total jobs to be VIP

  // At Risk: Previously active but no recent jobs
  atRiskDaysThreshold: number; // Days since last job to be at risk
  atRiskMinJobs: number; // Minimum previous jobs to be considered "at risk"

  // Inactive: Very long time since last job
  inactiveDaysThreshold: number; // Days since last job to be inactive

  // New: Recently created
  newDaysThreshold: number; // Days since created to be considered new
}

// Default segmentation thresholds
export const DEFAULT_SEGMENT_CONFIG: SegmentConfig = {
  vipRevenueThreshold: 5000, // $5,000+ total revenue
  vipJobThreshold: 10, // OR 10+ total jobs

  atRiskDaysThreshold: 90, // 90+ days since last job
  atRiskMinJobs: 2, // Had at least 2 jobs before

  inactiveDaysThreshold: 180, // 180+ days since last job

  newDaysThreshold: 30, // Created within last 30 days
};

// Segment display info
export const SEGMENT_INFO: Record<CustomerSegment, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  vip: {
    label: 'VIP',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: 'High-value customer with significant revenue or job history',
  },
  active: {
    label: 'Active',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Regular customer with recent activity',
  },
  at_risk: {
    label: 'At Risk',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Previously active customer who hasn\'t booked recently',
  },
  inactive: {
    label: 'Inactive',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Customer with no recent activity',
  },
  new: {
    label: 'New',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Recently added customer',
  },
};

/**
 * Calculate the segment for a single customer
 */
export function calculateCustomerSegment(
  customer: CustomerWithSegment,
  config: SegmentConfig = DEFAULT_SEGMENT_CONFIG
): CustomerSegment {
  const now = new Date();
  const totalRevenue = customer.total_revenue || 0;
  const totalJobs = customer.total_jobs || 0;

  // Calculate days since last job
  let daysSinceLastJob = Infinity;
  if (customer.last_job_date) {
    const lastJob = new Date(customer.last_job_date);
    daysSinceLastJob = Math.floor((now.getTime() - lastJob.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Calculate days since created
  const createdAt = new Date(customer.created_at);
  const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // VIP: High revenue or many jobs
  if (totalRevenue >= config.vipRevenueThreshold || totalJobs >= config.vipJobThreshold) {
    return 'vip';
  }

  // New: Recently created with no/few jobs
  if (daysSinceCreated <= config.newDaysThreshold && totalJobs <= 1) {
    return 'new';
  }

  // Inactive: Very long time since last job
  if (daysSinceLastJob >= config.inactiveDaysThreshold) {
    return 'inactive';
  }

  // At Risk: Has history but no recent activity
  if (daysSinceLastJob >= config.atRiskDaysThreshold && totalJobs >= config.atRiskMinJobs) {
    return 'at_risk';
  }

  // Default: Active
  return 'active';
}

/**
 * Calculate segments for multiple customers
 */
export function segmentCustomers(
  customers: CustomerWithSegment[],
  config: SegmentConfig = DEFAULT_SEGMENT_CONFIG
): CustomerWithSegment[] {
  return customers.map((customer) => ({
    ...customer,
    segment: calculateCustomerSegment(customer, config),
  }));
}

/**
 * Get segment counts for a list of customers
 */
export function getSegmentCounts(customers: CustomerWithSegment[]): Record<CustomerSegment, number> {
  const counts: Record<CustomerSegment, number> = {
    vip: 0,
    active: 0,
    at_risk: 0,
    inactive: 0,
    new: 0,
  };

  customers.forEach((customer) => {
    if (customer.segment) {
      counts[customer.segment]++;
    }
  });

  return counts;
}

/**
 * Filter customers by segment
 */
export function filterBySegment(
  customers: CustomerWithSegment[],
  segment: CustomerSegment | 'all'
): CustomerWithSegment[] {
  if (segment === 'all') return customers;
  return customers.filter((c) => c.segment === segment);
}

// ============================================================================
// Job Status Color Coding
// Categorizes customers by their job history for visual indicators
// ============================================================================

export type CustomerJobStatus = 'scheduled' | 'new_lead' | 'aged_lead';

export interface JobStatusConfig {
  newLeadDaysThreshold: number; // Days since created to still be considered "new lead"
}

export const DEFAULT_JOB_STATUS_CONFIG: JobStatusConfig = {
  newLeadDaysThreshold: 30, // Customers created within 30 days with no jobs are "new leads"
};

// Job status visual styling
export const JOB_STATUS_INFO: Record<CustomerJobStatus, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  description: string;
}> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    dotColor: '#22c55e', // green-500
    description: 'Customer has had at least one job scheduled',
  },
  new_lead: {
    label: 'New Lead',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    dotColor: '#3b82f6', // blue-500
    description: 'Recently added customer with no jobs yet',
  },
  aged_lead: {
    label: 'Aged Lead',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    dotColor: '#f97316', // orange-500
    description: 'Customer added over 30 days ago with no jobs',
  },
};

/**
 * Calculate the job status for a customer based on their job history
 * - scheduled: Has at least 1 job (total_jobs > 0)
 * - new_lead: No jobs, created within threshold days
 * - aged_lead: No jobs, created more than threshold days ago
 */
export function getCustomerJobStatus(
  customer: CustomerWithSegment,
  config: JobStatusConfig = DEFAULT_JOB_STATUS_CONFIG
): CustomerJobStatus {
  const totalJobs = customer.total_jobs || 0;

  // If they have any jobs, they're "scheduled"
  if (totalJobs > 0) {
    return 'scheduled';
  }

  // No jobs - check if new or aged lead based on creation date
  const now = new Date();
  const createdAt = new Date(customer.created_at);
  const daysSinceCreated = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCreated <= config.newLeadDaysThreshold) {
    return 'new_lead';
  }

  return 'aged_lead';
}

/**
 * Get job status counts for a list of customers
 */
export function getJobStatusCounts(
  customers: CustomerWithSegment[]
): Record<CustomerJobStatus, number> {
  const counts: Record<CustomerJobStatus, number> = {
    scheduled: 0,
    new_lead: 0,
    aged_lead: 0,
  };

  customers.forEach((customer) => {
    const status = getCustomerJobStatus(customer);
    counts[status]++;
  });

  return counts;
}

/**
 * Filter customers by job status
 */
export function filterByJobStatus(
  customers: CustomerWithSegment[],
  status: CustomerJobStatus | 'all'
): CustomerWithSegment[] {
  if (status === 'all') return customers;
  return customers.filter((c) => getCustomerJobStatus(c) === status);
}
