// =====================================================
// SESSION MANAGEMENT
// Track and manage user sessions across devices
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';
import { logSecurityEvent } from './audit';
import { UAParser } from 'ua-parser-js';

export interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string | null;
  isCurrent: boolean;
  twoFactorVerified: boolean;
  lastActive: string;
  createdAt: string;
}

export interface CreateSessionOptions {
  ip: string;
  userAgent: string;
  city?: string;
  country?: string;
}

/**
 * Parse user agent string to get device info
 */
function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    deviceType: result.device.type || 'desktop',
    deviceName: `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`,
  };
}

/**
 * Create new session for user
 */
export async function createSession(
  userId: string,
  options: CreateSessionOptions
): Promise<string> {
  const sessionToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  const { browser, os, deviceType, deviceName } = parseUserAgent(options.userAgent);

  const supabase = await createClient();

  // Mark all other sessions as not current
  await supabase
    .from('user_sessions')
    .update({ is_current: false })
    .eq('user_id', userId);

  // Create new session
  await supabase.from('user_sessions').insert({
    user_id: userId,
    session_token_hash: tokenHash,
    device_type: deviceType,
    device_name: deviceName,
    browser,
    os,
    ip_address: options.ip,
    city: options.city,
    country: options.country,
    is_current: true,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  });

  await logSecurityEvent(userId, 'login_success', {
    device: deviceName,
    ip: options.ip,
    location: options.city && options.country ? `${options.city}, ${options.country}` : undefined,
  });

  return sessionToken;
}

/**
 * Validate session token
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
  twoFactorVerified?: boolean;
}> {
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  const supabase = await createClient();

  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token_hash', tokenHash)
    .eq('is_active', true)
    .single();

  if (!session) {
    return { valid: false };
  }

  // Check if expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await supabase
      .from('user_sessions')
      .update({ is_active: false, ended_reason: 'expired' })
      .eq('id', session.id);
    return { valid: false };
  }

  // Update last active
  await supabase
    .from('user_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', session.id);

  return {
    valid: true,
    userId: session.user_id,
    twoFactorVerified: session.two_factor_verified,
  };
}

/**
 * Mark session as 2FA verified
 */
export async function markSession2FAVerified(sessionToken: string): Promise<void> {
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  const supabase = await createClient();
  await supabase
    .from('user_sessions')
    .update({
      two_factor_verified: true,
      two_factor_verified_at: new Date().toISOString(),
    })
    .eq('session_token_hash', tokenHash);
}

/**
 * Get user's active sessions
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_active_at', { ascending: false });

  return (
    sessions?.map((s) => ({
      id: s.id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ip_address,
      location: s.city && s.country ? `${s.city}, ${s.country}` : null,
      isCurrent: s.is_current,
      twoFactorVerified: s.two_factor_verified,
      lastActive: s.last_active_at,
      createdAt: s.created_at,
    })) || []
  );
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      ended_reason: 'revoked',
    })
    .eq('id', sessionId)
    .eq('user_id', userId);

  await logSecurityEvent(userId, 'session_revoked', { sessionId });
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionToken: string
): Promise<number> {
  const currentTokenHash = createHash('sha256').update(currentSessionToken).digest('hex');

  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .neq('session_token_hash', currentTokenHash);

  if (sessions?.length) {
    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        ended_reason: 'revoked',
      })
      .eq('user_id', userId)
      .neq('session_token_hash', currentTokenHash);

    await logSecurityEvent(userId, 'all_sessions_revoked', { count: sessions.length });
  }

  return sessions?.length || 0;
}

/**
 * Revoke all sessions (e.g., on password change)
 */
export async function revokeAllSessions(
  userId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      ended_reason: reason,
    })
    .eq('user_id', userId)
    .eq('is_active', true);

  await logSecurityEvent(userId, 'all_sessions_revoked', { reason });
}

/**
 * Logout current session
 */
export async function logout(sessionToken: string): Promise<void> {
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  const supabase = await createClient();

  const { data: session } = await supabase
    .from('user_sessions')
    .select('user_id')
    .eq('session_token_hash', tokenHash)
    .single();

  await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      ended_reason: 'logout',
    })
    .eq('session_token_hash', tokenHash);

  if (session?.user_id) {
    await logSecurityEvent(session.user_id, 'logout', {});
  }
}

/**
 * Get session count for user
 */
export async function getActiveSessionCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  return count || 0;
}

/**
 * Extend session expiry
 */
export async function extendSession(sessionToken: string, days: number = 30): Promise<void> {
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  const supabase = await createClient();
  await supabase
    .from('user_sessions')
    .update({
      expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('session_token_hash', tokenHash);
}
