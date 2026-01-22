// =====================================================
// FEATURE REQUESTS SERVICE
// Handles feature request management for clients and admins
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

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

export * from './constants';

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
  const supabase = createAdminClient();

  // Create the request
  const { data: request, error } = await supabase
    .from('feature_requests')
    .insert({
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
      priority: 'medium', // Default
      status: 'submitted',
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-upvote by submitter
  await upvoteFeatureRequest(request.id, submitter.submitter_id);

  // Fetch complete object with upvotes
  return (await getFeatureRequest(request.id))!;
}

// Get a feature request by ID or request number
export async function getFeatureRequest(idOrNumber: string): Promise<FeatureRequest | null> {
  const supabase = createAdminClient();
  
  let query = supabase.from('feature_requests').select('*');
  
  if (idOrNumber.startsWith('FR-')) {
    query = query.eq('request_number', idOrNumber);
  } else {
    query = query.eq('id', idOrNumber);
  }

  const { data: request, error } = await query.single();
  
  if (error || !request) return null;

  // Fetch votes
  const { data: votes } = await supabase
    .from('feature_votes')
    .select('user_id')
    .eq('feature_request_id', request.id);

  return {
    ...request,
    upvoted_by: votes?.map(v => v.user_id) || [],
    upvotes: request.upvotes || 0 // Use the column from DB which is maintained by trigger
  };
}

// Get all feature requests with optional filters
export async function getFeatureRequests(filters: {
  status?: FeatureRequestStatus;
  category?: FeatureRequestCategory;
  source?: FeatureRequestSource;
  submitter_id?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const supabase = createAdminClient();
  const { page = 1, limit = 25 } = filters;
  
  let query = supabase.from('feature_requests').select('*', { count: 'exact' });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.submitter_id) query = query.eq('submitter_id', filters.submitter_id);
  if (filters.search) {
    const s = filters.search;
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,request_number.ilike.%${s}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: requests, count, error } = await query
    .order('upvotes', { ascending: false }) // Sort by upvotes first as default
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  // For list view, we might not need all upvoters IDs, but the type requires it.
  // To avoid N+1, we fetch all votes for these requests.
  const requestIds = requests.map(r => r.id);
  
  let votesMap = new Map<string, string[]>();
  
  if (requestIds.length > 0) {
    const { data: allVotes } = await supabase
      .from('feature_votes')
      .select('feature_request_id, user_id')
      .in('feature_request_id', requestIds);

    allVotes?.forEach(v => {
      const list = votesMap.get(v.feature_request_id) || [];
      list.push(v.user_id);
      votesMap.set(v.feature_request_id, list);
    });
  }

  const data: FeatureRequest[] = requests.map(r => ({
    ...r,
    upvoted_by: votesMap.get(r.id) || [],
    upvotes: r.upvotes || 0
  }));

  return {
    data,
    meta: {
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Update a feature request (admin only)
export async function updateFeatureRequest(
  id: string,
  updates: UpdateFeatureRequestInput,
  reviewedBy?: string
): Promise<FeatureRequest | null> {
  const supabase = createAdminClient();

  const updateData: any = { ...updates, updated_at: new Date().toISOString() };

  // Logic for status changes
  if (updates.status) {
    // We need to fetch current status to check if we need to set reviewed_at
    const { data: current } = await supabase.from('feature_requests').select('status, reviewed_at').eq('id', id).single();
    
    if (current && updates.status !== current.status) {
      if (!current.reviewed_at) {
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = reviewedBy;
      }
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
  }

  const { data: updated, error } = await supabase
    .from('feature_requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;

  return getFeatureRequest(id);
}

// Upvote a feature request
export async function upvoteFeatureRequest(
  id: string,
  userId: string
): Promise<{ success: boolean; upvotes: number }> {
  const supabase = createAdminClient();

  // Check if already voted
  const { data: existing } = await supabase
    .from('feature_votes')
    .select('id')
    .eq('feature_request_id', id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Remove vote
    await supabase.from('feature_votes').delete().eq('id', existing.id);
  } else {
    // Add vote
    await supabase.from('feature_votes').insert({
      feature_request_id: id,
      user_id: userId
    });
  }

  // Get updated count
  const { data: req } = await supabase.from('feature_requests').select('upvotes').eq('id', id).single();
  return { success: true, upvotes: req?.upvotes || 0 };
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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('feature_comments')
    .insert({
      feature_request_id: featureRequestId,
      commenter_type: comment.commenter_type,
      commenter_id: comment.commenter_id,
      commenter_name: comment.commenter_name,
      comment: comment.comment,
      is_official_response: comment.is_official_response || false
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

// Get comments for a feature request
export async function getFeatureComments(featureRequestId: string): Promise<FeatureRequestComment[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('feature_comments')
    .select('*')
    .eq('feature_request_id', featureRequestId)
    .order('created_at', { ascending: true });
    
  return data || [];
}

// Get feature request stats
export async function getFeatureRequestStats(): Promise<FeatureRequestStats> {
  const supabase = createAdminClient();
  
  // We can do this with a single query using aggregation or multiple counts.
  // Multiple counts is easier to write.
  const { data: requests } = await supabase.from('feature_requests').select('status');
  
  const stats: FeatureRequestStats = {
    total: 0,
    submitted: 0,
    under_review: 0,
    planned: 0,
    in_progress: 0,
    completed: 0,
    declined: 0,
  };

  if (requests) {
    stats.total = requests.length;
    requests.forEach(r => {
      const s = r.status as keyof Omit<FeatureRequestStats, 'total'>;
      if (stats[s] !== undefined) {
        stats[s]++;
      }
    });
  }

  return stats;
}

// Check if user has upvoted a request
export function hasUserUpvoted(request: FeatureRequest, userId: string): boolean {
  return request.upvoted_by.includes(userId);
}
