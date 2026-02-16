/**
 * Voice Usage Tracking - Delta 3: Hard Minute Caps
 *
 * Rule: At 100% usage, system must do ONE of:
 * 1. Hard Stop (default) - AI Voice pauses, calls route to voicemail
 * 2. Approved Overage - Charge per-minute, MUST be explicitly enabled
 *
 * PROHIBITED:
 * - Silent overages
 * - Retroactive billing
 * - Automatic overages without opt-in
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type {
  VoiceUsage,
  VoiceUsageStatus,
  OverageMode,
} from '@/types/voice-receptionist';
import { VOICE_OVERAGE_RATE, VOICE_MINUTES_BY_PLAN } from '@/types/voice-receptionist';

const usageLogger = logger.child({ module: 'voice-usage' });

/**
 * Record voice minutes usage
 * Delta 3: Enforces hard cap unless overage explicitly approved
 */
export async function recordVoiceMinutes(
  businessId: string,
  minutes: number
): Promise<{ success: boolean; cappedAt?: number; error?: string }> {
  const supabase = createAdminClient();

  // Get current usage record
  const today = new Date().toISOString().split('T')[0];
  const { data: usage, error: usageError } = await supabase
    .from('voice_usage')
    .select('*')
    .eq('business_id', businessId)
    .lte('billing_period_start', today)
    .gte('billing_period_end', today)
    .single();

  if (usageError || !usage) {
    usageLogger.error({ msg: 'Failed to get voice usage record', businessId, error: usageError });
    return { success: false, error: 'Usage tracking unavailable' };
  }

  // Get settings for overage mode
  const { data: settings } = await supabase
    .from('voice_receptionist_settings')
    .select('overage_mode, overage_opt_in_at')
    .eq('business_id', businessId)
    .single();

  const newUsedMinutes = Number(usage.used_minutes) + minutes;
  const overLimit = newUsedMinutes > usage.included_minutes;

  // Delta 3: Check overage approval
  if (overLimit) {
    const overageMode = settings?.overage_mode || 'hard_stop';
    const overageApproved = !!settings?.overage_opt_in_at;

    if (overageMode === 'hard_stop') {
      // Hard stop: Cap at included minutes
      usageLogger.warn({
        msg: 'Voice usage hard cap reached (hard_stop mode)',
        businessId,
        used: usage.used_minutes,
        included: usage.included_minutes,
      });

      await supabase
        .from('voice_usage')
        .update({
          used_minutes: usage.included_minutes,
          hard_cap_active: true,
          hard_cap_triggered_at: new Date().toISOString(),
        })
        .eq('id', usage.id);

      return {
        success: false,
        cappedAt: usage.included_minutes,
        error: 'Usage cap reached. Voice AI paused.',
      };
    }

    if (overageMode === 'approved_overage' && !overageApproved) {
      // Overage mode but not approved - treat as hard stop
      usageLogger.warn({
        msg: 'Voice usage cap reached (overage not approved)',
        businessId,
        used: usage.used_minutes,
        included: usage.included_minutes,
      });

      await supabase
        .from('voice_usage')
        .update({
          used_minutes: usage.included_minutes,
          hard_cap_active: true,
          hard_cap_triggered_at: new Date().toISOString(),
        })
        .eq('id', usage.id);

      return {
        success: false,
        cappedAt: usage.included_minutes,
        error: 'Usage cap reached. Enable overage billing in settings to continue.',
      };
    }

    // Approved overage - allow but track
    usageLogger.info({
      msg: 'Recording overage minutes (approved)',
      businessId,
      overageMinutes: newUsedMinutes - usage.included_minutes,
    });
  }

  // Record usage
  const overageMinutes = Math.max(0, newUsedMinutes - usage.included_minutes);

  const { error: updateError } = await supabase
    .from('voice_usage')
    .update({
      used_minutes: newUsedMinutes,
      overage_minutes: overageMinutes,
      overage_approved: overageMinutes > 0 && !!settings?.overage_opt_in_at,
    })
    .eq('id', usage.id);

  if (updateError) {
    usageLogger.error({ msg: 'Failed to update voice usage', businessId, error: updateError });
    return { success: false, error: 'Failed to record usage' };
  }

  // Send warnings if needed
  const percentUsed = (newUsedMinutes / usage.included_minutes) * 100;
  await sendUsageWarningsIfNeeded(businessId, usage.id, percentUsed, usage);

  return { success: true };
}

