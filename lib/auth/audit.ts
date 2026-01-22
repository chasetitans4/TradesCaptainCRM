// =====================================================
// SECURITY AUDIT LOGGING
// Track all security-relevant events
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_complete'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_success'
  | '2fa_failed'
  | 'backup_codes_generated'
  | 'backup_codes_regenerated'
  | 'pin_set'
  | 'pin_failed'
  | 'pin_disabled'
  | 'session_revoked'
  | 'all_sessions_revoked'
  | 'suspicious_activity'
  | 'account_locked'
  | 'account_unlocked'
  | 'email_change'
  | 'phone_change'
  | 'permission_change'
  | 'data_export'
  | 'api_key_created'
  | 'api_key_revoked';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id: string;
  userId: string | null;
  businessId: string | null;
  eventType: SecurityEventType;
  description: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  riskLevel: RiskLevel;
  createdAt: string;
}

/**
 * Determine risk level based on event type
 */
function getRiskLevel(eventType: SecurityEventType): RiskLevel {
  const criticalRisk: SecurityEventType[] = [
    'suspicious_activity',
    'account_locked',
  ];

  const highRisk: SecurityEventType[] = [
    'password_change',
    'password_reset_complete',
    '2fa_disabled',
    'all_sessions_revoked',
    'email_change',
    'api_key_created',
    'api_key_revoked',
  ];

  const mediumRisk: SecurityEventType[] = [
    'login_failed',
    '2fa_failed',
    'pin_failed',
    'session_revoked',
    'password_reset_request',
  ];

  if (criticalRisk.includes(eventType)) return 'critical';
  if (highRisk.includes(eventType)) return 'high';
  if (mediumRisk.includes(eventType)) return 'medium';
  return 'low';
}

/**
 * Get request metadata from headers
 */
async function getRequestMetadata(): Promise<{
  ip: string;
  userAgent: string;
}> {
  try {
    const headersList = await headers();
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    return { ip, userAgent };
  } catch {
    return { ip: 'unknown', userAgent: 'unknown' };
  }
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  userId: string | null,
  eventType: SecurityEventType,
  metadata: Record<string, any>,
  businessId?: string
): Promise<void> {
  const { ip, userAgent } = await getRequestMetadata();

  const supabase = await createClient();

  // Get business ID if not provided
  let finalBusinessId = businessId;
  if (!finalBusinessId && userId) {
    const { data: user } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', userId)
      .single();
    finalBusinessId = user?.business_id;
  }

  await supabase.from('security_events').insert({
    user_id: userId,
    business_id: finalBusinessId,
    event_type: eventType,
    metadata,
    ip_address: ip,
    user_agent: userAgent,
    risk_level: getRiskLevel(eventType),
  });
}

/**
 * Get security events for a user
 */
export async function getUserSecurityEvents(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventTypes?: SecurityEventType[];
    riskLevels?: RiskLevel[];
  }
): Promise<{ events: SecurityEvent[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('security_events')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.eventTypes?.length) {
    query = query.in('event_type', options.eventTypes);
  }

  if (options?.riskLevels?.length) {
    query = query.in('risk_level', options.riskLevels);
  }

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count } = await query;

  const events =
    data?.map((e) => ({
      id: e.id,
      userId: e.user_id,
      businessId: e.business_id,
      eventType: e.event_type as SecurityEventType,
      description: e.description,
      metadata: e.metadata,
      ipAddress: e.ip_address,
      userAgent: e.user_agent,
      location: e.location,
      riskLevel: e.risk_level as RiskLevel,
      createdAt: e.created_at,
    })) || [];

  return { events, total: count || 0 };
}

/**
 * Get recent high-risk events for a business (security dashboard)
 */
