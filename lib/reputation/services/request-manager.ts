import { createClient } from '@/lib/supabase/server';
import type {
  ReputationRequest,
  ReputationSettings,
  CreateReputationRequestInput,
  ReputationRequestWithDetails,
} from '@/types/reputation';
import { DEFAULT_REPUTATION_SETTINGS } from '@/types/reputation';

/**
 * Generate a random access token for feedback URLs
 */
function generateAccessToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get reputation settings for a business
 * Returns defaults if not configured
 */
export async function getReputationSettings(
  businessId: string
): Promise<ReputationSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reputation_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error || !data) {
    // Return defaults
    return {
      id: '',
      business_id: businessId,
      ...DEFAULT_REPUTATION_SETTINGS,
      review_platforms: DEFAULT_REPUTATION_SETTINGS.review_platforms || [],
      initial_message_template: '',
      initial_message_with_pow_template: '',
      positive_followup_template: '',
      negative_followup_template: '',
      reminder_template: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ReputationSettings;
  }

  return data as ReputationSettings;
}

/**
 * Create a reputation request for a completed job
 * CRITICAL: PoW is referenced by FK only - NEVER modify PoW
 */
export async function createReputationRequest(
  businessId: string,
  input: CreateReputationRequestInput
): Promise<ReputationRequest | null> {
  const supabase = await createClient();

  // Get settings
  const settings = await getReputationSettings(businessId);

  if (!settings.is_enabled) {
    console.log('[Reputation] Feature disabled for business:', businessId);
    return null;
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: sentToday } = await supabase
    .from('reputation_requests')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', today.toISOString());

  if ((sentToday || 0) >= (settings.max_requests_per_day || 25)) {
    console.log('[Reputation] Daily limit reached for business:', businessId);
    return null;
  }

  // Get job with customer and PoW reference
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      business_id,
      customer_id,
      status,
      proof_of_work_id
    `)
    .eq('id', input.job_id)
    .single();

  if (jobError || !job) {
    console.error('[Reputation] Job not found:', input.job_id);
    return null;
  }

  // Verify job is completed
  if (job.status !== 'completed') {
    console.log('[Reputation] Job not completed:', input.job_id, job.status);
    return null;
  }

  // Check if request already exists for this job
  const { data: existing } = await supabase
    .from('reputation_requests')
    .select('id')
    .eq('job_id', input.job_id)
    .single();

  if (existing) {
    console.log('[Reputation] Request already exists for job:', input.job_id);
    return null;
  }

  // Generate access token
  const accessToken = generateAccessToken();

  // Calculate scheduled time
  const delayMinutes = input.delay_minutes ?? settings.send_delay_minutes ?? 60;
  const scheduledAt = input.schedule_at
    ? new Date(input.schedule_at)
    : new Date(Date.now() + delayMinutes * 60 * 1000);

  // Calculate expiry
  const expiresAt = new Date(
    scheduledAt.getTime() + (settings.request_expiry_days || 14) * 24 * 60 * 60 * 1000
  );

  // Create request
  const { data: request, error } = await supabase
    .from('reputation_requests')
    .insert({
      business_id: businessId,
      customer_id: job.customer_id,
      job_id: job.id,
      proof_of_work_id: job.proof_of_work_id || null, // READ-ONLY reference
      access_token: accessToken,
      status: delayMinutes > 0 ? 'scheduled' : 'pending',
      delivery_channel: input.delivery_channel || settings.default_channel || 'SMS',
      delivery_delay_minutes: delayMinutes,
      scheduled_at: scheduledAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      tcpa_consent_method: 'transactional',
      tcpa_consent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Reputation] Failed to create request:', error);
    return null;
  }

  return request as ReputationRequest;
}

/**
 * Get a reputation request by access token (for public feedback page)
 */
export async function getRequestByToken(
  accessToken: string
): Promise<ReputationRequestWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reputation_requests')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      job:jobs(id, service_type, completed_at),
      feedback:reputation_feedback(*),
      proof_of_work:proof_of_work(id, public_token, short_code)
    `)
    .eq('access_token', accessToken)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as ReputationRequestWithDetails;
}

/**
 * Get a reputation request by ID
 */
export async function getRequestById(
  requestId: string
): Promise<ReputationRequestWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reputation_requests')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      job:jobs(id, service_type, completed_at),
      feedback:reputation_feedback(*),
      proof_of_work:proof_of_work(id, public_token, short_code)
    `)
    .eq('id', requestId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as ReputationRequestWithDetails;
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  requestId: string,
  status: ReputationRequest['status'],
  additionalData?: Partial<ReputationRequest>
): Promise<boolean> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Add timestamp fields based on status
  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  } else if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  } else if (status === 'opened') {
    updateData.opened_at = new Date().toISOString();
  }

  if (additionalData) {
    Object.assign(updateData, additionalData);
  }

  const { error } = await supabase
    .from('reputation_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    console.error('[Reputation] Failed to update request status:', error);
    return false;
  }

  return true;
}

/**
 * Get pending requests ready for delivery
 */
export async function getPendingRequests(
  limit: number = 100
): Promise<ReputationRequest[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('reputation_requests')
    .select('*')
    .in('status', ['pending', 'scheduled'])
    .lte('scheduled_at', now)
    .gt('expires_at', now)
    .is('opt_out_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Reputation] Failed to fetch pending requests:', error);
    return [];
  }

  return (data || []) as ReputationRequest[];
}

/**
 * Get requests for a business
 */
export async function getBusinessRequests(
  businessId: string,
  options: {
    status?: ReputationRequest['status'];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ requests: ReputationRequestWithDetails[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('reputation_requests')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      job:jobs(id, service_type, completed_at),
      feedback:reputation_feedback(*)
    `, { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[Reputation] Failed to fetch business requests:', error);
    return { requests: [], total: 0 };
  }

  return {
    requests: (data || []) as unknown as ReputationRequestWithDetails[],
    total: count || 0,
  };
}