/**
 * Get current usage status
 */
export async function getVoiceUsageStatus(businessId: string): Promise<VoiceUsageStatus | null> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('voice_usage')
    .select('*')
    .eq('business_id', businessId)
    .lte('billing_period_start', today)
    .gte('billing_period_end', today)
    .single();

  const { data: settings } = await supabase
    .from('voice_receptionist_settings')
    .select('overage_mode, overage_opt_in_at')
    .eq('business_id', businessId)
    .single();

  if (!usage) {
    return null;
  }

  const usedMinutes = Number(usage.used_minutes);
  const includedMinutes = Number(usage.included_minutes);
  const percentUsed = includedMinutes > 0 ? (usedMinutes / includedMinutes) * 100 : 0;

  return {
    included: includedMinutes,
    used: usedMinutes,
    remaining: Math.max(0, includedMinutes - usedMinutes),
    percentUsed,
    isWarning70: percentUsed >= 70,
    isWarning90: percentUsed >= 90,
    isAtCap: usage.hard_cap_active || percentUsed >= 100,
    overageMode: (settings?.overage_mode as OverageMode) || 'hard_stop',
    overageApproved: !!settings?.overage_opt_in_at,
    overageMinutes: Number(usage.overage_minutes),
  };
}

/**
 * Check if voice AI should be active (not at hard cap)
 */
export async function isVoiceAIActive(businessId: string): Promise<boolean> {
  const status = await getVoiceUsageStatus(businessId);

  if (!status) {
    // No usage record - allow (might be first use)
    return true;
  }

  // If at cap and not approved for overage, voice AI is paused
  if (status.isAtCap && !status.overageApproved) {
    return false;
  }

  return true;
}

/**
 * Check if voice usage is available for a new call
 * Returns detailed information for call handling decisions
 */
export async function checkVoiceUsageAvailable(
  businessId: string
): Promise<{ available: boolean; reason?: string; status?: VoiceUsageStatus }> {
  const status = await getVoiceUsageStatus(businessId);

  if (!status) {
    // No usage record - create one or allow first use
    return { available: true };
  }

  // Check hard cap
  if (status.isAtCap) {
    if (status.overageApproved) {
      // Overage approved, can continue
      return {
        available: true,
        reason: 'Using approved overage minutes',
        status,
      };
    }

    // Hard cap active and no overage approval
    return {
      available: false,
      reason: 'Voice minutes exhausted. Enable overage billing or wait for next billing period.',
      status,
    };
  }

  // Usage available
  return {
    available: true,
    status,
  };
}

/**
 * Enable overage billing (explicit opt-in required)
 * Delta 3: Must be explicitly enabled with timestamp
 */
export async function enableOverageBilling(
  businessId: string,
  approvedBy: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('voice_receptionist_settings')
    .update({
      overage_mode: 'approved_overage',
      overage_opt_in_at: new Date().toISOString(),
      overage_opt_in_by: approvedBy,
    })
    .eq('business_id', businessId);

  if (error) {
    usageLogger.error({ msg: 'Failed to enable overage billing', businessId, error });
    return false;
  }

  // Reset hard cap if it was triggered
  await supabase
    .from('voice_usage')
    .update({ hard_cap_active: false })
    .eq('business_id', businessId);

  usageLogger.info({ msg: 'Overage billing enabled', businessId, approvedBy });
  return true;
}

