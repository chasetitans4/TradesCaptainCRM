// =====================================================
// FEATURE REQUESTS SERVICE
// Handles feature request management for clients and admins
// =====================================================

import type {
  FeatureRequest,
  FeatureRequestComment,
  FeatureRequestStatus,
  FeatureRequestPriority,
  FeatureRequestCategory,
  FeatureRequestSource,
  CreateFeatureRequestInput,
  UpdateFeatureRequestInput,
  FeatureRequestStats,
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

// In-memory storage (replace with Supabase in production)
const featureRequests: Map<string, FeatureRequest> = new Map();
const featureComments: Map<string, FeatureRequestComment[]> = new Map();
let requestCounter = 1000;

// Generate unique ID
function generateId(): string {
  return `fr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Generate request number
function generateRequestNumber(): string {
  requestCounter++;
  return `FR-${requestCounter}`;
}

// Create a new feature request
export async function createFeatureRequest(
  input: CreateFeatureRequestInput,
  submitter: {
    source: FeatureRequestSource;
    submitter_id: string;
    submitter_name: string;
    submitter_email: string;
    business_name?: string;
    crm_account_id?: string;
  }
): Promise<FeatureRequest> {
  const id = generateId();
  const now = new Date().toISOString();

  const featureRequest: FeatureRequest = {
    id,
    request_number: generateRequestNumber(),
    source: submitter.source,
    submitter_id: submitter.submitter_id,
    submitter_name: submitter.submitter_name,
    submitter_email: submitter.submitter_email,
    business_name: submitter.business_name,
    crm_account_id: submitter.crm_account_id,
    title: input.title,
    description: input.description,
    use_case: input.use_case,
    category: input.category,
    priority: 'medium', // Default priority, admin can change
    status: 'submitted',
    upvotes: 1, // Auto-upvote by submitter
    upvoted_by: [submitter.submitter_id],
    created_at: now,
    updated_at: now,
  };

  featureRequests.set(id, featureRequest);
  featureComments.set(id, []);

  return featureRequest;
}

// Get a feature request by ID or request number
export async function getFeatureRequest(idOrNumber: string): Promise<FeatureRequest | null> {
  // Try by ID first
  if (featureRequests.has(idOrNumber)) {
    return featureRequests.get(idOrNumber)!;
  }

  // Try by request number
  for (const request of featureRequests.values()) {
    if (request.request_number === idOrNumber) {
      return request;
    }
  }

  return null;
}

// Get all feature requests with optional filters
export async function getFeatureRequests(filters?: {
  status?: FeatureRequestStatus;
  category?: FeatureRequestCategory;
  source?: FeatureRequestSource;
  submitter_id?: string;
  search?: string;
}): Promise<FeatureRequest[]> {
  let requests = Array.from(featureRequests.values());

  if (filters) {
    if (filters.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters.category) {
      requests = requests.filter(r => r.category === filters.category);
    }
    if (filters.source) {
      requests = requests.filter(r => r.source === filters.source);
    }
    if (filters.submitter_id) {
      requests = requests.filter(r => r.submitter_id === filters.submitter_id);
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      requests = requests.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.request_number.toLowerCase().includes(query)
      );
    }
  }

  // Sort by upvotes (most popular first), then by date
  return requests.sort((a, b) => {
    if (b.upvotes !== a.upvotes) {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// Update a feature request (admin only)
export async function updateFeatureRequest(
  id: string,
  updates: UpdateFeatureRequestInput,
  reviewedBy?: string
): Promise<FeatureRequest | null> {
  const request = featureRequests.get(id);
  if (!request) return null;

  const now = new Date().toISOString();
  const updated: FeatureRequest = {
    ...request,
    ...updates,
    updated_at: now,
  };

  // Track review info if status changed
  if (updates.status && updates.status !== request.status) {
    if (!request.reviewed_at) {
      updated.reviewed_at = now;
      updated.reviewed_by = reviewedBy;
    }
    if (updates.status === 'completed') {
      updated.completed_at = now;
    }
  }

  featureRequests.set(id, updated);
  return updated;
}

// Upvote a feature request
export async function upvoteFeatureRequest(
  id: string,
  userId: string
): Promise<{ success: boolean; upvotes: number }> {
  const request = featureRequests.get(id);
  if (!request) return { success: false, upvotes: 0 };

  // Check if already upvoted
  if (request.upvoted_by.includes(userId)) {
    // Remove upvote
    request.upvoted_by = request.upvoted_by.filter(u => u !== userId);
    request.upvotes = request.upvoted_by.length;
  } else {
    // Add upvote
    request.upvoted_by.push(userId);
    request.upvotes = request.upvoted_by.length;
  }

  request.updated_at = new Date().toISOString();
  featureRequests.set(id, request);

  return { success: true, upvotes: request.upvotes };
}

// Add a comment to a feature request
export async function addFeatureComment(
  featureRequestId: string,
  comment: {
    commenter_type: 'client' | 'admin';
    commenter_id: string;
    commenter_name: string;
    comment: string;
    is_official_response?: boolean;
  }
): Promise<FeatureRequestComment | null> {
  if (!featureRequests.has(featureRequestId)) return null;

  const id = `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const newComment: FeatureRequestComment = {
    id,
    feature_request_id: featureRequestId,
    commenter_type: comment.commenter_type,
    commenter_id: comment.commenter_id,
    commenter_name: comment.commenter_name,
    comment: comment.comment,
    is_official_response: comment.is_official_response || false,
    created_at: now,
  };

  const comments = featureComments.get(featureRequestId) || [];
  comments.push(newComment);
  featureComments.set(featureRequestId, comments);

  // Update the feature request timestamp
  const request = featureRequests.get(featureRequestId);
  if (request) {
    request.updated_at = now;
    featureRequests.set(featureRequestId, request);
  }

  return newComment;
}

// Get comments for a feature request
export async function getFeatureComments(featureRequestId: string): Promise<FeatureRequestComment[]> {
  return featureComments.get(featureRequestId) || [];
}

// Get feature request stats
export async function getFeatureRequestStats(): Promise<FeatureRequestStats> {
  const requests = Array.from(featureRequests.values());

  return {
    total: requests.length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    under_review: requests.filter(r => r.status === 'under_review').length,
    planned: requests.filter(r => r.status === 'planned').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    declined: requests.filter(r => r.status === 'declined').length,
  };
}

// Check if user has upvoted a request
export function hasUserUpvoted(request: FeatureRequest, userId: string): boolean {
  return request.upvoted_by.includes(userId);
}
