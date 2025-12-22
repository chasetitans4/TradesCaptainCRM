// =====================================================
// CUSTOMER SATISFACTION SURVEYS LIBRARY
// Post-job surveys with Google Review integration
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/activity';

export interface SurveyResponse {
  id: string;
  business_id: string;
  customer_id: string;
  job_id?: string;
  access_token: string;
  overall_rating?: number;
  service_quality?: number;
  technician_rating?: number;
  communication_rating?: number;
  value_rating?: number;
  what_went_well?: string;
  what_could_improve?: string;
  additional_comments?: string;
  nps_score?: number;
  google_review_prompted: boolean;
  google_review_clicked: boolean;
  status: 'pending' | 'completed' | 'expired';
  completed_at?: string;
  sent_at?: string;
  sent_via?: 'sms' | 'email';
  created_at: string;
}

/**
 * Create a survey for a job
 */
export async function createSurvey(
  businessId: string,
  customerId: string,
  jobId: string,
  sendVia: 'sms' | 'email' = 'sms'
): Promise<string> {
  const supabase = await createServerClient();

  const accessToken = uuidv4();

  const { data, error } = await supabase
    .from('survey_responses')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      job_id: jobId,
      access_token: accessToken,
      sent_via: sendVia,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return accessToken;
}

/**
 * Get survey by access token
 */
export async function getSurveyByToken(accessToken: string): Promise<(SurveyResponse & {
  customer: { name: string };
  business: { name: string; google_place_id?: string; google_review_threshold?: number };
  job?: { title: string };
}) | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('survey_responses')
    .select(`
      *,
      customer:customers(name),
      business:businesses(name, google_place_id, google_review_threshold),
      job:jobs(title)
    `)
    .eq('access_token', accessToken)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Submit a survey response
 */
