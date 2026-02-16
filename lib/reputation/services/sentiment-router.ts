import { createClient } from '@/lib/supabase/server';
import type {
  ReputationFeedback,
  ReputationSettings,
  SentimentCategory,
  SubmitFeedbackInput,
} from '@/types/reputation';
import { categorizeSentiment } from '@/types/reputation';
import { getReputationSettings, updateRequestStatus } from './request-manager';

/**
 * Submit feedback and route based on sentiment
 * CRITICAL: This is the core routing logic
 * - Positive → Show review links
 * - Negative → Initiate recovery
 * - Neutral → Thank and close
 */
export async function submitFeedback(
  requestId: string,
  input: SubmitFeedbackInput
): Promise<{
  feedback: ReputationFeedback;
  routing: {
    category: SentimentCategory;
    showReviewLinks: boolean;
    reviewUrls?: Array<{ platform: string; url: string }>;
    recoveryNeeded: boolean;
  };
} | null> {
  const supabase = await createClient();

  // Get the request with business info
  const { data: request, error: requestError } = await supabase
    .from('reputation_requests')
    .select('*, business:businesses(id, name, review_link_google, review_link_facebook)')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    console.error('[Reputation] Request not found:', requestId);
    return null;
  }

  // Get settings for routing thresholds
  const settings = await getReputationSettings(request.business_id);

  // Categorize sentiment
  const category = categorizeSentiment(
    input.sentiment_score,
    settings.positive_threshold,
    settings.negative_threshold
  );

  // Determine routing
  const showReviewLinks = category === 'positive';
  const recoveryNeeded = category === 'negative';

  // Build review URLs for positive feedback
  let reviewUrls: Array<{ platform: string; url: string }> | undefined;
  if (showReviewLinks && settings.review_platforms) {
    reviewUrls = settings.review_platforms
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map((p) => {
        let url = p.url;
        // Fall back to business review links
        if (!url && request.business) {
          if (p.platform === 'google') {
            url = (request.business as Record<string, unknown>).review_link_google as string;
          } else if (p.platform === 'facebook') {
            url = (request.business as Record<string, unknown>).review_link_facebook as string;
          }
        }
        return { platform: p.platform, url: url || '' };
      })
      .filter((p) => p.url);
  }

  // Create feedback record
  const { data: feedback, error: feedbackError } = await supabase
    .from('reputation_feedback')
    .insert({
      request_id: requestId,
      business_id: request.business_id,
      customer_id: request.customer_id,
      sentiment_score: input.sentiment_score,
      sentiment_category: category,
      feedback_text: input.feedback_text,
      praise_areas: input.praise_areas,
      improvement_areas: input.improvement_areas,
      review_link_shown: showReviewLinks,
      recovery_needed: recoveryNeeded,
      recovery_status: recoveryNeeded ? 'pending' : null,
      recovery_started_at: recoveryNeeded ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (feedbackError || !feedback) {
    console.error('[Reputation] Failed to create feedback:', feedbackError);
    return null;
  }

  // Update request status
  const newStatus = showReviewLinks
    ? 'review_requested'
    : recoveryNeeded
    ? 'recovery_started'
    : 'completed';

  await updateRequestStatus(requestId, newStatus);

  // If recovery needed, assign to default assignee
  if (recoveryNeeded && settings.auto_assign_recovery && settings.recovery_default_assignee) {
    await supabase
      .from('reputation_feedback')
      .update({
        recovery_assigned_to: settings.recovery_default_assignee,
      })
      .eq('id', feedback.id);

    // Log the assignment
    await logRecoveryAction(
      feedback.id,
      request.business_id,
      'assigned',
      settings.recovery_default_assignee,
      null,
      'pending'
    );
  }

  return {
    feedback: feedback as ReputationFeedback,
    routing: {
      category,
      showReviewLinks,
      reviewUrls,
      recoveryNeeded,
    },
  };
}

/**
 * Track when a review link is clicked
 */
export async function trackReviewClick(
  feedbackId: string,
  platform: string,
  url: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reputation_feedback')
    .update({
      review_link_clicked: true,
      review_link_clicked_at: new Date().toISOString(),
      review_platform: platform,
      review_url_used: url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);

  if (error) {
    console.error('[Reputation] Failed to track review click:', error);
    return false;
  }

  // Update request status to completed
  const { data: feedback } = await supabase
    .from('reputation_feedback')
    .select('request_id')
    .eq('id', feedbackId)
    .single();

  if (feedback?.request_id) {
    await updateRequestStatus(feedback.request_id, 'completed');
  }

  return true;
}

/**
 * Log a recovery action
 */
export async function logRecoveryAction(
  feedbackId: string,
  businessId: string,
  actionType: string,
  performedBy: string | null,
  previousStatus: string | null,
  newStatus: string | null,
  notes?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reputation_recovery_log')
    .insert({
      feedback_id: feedbackId,
      business_id: businessId,
      action_type: actionType,
      performed_by: performedBy,
      previous_status: previousStatus,
      new_status: newStatus,
      notes,
      metadata,
    });

  if (error) {
    console.error('[Reputation] Failed to log recovery action:', error);
    return false;
  }

  return true;
}

/**
 * Update recovery status
 */
export async function updateRecoveryStatus(
  feedbackId: string,
  status: string,
  performedBy: string,
  notes?: string,
  resolution?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get current feedback
  const { data: currentFeedback } = await supabase
    .from('reputation_feedback')
    .select('recovery_status, business_id, request_id')
    .eq('id', feedbackId)
    .single();

  if (!currentFeedback) {
    return false;
  }

  // Update feedback
  const updateData: Record<string, unknown> = {
    recovery_status: status,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    updateData.recovery_notes = notes;
  }

  if (resolution) {
    updateData.recovery_resolution = resolution;
  }

  if (status === 'resolved' || status === 'closed') {
    updateData.recovery_resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('reputation_feedback')
    .update(updateData)
    .eq('id', feedbackId);

  if (error) {
    console.error('[Reputation] Failed to update recovery status:', error);
    return false;
  }

  // Log the action
  await logRecoveryAction(
    feedbackId,
    currentFeedback.business_id,
    'status_changed',
    performedBy,
    currentFeedback.recovery_status,
    status,
    notes
  );

  // If resolved/closed, update request status
  if ((status === 'resolved' || status === 'closed') && currentFeedback.request_id) {
    await updateRequestStatus(currentFeedback.request_id, 'completed');
  }

  return true;
}

/**
 * Assign recovery to a user
 */
export async function assignRecovery(
  feedbackId: string,
  assigneeId: string,
  performedBy: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get current feedback
  const { data: currentFeedback } = await supabase
    .from('reputation_feedback')
    .select('recovery_assigned_to, business_id')
    .eq('id', feedbackId)
    .single();

  if (!currentFeedback) {
    return false;
  }

  // Update assignment
  const { error } = await supabase
    .from('reputation_feedback')
    .update({
      recovery_assigned_to: assigneeId,
      recovery_status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);

  if (error) {
    console.error('[Reputation] Failed to assign recovery:', error);
    return false;
  }

  // Log the action
  const actionType = currentFeedback.recovery_assigned_to ? 'reassigned' : 'assigned';
  await logRecoveryAction(
    feedbackId,
    currentFeedback.business_id,
    actionType,
    performedBy,
    null,
    null,
    `Assigned to user ${assigneeId}`
  );

  return true;
}
