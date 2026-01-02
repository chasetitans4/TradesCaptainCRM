// =====================================================
// ADMIN AUTH HELPERS
// Helper functions for admin authentication middleware
// =====================================================

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getAdminUser, AdminUser, AdminRole } from './index';
import { jwtVerify } from 'jose';

/**
 * Get JWT secret key - throws if not configured
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be configured');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verify JWT token using jose library
 */
async function verifyToken(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
  try {
    const secret = getJwtSecret();
    const options: Record<string, unknown> = { algorithms: ['HS256'] };
    if (process.env.JWT_ISSUER) {
      options['issuer'] = process.env.JWT_ISSUER;
    }
    if (process.env.JWT_AUDIENCE) {
      options['audience'] = process.env.JWT_AUDIENCE;
    }
    const { payload } = await jwtVerify(token, secret, options as any);
    return { valid: true, payload: payload as Record<string, unknown> };
  } catch {
    return { valid: false };
  }
}

/**
 * Verify admin authentication from request
 * Can use either cookie or Authorization header
 */
export async function verifyAdminAuth(request: NextRequest): Promise<{
  valid: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    // Try cookie first
    const cookieStore = await cookies();
    let token = cookieStore.get('admin_token')?.value;

    // Try Authorization header as fallback
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    const { valid, payload } = await verifyToken(token);
    if (!valid || !payload) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const user = await getAdminUser(payload.userId as string);
    if (!user) {
      return { valid: false, error: 'User not found' };
    }

    if (!user.is_active) {
      return { valid: false, error: 'User account is not active' };
    }

    return { valid: true, user };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Authentication failed' };
  }
}

export interface AdminSession {
  adminId: string;
  role: AdminRole;
  expires: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return null;
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    ) as AdminSession;

    // Check expiry
    if (new Date(sessionData.expires) < new Date()) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

export async function requireAdmin(
  allowedRoles?: AdminRole[]
): Promise<AdminUser | null> {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return null;
  }

  const admin = await getAdminUser(session.adminId);
  return admin;
}

export async function requireSuperAdmin(): Promise<AdminUser | null> {
  return requireAdmin(['super_admin']);
}

export async function requireAdminOrHigher(): Promise<AdminUser | null> {
  return requireAdmin(['super_admin', 'admin']);
}

export async function requireAgentOrHigher(): Promise<AdminUser | null> {
  return requireAdmin(['super_admin', 'admin', 'agent']);
}