export async function getHighRiskEvents(
  businessId: string,
  limit: number = 50
): Promise<SecurityEvent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('security_events')
    .select(
      `
      *,
      user:users!security_events_user_id_fkey(name, email)
    `
    )
    .eq('business_id', businessId)
    .in('risk_level', ['high', 'critical'])
    .order('created_at', { ascending: false })
    .limit(limit);

  return (
    data?.map((e) => ({
      id: e.id,
      userId: e.user_id,
      businessId: e.business_id,
      eventType: e.event_type as SecurityEventType,
      description: e.description,
      metadata: { ...e.metadata, user: e.user },
      ipAddress: e.ip_address,
      userAgent: e.user_agent,
      location: e.location,
      riskLevel: e.risk_level as RiskLevel,
      createdAt: e.created_at,
    })) || []
  );
}

/**
 * Get security summary for dashboard
 */
export async function getSecuritySummary(
  businessId: string,
  days: number = 30
): Promise<{
  totalEvents: number;
  failedLogins: number;
  failed2FA: number;
  highRiskEvents: number;
  activeUsers: number;
}> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get counts for different event types
  const [totalResult, failedLoginsResult, failed2FAResult, highRiskResult] =
    await Promise.all([
      supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', since),
      supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('event_type', 'login_failed')
        .gte('created_at', since),
      supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('event_type', '2fa_failed')
        .gte('created_at', since),
      supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .in('risk_level', ['high', 'critical'])
        .gte('created_at', since),
    ]);

  // Get active user count
  const { count: activeUsers } = await supabase
    .from('user_sessions')
    .select('user_id', { count: 'exact', head: true })
    .eq('is_active', true);

  return {
    totalEvents: totalResult.count || 0,
    failedLogins: failedLoginsResult.count || 0,
    failed2FA: failed2FAResult.count || 0,
    highRiskEvents: highRiskResult.count || 0,
    activeUsers: activeUsers || 0,
  };
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  userId: string
): Promise<{ suspicious: boolean; reason?: string }> {
  const supabase = await createClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check for multiple failed login attempts
  const { count: failedLogins } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'login_failed')
    .gte('created_at', oneHourAgo);

  if ((failedLogins || 0) >= 5) {
    return { suspicious: true, reason: 'Multiple failed login attempts' };
  }

  // Check for multiple 2FA failures
  const { count: failed2FA } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', '2fa_failed')
    .gte('created_at', oneHourAgo);

  if ((failed2FA || 0) >= 3) {
    return { suspicious: true, reason: 'Multiple 2FA failures' };
  }

  // Check for logins from multiple IPs in short time
  const { data: recentLogins } = await supabase
    .from('security_events')
    .select('ip_address')
    .eq('user_id', userId)
    .eq('event_type', 'login_success')
    .gte('created_at', oneHourAgo);

  const uniqueIPs = new Set(recentLogins?.map((l) => l.ip_address));
  if (uniqueIPs.size >= 3) {
    return { suspicious: true, reason: 'Logins from multiple locations' };
  }

  return { suspicious: false };
}

/**
 * Format event for display
 */
export function formatSecurityEventDescription(event: SecurityEvent): string {
  const eventDescriptions: Record<SecurityEventType, string> = {
    login_success: 'Signed in',
    login_failed: 'Failed sign-in attempt',
    logout: 'Signed out',
    password_change: 'Changed password',
    password_reset_request: 'Requested password reset',
    password_reset_complete: 'Reset password',
    '2fa_enabled': 'Enabled two-factor authentication',
    '2fa_disabled': 'Disabled two-factor authentication',
    '2fa_success': 'Verified two-factor code',
    '2fa_failed': 'Failed two-factor verification',
    backup_codes_generated: 'Generated backup codes',
    backup_codes_regenerated: 'Regenerated backup codes',
    pin_set: 'Set up PIN',
    pin_failed: 'Failed PIN verification',
    pin_disabled: 'Disabled PIN',
    session_revoked: 'Signed out from a device',
    all_sessions_revoked: 'Signed out from all devices',
    suspicious_activity: 'Suspicious activity detected',
    account_locked: 'Account locked',
    account_unlocked: 'Account unlocked',
    email_change: 'Changed email address',
    phone_change: 'Changed phone number',
    permission_change: 'Changed permissions',
    data_export: 'Exported data',
    api_key_created: 'Created API key',
    api_key_revoked: 'Revoked API key',
  };

  return eventDescriptions[event.eventType] || event.eventType;
}