export async function submitSurvey(
  accessToken: string,
  response: {
    overallRating: number;
    serviceQuality?: number;
    technicianRating?: number;
    communicationRating?: number;
    valueRating?: number;
    whatWentWell?: string;
    whatCouldImprove?: string;
    additionalComments?: string;
    npsScore?: number;
  }
): Promise<{ showGoogleReview: boolean; googleReviewUrl?: string }> {
  const supabase = await createServerClient();

  // Get survey with business info
  const survey = await getSurveyByToken(accessToken);

  if (!survey || survey.status === 'completed') {
    throw new Error('Survey not found or already completed');
  }

  // Update survey
  const { error } = await supabase
    .from('survey_responses')
    .update({
      overall_rating: response.overallRating,
      service_quality: response.serviceQuality,
      technician_rating: response.technicianRating,
      communication_rating: response.communicationRating,
      value_rating: response.valueRating,
      what_went_well: response.whatWentWell,
      what_could_improve: response.whatCouldImprove,
      additional_comments: response.additionalComments,
      nps_score: response.npsScore,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('access_token', accessToken);

  if (error) throw error;

  // Log activity
  await logActivity({
    businessId: survey.business_id,
    customerId: survey.customer_id,
    activityType: 'survey_completed',
    title: `Survey completed: ${response.overallRating} stars`,
    relatedEntityType: 'job',
    relatedEntityId: survey.job_id,
    metadata: { rating: response.overallRating, npsScore: response.npsScore },
    createdBySystem: true,
  });

  // Determine if we should show Google review prompt
  const threshold = survey.business?.google_review_threshold || 4;
  const showGoogleReview = response.overallRating >= threshold && !!survey.business?.google_place_id;

  if (showGoogleReview) {
    // Mark that we prompted for Google review
    await supabase
      .from('survey_responses')
      .update({ google_review_prompted: true })
      .eq('access_token', accessToken);
  }

  return {
    showGoogleReview,
    googleReviewUrl: showGoogleReview
      ? `https://search.google.com/local/writereview?placeid=${survey.business.google_place_id}`
      : undefined,
  };
}

/**
 * Mark that Google review link was clicked
 */
export async function markGoogleReviewClicked(accessToken: string): Promise<void> {
  const supabase = await createServerClient();

  await supabase
    .from('survey_responses')
    .update({ google_review_clicked: true })
    .eq('access_token', accessToken);
}

/**
 * Send a survey to a customer after job completion
 */
export async function sendSurvey(
  businessId: string,
  customerId: string,
  jobId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Get customer and business info
  const { data: customer } = await supabase
    .from('customers')
    .select('name, phone, email')
    .eq('id', customerId)
    .single();

  const { data: business } = await supabase
    .from('businesses')
    .select('name, twilio_phone_number')
    .eq('id', businessId)
    .single();

  // Create survey
  const accessToken = await createSurvey(businessId, customerId, jobId, 'sms');
  const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/survey/${accessToken}`;

  // Send SMS (would use SMS library in production)
  if (customer?.phone) {
    const message = `Hi ${customer.name}! Thanks for choosing ${business?.name}. We'd love your feedback on today's service. It only takes 30 seconds: ${surveyUrl}`;

    // Import SMS sending function
    // await sendSMS(customer.phone, message, businessId);
    console.log('Would send survey SMS:', message);
  }

  // Log activity
  await logActivity({
    businessId,
    customerId,
    activityType: 'review_requested',
    title: 'Survey sent',
    relatedEntityType: 'job',
    relatedEntityId: jobId,
    createdBySystem: true,
  });
}

/**
 * Get survey statistics for a business
 */
export async function getSurveyStats(businessId: string, days: number = 30): Promise<{
  totalSent: number;
  totalCompleted: number;
  completionRate: number;
  averageRating: number;
  averageNps: number;
  googleReviewClicks: number;
  ratingDistribution: Record<number, number>;
}> {
  const supabase = await createServerClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: surveys, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const completed = surveys.filter(s => s.status === 'completed');
  const ratings = completed.map(s => s.overall_rating).filter(r => r !== null) as number[];
  const npsScores = completed.map(s => s.nps_score).filter(s => s !== null) as number[];

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings) {
    ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
  }

  return {
    totalSent: surveys.length,
    totalCompleted: completed.length,
    completionRate: surveys.length > 0 ? Math.round((completed.length / surveys.length) * 100) : 0,
    averageRating: ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0,
    averageNps: npsScores.length > 0 ? Math.round(npsScores.reduce((a, b) => a + b, 0) / npsScores.length) : 0,
    googleReviewClicks: completed.filter(s => s.google_review_clicked).length,
    ratingDistribution,
  };
}

/**
 * Get recent survey responses
 */
export async function getRecentSurveys(
  businessId: string,
  limit: number = 20
): Promise<(SurveyResponse & { customer: { name: string }; job?: { title: string } })[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('survey_responses')
    .select(`
      *,
      customer:customers(name),
      job:jobs(title)
    `)
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Process auto-surveys (called by cron job)
 * Sends surveys to customers X hours after job completion
 */
export async function processAutoSurveys(): Promise<{ sent: number; errors: string[] }> {
  const supabase = await createServerClient();

  const result = { sent: 0, errors: [] as string[] };

  // Get businesses with auto-survey enabled
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, survey_delay_hours')
    .eq('survey_enabled', true)
    .eq('auto_send_survey', true);

  if (bizError) {
    result.errors.push(`Failed to fetch businesses: ${bizError.message}`);
    return result;
  }

  for (const business of businesses || []) {
    const delayHours = business.survey_delay_hours || 2;
    const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000);

    // Find completed jobs that haven't had surveys sent
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('business_id', business.id)
      .eq('status', 'completed')
      .lt('updated_at', cutoffTime.toISOString())
      .not('id', 'in', `(SELECT job_id FROM survey_responses WHERE business_id = '${business.id}')`);

    if (jobsError) {
      result.errors.push(`Failed to fetch jobs for business ${business.id}: ${jobsError.message}`);
      continue;
    }

    for (const job of jobs || []) {
      try {
        await sendSurvey(business.id, job.customer_id, job.id);
        result.sent++;
      } catch (err: any) {
        result.errors.push(`Failed to send survey for job ${job.id}: ${err.message}`);
      }
    }
  }

  return result;
}

/**
 * Calculate Net Promoter Score
 * Promoters (9-10) - Detractors (0-6) = NPS
 */
export function calculateNPS(scores: number[]): number {
  if (scores.length === 0) return 0;

  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;

  return Math.round(((promoters - detractors) / scores.length) * 100);
}
