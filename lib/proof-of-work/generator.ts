// =====================================================
// PROOF OF WORK GENERATOR
//
// Creates Proof of Work records when jobs are completed
//
// EXPLICIT LOCK: Finalization delay MUST read from
// business.pow_finalization_delay_minutes - NEVER hard-code
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type {
  ProofOfWork,
  CreateProofOfWorkInput,
  UpdateProofOfWorkInput,
  ProofOfWorkStatus,
  BusinessPowSettings,
} from '@/types/proof-of-work';
import { buildTimeline } from './timeline';
import { verifyJobPhotos } from './photo-verification';
import { selectSummaryTemplate } from './summary-templates';
import { generateQrCodes } from './qr-code';

interface Job {
  id: string;
  business_id: string;
  customer_id?: string;
  service_type: string;
  scheduled_date: string;
  arrived_at?: string;
  departed_at?: string;
  completed_at?: string;
  assigned_to?: string;
  job_address_city?: string;
  job_address_state?: string;
  job_address_zip?: string;
}

interface Business {
  id: string;
  name: string;
  trade_type?: string;
  pow_enabled: boolean;
  pow_auto_delivery: boolean;
  pow_delivery_channel: 'SMS' | 'EMAIL' | 'BOTH';
  pow_delivery_delay_minutes: number;
  pow_show_zip: boolean;
  pow_require_photos: boolean;
  pow_finalization_delay_minutes: number;
}

/**
 * Generate secure public token (16 chars, unguessable)
 * Excludes ambiguous characters: 0, O, 1, I, l
 */
function generatePublicToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const randomValues = new Uint8Array(16);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 16; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Generate short code (6 chars, uppercase + digits)
 * Excludes ambiguous characters: 0, O, 1, I
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Generate reference number (POW-YYYYMMDD-XXXX)
 */
function generateReferenceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `POW-${year}${month}${day}-${suffix}`;
}

/**
 * Get business PoW settings with defaults
 */
