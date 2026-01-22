// =====================================================
// PORTAL AUDIT LOGGING
// Track customer portal activities for security and support
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import { NextRequest } from 'next/server';

export type PortalActivityAction =
  | 'login_success'
  | 'login_failed'
  | 'login_magic_link'
  | 'logout'
  | 'password_set'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'settings_updated'
  | 'email_change_requested'
  | 'email_change_completed'
  | 'service_request_submitted'
  | 'appointment_scheduled'
  | 'appointment_cancelled'
  | 'invoice_viewed'
  | 'payment_made'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'document_downloaded'
  | 'file_downloaded'
  | 'image_full_res_viewed'
  | 'estimate_viewed'
  | 'estimate_approved'
  | 'estimate_declined'
  | 'estimate_changes_requested'
  | 'estimate_comment_added'
  | 'emergency_request_created'
  | 'emergency_request_cancelled'
  | 'reschedule_requested'
  | 'issue_reported'
  | 'issue_updated'
  | 'issue_cancelled'
  | 'issue_media_uploaded'
  | 'issue_media_deleted'
  | 'issue_video_uploaded'
  | 'job_feedback_submitted'
  | 'referral_submitted';

export interface PortalActivityLog {
  customerId: string;
  businessId: string;
  action: PortalActivityAction;
  details?: Record<string, any>;
  request?: NextRequest;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Extract IP address from request
 */
function getClientIP(request?: NextRequest): string | null {
  if (!request) return null;

  // Check common headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return null;
}

/**
 * Log portal activity for audit trail
 */
export async function logPortalActivity(activity: PortalActivityLog): Promise<void> {
  try {
    const supabase = createAdminClient();

    const ipAddress = activity.ipAddress || getClientIP(activity.request);
    const userAgent = activity.userAgent || activity.request?.headers.get('user-agent') || null;

    const { error } = await supabase.from('portal_activity_log').insert({
      customer_id: activity.customerId,
      business_id: activity.businessId,
      action: activity.action,
      details: activity.details || {},
      ip_address: ipAddress,
      user_agent: userAgent?.slice(0, 500), // Limit user agent length
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Don't throw - logging should not break the main flow
      syncLogger.error({
        msg: 'Failed to log portal activity',
        error: error.message,
        action: activity.action,
        customerId: activity.customerId,
      });
    }
  } catch (error) {
    syncLogger.error({
      msg: 'Error in logPortalActivity',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get activity log for a customer
 */
export async function getCustomerActivityLog(
  customerId: string,
  businessId: string,
  limit: number = 50
): Promise<Array<{
  action: PortalActivityAction;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('portal_activity_log')
    .select('action, details, ip_address, created_at')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch activity log',
      error: error.message,
      customerId,
    });
    return [];
  }

  return data || [];
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  customerId: string,
  businessId: string
): Promise<{
  suspicious: boolean;
  reasons: string[];
}> {
  const supabase = createAdminClient();
  const reasons: string[] = [];

  // Check for multiple failed logins in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: failedLogins } = await supabase
    .from('portal_activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('action', 'login_failed')
    .gte('created_at', oneHourAgo);

  if (failedLogins && failedLogins >= 5) {
    reasons.push(`${failedLogins} failed login attempts in the last hour`);
  }

  // Check for logins from multiple IPs in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentLogins } = await supabase
    .from('portal_activity_log')
    .select('ip_address')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('action', 'login_success')
    .gte('created_at', oneDayAgo);

  if (recentLogins) {
    const uniqueIPs = new Set(recentLogins.map((l) => l.ip_address).filter(Boolean));
    if (uniqueIPs.size >= 5) {
      reasons.push(`Logins from ${uniqueIPs.size} different IP addresses in 24 hours`);
    }
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
