// =====================================================
// GOOGLE REVIEW REQUESTS LIBRARY
// Automated review request system
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { format, addDays } from 'date-fns';

export interface ReviewRequest {
  id: string;
  business_id: string;
  customer_id: string;
  job_id: string;
  sent_at?: string;
  clicked_at?: string;
  reviewed_at?: string;
  status: 'pending' | 'sent' | 'clicked' | 'reviewed' | 'skipped';
  review_link: string;
  send_method: 'sms' | 'email';
  created_at: string;
  // Joined data
  customer?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  job?: {
    id: string;
    title: string;
  };
}

export interface ReviewRequestSettings {
  enabled: boolean;
  delay_hours: number;
  send_method: 'sms' | 'email' | 'both';
  message_template: string;
  min_job_value?: number;
}

const DEFAULT_MESSAGE = `Hi {customer_name}! Thank you for choosing {business_name}. If you were happy with our service, we'd really appreciate a quick review. It only takes a minute! {review_link}`;

/**
 * Create a review request for a completed job
 */
export async function createReviewRequest(
  jobId: string,
  options?: {
    sendImmediately?: boolean;
    sendMethod?: 'sms' | 'email';
  }
): Promise<ReviewRequest | null> {
  const supabase = await createClient();

  // Get job details with customer and business
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      total,
      business_id,
      customer_id,
      customer:customers(id, name, phone, email),
      business:businesses(
        id,
        name,
        review_link_google,
        review_link_primary
      )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error('Job not found:', jobError);
    return null;
  }

  const business = job.business as any;
  const customer = job.customer as any;

  // Get the review link
  const reviewLink = business?.review_link_google;
  if (!reviewLink) {
    console.log('No Google review link configured');
    return null;
  }

  // Check if customer has contact info
  if (!customer?.phone && !customer?.email) {
    console.log('Customer has no contact info');
    return null;
  }

  // Determine send method
  const sendMethod = options?.sendMethod || (customer?.phone ? 'sms' : 'email');

  // Check if review request already exists for this job
  const { data: existing } = await supabase
    .from('review_requests')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (existing) {
    console.log('Review request already exists for this job');
    return null;
  }

  // Create the review request
  const { data: request, error } = await supabase
    .from('review_requests')
    .insert({
      business_id: job.business_id,
      customer_id: job.customer_id,
      job_id: jobId,
      status: options?.sendImmediately ? 'pending' : 'pending',
      review_link: reviewLink,
      send_method: sendMethod,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating review request:', error);
    return null;
  }

  // If sending immediately, trigger the send
  if (options?.sendImmediately) {
    await sendReviewRequest(request.id);
  }

  return request;
}

/**
 * Send a review request
 */
export async function sendReviewRequest(requestId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get request details
  const { data: request } = await supabase
    .from('review_requests')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      job:jobs(id, title),
      business:businesses(id, name)
    `)
    .eq('id', requestId)
    .single();

  if (!request) {
    console.error('Review request not found');
    return false;
  }

  const customer = request.customer as any;
  const business = request.business as any;

  // Build the message
  const message = DEFAULT_MESSAGE
    .replace('{customer_name}', customer?.name?.split(' ')[0] || 'there')
    .replace('{business_name}', business?.name || 'us')
    .replace('{review_link}', request.review_link);

  try {
    if (request.send_method === 'sms' && customer?.phone) {
      // Send SMS (would integrate with Twilio/messaging service)
      console.log('Would send SMS to', customer.phone, ':', message);
      // In production: await sendSMS(customer.phone, message);
    } else if (customer?.email) {
      // Send email (would integrate with email service)
      console.log('Would send email to', customer.email, ':', message);
      // In production: await sendEmail(customer.email, 'How was your service?', message);
    }

    // Update status
    await supabase
      .from('review_requests')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return true;
  } catch (error) {
    console.error('Error sending review request:', error);
    return false;
  }
}

/**
 * Track when a review link is clicked
 */
export async function trackReviewClick(requestId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('review_requests')
    .update({
      status: 'clicked',
      clicked_at: new Date().toISOString(),
    })
    .eq('id', requestId);
}

/**
 * Mark a review as completed
 */
export async function markReviewCompleted(requestId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('review_requests')
    .update({
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
}

/**
 * Skip a review request
 */
export async function skipReviewRequest(requestId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('review_requests')
    .update({
      status: 'skipped',
    })
    .eq('id', requestId);
}

/**
 * Get review requests for a business
 */
export async function getReviewRequests(
  businessId: string,
  options?: {
    status?: 'pending' | 'sent' | 'clicked' | 'reviewed' | 'skipped';
    limit?: number;
  }
): Promise<ReviewRequest[]> {
  const supabase = await createClient();

  let query = supabase
    .from('review_requests')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      job:jobs(id, title)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching review requests:', error);
    return [];
  }

  return data || [];
}

/**
 * Get review request statistics
 */
export async function getReviewStats(businessId: string): Promise<{
  totalSent: number;
  clicked: number;
  reviewed: number;
  clickRate: number;
  conversionRate: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('review_requests')
    .select('status')
    .eq('business_id', businessId);

  const requests = data || [];
  const totalSent = requests.filter((r) => r.status !== 'pending' && r.status !== 'skipped').length;
  const clicked = requests.filter((r) => r.status === 'clicked' || r.status === 'reviewed').length;
  const reviewed = requests.filter((r) => r.status === 'reviewed').length;

  return {
    totalSent,
    clicked,
    reviewed,
    clickRate: totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0,
    conversionRate: totalSent > 0 ? Math.round((reviewed / totalSent) * 100) : 0,
  };
}

/**
 * Process pending review requests (called by cron job)
 */
export async function processPendingReviewRequests(): Promise<number> {
  const supabase = await createClient();

  // Get pending requests that are ready to send
  // (created more than X hours ago based on business settings)
  const { data: pending } = await supabase
    .from('review_requests')
    .select('id')
    .eq('status', 'pending')
    .lt('created_at', addDays(new Date(), -1).toISOString()) // At least 24 hours old
    .limit(50);

  let sentCount = 0;

  for (const request of pending || []) {
    const success = await sendReviewRequest(request.id);
    if (success) sentCount++;
  }

  return sentCount;
}

/**
 * Generate a trackable review link
 */
export function generateTrackableLink(requestId: string, baseReviewLink: string): string {
  // In production, this would create a redirect URL that tracks clicks
  // For now, just return the base link
  return baseReviewLink;
}
