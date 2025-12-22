// =====================================================
// CUSTOMER PORTAL SESSION MANAGEMENT
// JWT-based sessions for portal authentication
// =====================================================

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@/lib/supabase/server';

const PORTAL_SESSION_COOKIE = 'portal_session';
const SESSION_DURATION_DAYS = 30;

interface PortalSession {
  customerId: string;
  accessId: string;
  businessId: string;
  businessName: string;
  customerName: string;
  email: string;
  iat: number;
  exp: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.PORTAL_SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('PORTAL_SESSION_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a portal session after successful authentication
 */
export async function createPortalSession(
  customerId: string,
  accessId: string,
  businessId: string
): Promise<string> {
  const supabase = await createClient();

  // Get customer and business info
  const [{ data: customer }, { data: business }] = await Promise.all([
    supabase.from('customers').select('name, email').eq('id', customerId).single(),
    supabase.from('businesses').select('name').eq('id', businessId).single(),
  ]);

  const token = await new SignJWT({
    customerId,
    accessId,
    businessId,
    businessName: business?.name || '',
    customerName: customer?.name || '',
    email: customer?.email || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  });

  return token;
}

/**
 * Get current portal session
 */
export async function getPortalSession(
  businessSlug?: string
): Promise<PortalSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, getSecretKey());
    const session = payload as unknown as PortalSession;

    // If businessSlug provided, verify it matches
    if (businessSlug) {
      const supabase = await createClient();
      const { data: settings } = await supabase
        .from('booking_settings')
        .select('business_id')
        .eq('booking_url_slug', businessSlug)
        .single();

      if (settings && settings.business_id !== session.businessId) {
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Get portal session from token (for API routes)
 */
export async function verifyPortalToken(token: string): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as PortalSession;
  } catch {
    return null;
  }
}

/**
 * Destroy portal session (logout)
 */
export async function destroyPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE);
}

/**
 * Refresh portal session (extend expiry)
 */
export async function refreshPortalSession(): Promise<void> {
  const session = await getPortalSession();

  if (!session) {
    return;
  }

  // Create new session with same data
  await createPortalSession(session.customerId, session.accessId, session.businessId);
}

/**
 * Check if portal session is valid
 */
export async function isPortalSessionValid(): Promise<boolean> {
  const session = await getPortalSession();
  return session !== null;
}

/**
 * Get business ID from portal session
 */
export async function getPortalBusinessId(): Promise<string | null> {
  const session = await getPortalSession();
  return session?.businessId || null;
}

/**
 * Get customer ID from portal session
 */
export async function getPortalCustomerId(): Promise<string | null> {
  const session = await getPortalSession();
  return session?.customerId || null;
}

/**
 * Require portal session (throw if not authenticated)
 */
export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();

  if (!session) {
    throw new Error('Portal authentication required');
  }

  return session;
}

/**
 * Get business slug for redirect
 */
export async function getBusinessSlug(businessId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('booking_settings')
    .select('booking_url_slug')
    .eq('business_id', businessId)
    .single();

  return data?.booking_url_slug || null;
}