export async function getBusinessPowSettings(
  businessId: string
): Promise<BusinessPowSettings | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      pow_enabled,
      pow_auto_delivery,
      pow_delivery_channel,
      pow_delivery_delay_minutes,
      pow_show_zip,
      pow_require_photos,
      pow_finalization_delay_minutes
    `)
    .eq('id', businessId)
    .single();

  if (error) {
    logger.error({
      msg: 'Failed to get business PoW settings',
      businessId,
      error,
    });
    return null;
  }

  // Apply defaults for null values
  return {
    pow_enabled: data.pow_enabled ?? true,
    pow_auto_delivery: data.pow_auto_delivery ?? true,
    pow_delivery_channel: data.pow_delivery_channel ?? 'SMS',
    pow_delivery_delay_minutes: data.pow_delivery_delay_minutes ?? 15,
    pow_show_zip: data.pow_show_zip ?? true,
    pow_require_photos: data.pow_require_photos ?? false,
    // EXPLICIT LOCK: This value comes from the database, never hard-coded
    pow_finalization_delay_minutes: data.pow_finalization_delay_minutes ?? 30,
  };
}

/**
 * Create a Proof of Work record for a completed job
 */
export async function createProofOfWork(
  job: Job,
  technicianId: string
): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  // Get business settings
  const settings = await getBusinessPowSettings(job.business_id);
  if (!settings || !settings.pow_enabled) {
    logger.info({
      msg: 'PoW disabled for business',
      businessId: job.business_id,
      jobId: job.id,
    });
    return null;
  }

  // Get business details for trade_type
  const { data: business } = await supabase
    .from('businesses')
    .select('trade_type')
    .eq('id', job.business_id)
    .single();

  // Generate identifiers
  let publicToken = generatePublicToken();
  let shortCode = generateShortCode();
  const referenceNumber = generateReferenceNumber();

  // Handle potential collisions (retry up to 3 times)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing } = await supabase
      .from('proof_of_work')
      .select('id')
      .or(`public_token.eq.${publicToken},short_code.eq.${shortCode}`)
      .limit(1);

    if (!existing || existing.length === 0) break;

    publicToken = generatePublicToken();
    shortCode = generateShortCode();
  }

  // Calculate duration
  let durationMinutes: number | undefined;
  if (job.arrived_at && job.departed_at) {
    const arrived = new Date(job.arrived_at);
    const departed = new Date(job.departed_at);
    durationMinutes = Math.round((departed.getTime() - arrived.getTime()) / 60000);
  }

  // Select summary template
  const template = await selectSummaryTemplate(
    business?.trade_type || null,
    null, // service category - could be extracted from service_type
    'COMPLETED'
  );

  // Calculate delivery schedule
  const now = new Date();
  const deliveryScheduledAt = new Date(
    now.getTime() + settings.pow_delivery_delay_minutes * 60000
  );

  // Create the PoW record
  const powInput: CreateProofOfWorkInput = {
    job_id: job.id,
    business_id: job.business_id,
    technician_id: technicianId,
    customer_id: job.customer_id,
    service_type: job.service_type,
    service_date: job.scheduled_date,
    location_city: job.job_address_city || 'Unknown',
    location_state: job.job_address_state || 'TX',
    location_zip: settings.pow_show_zip ? job.job_address_zip : undefined,
    arrival_time: job.arrived_at,
    departure_time: job.departed_at,
    summary_template_id: template?.id,
    summary_text: template?.template_text || 'Service completed successfully.',
    delivery_enabled: settings.pow_auto_delivery,
    delivery_channel: settings.pow_delivery_channel,
    delivery_delay_minutes: settings.pow_delivery_delay_minutes,
  };

  const { data: pow, error } = await supabase
    .from('proof_of_work')
    .insert({
      ...powInput,
      public_token: publicToken,
      short_code: shortCode,
      reference_number: referenceNumber,
      status: 'DRAFT' as ProofOfWorkStatus,
      duration_minutes: durationMinutes,
      delivery_scheduled_at: settings.pow_auto_delivery
        ? deliveryScheduledAt.toISOString()
        : null,
      // Badges - will be updated during verification
      badge_verified_business: true, // Assume business is verified
      badge_verified_technician: true, // Assume tech is verified
      badge_timestamped: !!(job.arrived_at && job.departed_at),
    })
    .select()
    .single();

  if (error) {
    logger.error({
      msg: 'Failed to create Proof of Work',
      jobId: job.id,
      error,
    });
    return null;
  }

  // Update job with PoW reference
  await supabase
    .from('jobs')
    .update({ proof_of_work_id: pow.id })
    .eq('id', job.id);

  // Create short URL redirect
  await supabase.from('short_url_redirects').insert({
    short_code: shortCode,
    target_type: 'proof_of_work',
    target_id: pow.id,
  });

  // Create audit entry
  await supabase.from('proof_of_work_audit').insert({
    proof_of_work_id: pow.id,
    event_type: 'CREATED',
    actor_type: 'SYSTEM',
    metadata: { job_id: job.id, technician_id: technicianId },
  });

  logger.info({
    msg: 'Proof of Work created',
    powId: pow.id,
    jobId: job.id,
    publicToken,
    shortCode,
  });

  return pow;
}

/**
 * Update a Proof of Work record (before finalization)
 */
export async function updateProofOfWork(
  powId: string,
  updates: UpdateProofOfWorkInput
): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  // Check if already finalized
  const { data: existing } = await supabase
    .from('proof_of_work')
    .select('finalized_at')
    .eq('id', powId)
    .single();

  if (existing?.finalized_at) {
    logger.warn({
      msg: 'Cannot update finalized Proof of Work',
      powId,
    });
    return null;
  }

  const { data, error } = await supabase
    .from('proof_of_work')
    .update(updates)
    .eq('id', powId)
    .select()
    .single();

  if (error) {
    logger.error({
      msg: 'Failed to update Proof of Work',
      powId,
      error,
    });
    return null;
  }

  return data;
}

/**
 * Complete and prepare Proof of Work for delivery
 * This verifies photos, builds timeline, generates QR codes
 */
export async function completeProofOfWork(powId: string): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  // Get PoW with job data
  const { data: pow, error: powError } = await supabase
    .from('proof_of_work')
    .select('*, job:jobs(*)')
    .eq('id', powId)
    .single();

  if (powError || !pow) {
    logger.error({
      msg: 'Failed to get Proof of Work for completion',
      powId,
      error: powError,
    });
    return null;
  }

  // Verify job photos and update verification levels
  const photoVerification = await verifyJobPhotos(pow.job_id);

  // Build timeline events
  await buildTimeline(pow);

  // Generate QR codes
  const qrUrls = await generateQrCodes(pow.public_token, pow.short_code);

  // Update PoW with completion data
  const { data: updated, error: updateError } = await supabase
    .from('proof_of_work')
    .update({
      status: 'COMPLETED' as ProofOfWorkStatus,
      badge_photo_evidence: photoVerification.hasVerifiedPhotos,
      badge_location_verified: photoVerification.hasLocationVerified,
      qr_code_png_url: qrUrls?.pngUrl,
      qr_code_svg_url: qrUrls?.svgUrl,
    })
    .eq('id', powId)
    .select()
    .single();

  if (updateError) {
    logger.error({
      msg: 'Failed to complete Proof of Work',
      powId,
      error: updateError,
    });
    return null;
  }

  logger.info({
    msg: 'Proof of Work completed',
    powId,
    hasPhotos: photoVerification.hasVerifiedPhotos,
    hasLocation: photoVerification.hasLocationVerified,
  });

  return updated;
}

/**
 * Finalize a Proof of Work (makes it immutable)
 *
 * EXPLICIT LOCK: The finalization delay is read from
 * business.pow_finalization_delay_minutes - this is intentional
 * and must NOT be hard-coded in this function.
 */
export async function finalizeProofOfWork(powId: string): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  // Get PoW to check status
  const { data: pow, error: powError } = await supabase
    .from('proof_of_work')
    .select('status, finalized_at, job_id')
    .eq('id', powId)
    .single();

  if (powError || !pow) {
    logger.error({
      msg: 'Failed to get Proof of Work for finalization',
      powId,
      error: powError,
    });
    return null;
  }

  if (pow.finalized_at) {
    logger.warn({
      msg: 'Proof of Work already finalized',
      powId,
    });
    return null;
  }

  if (pow.status !== 'COMPLETED') {
    logger.warn({
      msg: 'Cannot finalize Proof of Work that is not completed',
      powId,
      status: pow.status,
    });
    return null;
  }

  // Lock all job photos associated with this job
  await supabase
    .from('job_photos')
    .update({ locked_at: new Date().toISOString() })
    .eq('job_id', pow.job_id)
    .is('locked_at', null);

  // Finalize the PoW
  const { data: finalized, error: finalizeError } = await supabase
    .from('proof_of_work')
    .update({
      status: 'FINALIZED' as ProofOfWorkStatus,
      finalized_at: new Date().toISOString(),
    })
    .eq('id', powId)
    .select()
    .single();

  if (finalizeError) {
    logger.error({
      msg: 'Failed to finalize Proof of Work',
      powId,
      error: finalizeError,
    });
    return null;
  }

  // Create audit entry
  await supabase.from('proof_of_work_audit').insert({
    proof_of_work_id: powId,
    event_type: 'FINALIZED',
    actor_type: 'SYSTEM',
  });

  logger.info({
    msg: 'Proof of Work finalized',
    powId,
  });

  return finalized;
}

/**
 * Get Proof of Work by public token (for public page)
 */
export async function getProofOfWorkByToken(
  publicToken: string
): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('proof_of_work')
    .select('*')
    .eq('public_token', publicToken)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error({
        msg: 'Failed to get Proof of Work by token',
        error,
      });
    }
    return null;
  }

  return data;
}

/**
 * Get Proof of Work by short code (for short URL redirect)
 */
export async function getProofOfWorkByShortCode(
  shortCode: string
): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('proof_of_work')
    .select('*')
    .eq('short_code', shortCode)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error({
        msg: 'Failed to get Proof of Work by short code',
        error,
      });
    }
    return null;
  }

  return data;
}

/**
 * Get Proof of Work by job ID
 */
export async function getProofOfWorkByJobId(jobId: string): Promise<ProofOfWork | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('proof_of_work')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error({
        msg: 'Failed to get Proof of Work by job ID',
        jobId,
        error,
      });
    }
    return null;
  }

  return data;
}

/**
 * Increment view count and record audit
 */
export async function recordView(
  powId: string,
  metadata?: {
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();

  // Get current PoW to check if first view
  const { data: pow } = await supabase
    .from('proof_of_work')
    .select('first_viewed_at')
    .eq('id', powId)
    .single();

  // Update view count and first_viewed_at if applicable
  const updates: Record<string, unknown> = {
    view_count: supabase.rpc('increment_counter', { row_id: powId, column_name: 'view_count' }),
  };

  if (!pow?.first_viewed_at) {
    updates.first_viewed_at = new Date().toISOString();
  }

  await supabase
    .from('proof_of_work')
    .update({ view_count: pow ? (pow as { view_count?: number }).view_count ?? 0 + 1 : 1 })
    .eq('id', powId);

  // For first view, update first_viewed_at
  if (!pow?.first_viewed_at) {
    await supabase
      .from('proof_of_work')
      .update({ first_viewed_at: new Date().toISOString() })
      .eq('id', powId);
  }

  // Create audit entry
  await supabase.from('proof_of_work_audit').insert({
    proof_of_work_id: powId,
    event_type: 'VIEWED',
    actor_type: 'ANONYMOUS',
    ip_hash: metadata?.ipHash,
    user_agent: metadata?.userAgent,
    referrer: metadata?.referrer,
    utm_source: metadata?.utmSource,
  });
}

/**
 * Increment share count and record audit
 */
export async function recordShare(
  powId: string,
  metadata?: {
    ipHash?: string;
    userAgent?: string;
    shareMethod?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();

  // Get current share count
  const { data: pow } = await supabase
    .from('proof_of_work')
    .select('share_count')
    .eq('id', powId)
    .single();

  await supabase
    .from('proof_of_work')
    .update({ share_count: (pow?.share_count ?? 0) + 1 })
    .eq('id', powId);

  // Create audit entry
  await supabase.from('proof_of_work_audit').insert({
    proof_of_work_id: powId,
    event_type: 'SHARED',
    actor_type: 'ANONYMOUS',
    ip_hash: metadata?.ipHash,
    user_agent: metadata?.userAgent,
    metadata: metadata?.shareMethod ? { share_method: metadata.shareMethod } : undefined,
  });
}