/**
 * Disable overage billing (switch to hard stop)
 */
export async function disableOverageBilling(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('voice_receptionist_settings')
    .update({
      overage_mode: 'hard_stop',
      overage_opt_in_at: null,
      overage_opt_in_by: null,
    })
    .eq('business_id', businessId);

  if (error) {
    usageLogger.error({ msg: 'Failed to disable overage billing', businessId, error });
    return false;
  }

  usageLogger.info({ msg: 'Overage billing disabled (hard stop mode)', businessId });
  return true;
}

/**
 * Create usage record for a new billing period
 */
export async function createUsageRecord(
  businessId: string,
  planId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): Promise<VoiceUsage | null> {
  const supabase = createAdminClient();

  const includedMinutes = VOICE_MINUTES_BY_PLAN[planId] || 0;

  const { data, error } = await supabase
    .from('voice_usage')
    .insert({
      business_id: businessId,
      billing_period_start: billingPeriodStart.toISOString().split('T')[0],
      billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
      included_minutes: includedMinutes,
      used_minutes: 0,
      overage_minutes: 0,
      overage_approved: false,
      hard_cap_active: false,
    })
    .select()
    .single();

  if (error) {
    usageLogger.error({ msg: 'Failed to create usage record', businessId, error });
    return null;
  }

  return data as VoiceUsage;
}

/**
 * Reset usage for new billing period (called from Stripe webhook)
 */
export async function resetVoiceUsage(
  businessId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date,
  planId?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Get current plan to determine included minutes
  const { data: business } = await supabase
    .from('businesses')
    .select('plan_tier')
    .eq('id', businessId)
    .single();

  const effectivePlanId = planId || `crm_${business?.plan_tier || 'starter'}`;
  const includedMinutes = VOICE_MINUTES_BY_PLAN[effectivePlanId] || 0;

  // Create new usage record or update existing
  const { error } = await supabase
    .from('voice_usage')
    .upsert({
      business_id: businessId,
      billing_period_start: newPeriodStart.toISOString().split('T')[0],
      billing_period_end: newPeriodEnd.toISOString().split('T')[0],
      included_minutes: includedMinutes,
      used_minutes: 0,
      overage_minutes: 0,
      hard_cap_active: false,
      warning_70_sent_at: null,
      warning_90_sent_at: null,
    }, { onConflict: 'business_id,billing_period_start' });

  if (error) {
    usageLogger.error({ msg: 'Failed to reset voice usage', businessId, error });
    return false;
  }

  usageLogger.info({ msg: 'Voice usage reset for new period', businessId, includedMinutes });
  return true;
}

/**
 * Calculate overage charges for billing
 */
export function calculateOverageCharges(overageMinutes: number): number {
  return overageMinutes * VOICE_OVERAGE_RATE;
}

/**
 * Send usage warnings (70%, 90%)
 */
async function sendUsageWarningsIfNeeded(
  businessId: string,
  usageId: string,
  percentUsed: number,
  currentUsage: any
): Promise<void> {
  const supabase = createAdminClient();

  // 70% warning (UI only - passive)
  if (percentUsed >= 70 && !currentUsage.warning_70_sent_at) {
    await supabase
      .from('voice_usage')
      .update({ warning_70_sent_at: new Date().toISOString() })
      .eq('id', usageId);

    usageLogger.info({
      msg: '70% voice usage warning threshold reached',
      businessId,
      percentUsed: percentUsed.toFixed(1),
    });
  }

  // 90% warning (UI + email - active)
  if (percentUsed >= 90 && !currentUsage.warning_90_sent_at) {
    await supabase
      .from('voice_usage')
      .update({ warning_90_sent_at: new Date().toISOString() })
      .eq('id', usageId);

    // TODO: Send email notification
    usageLogger.warn({
      msg: '90% voice usage warning - sending notification',
      businessId,
      percentUsed: percentUsed.toFixed(1),
    });
  }
}
