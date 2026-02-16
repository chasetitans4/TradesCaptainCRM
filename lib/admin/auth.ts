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
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be configured');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new Uint8Array(Buffer.from(secret, 'utf-8'));
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
 * Supports JWT-only auth:
 * 1. admin_token cookie (JWT from /api/admin/auth/login)
 * 2. Authorization Bearer header
 *
 * NOTE: Legacy unsigned admin_session cookie is no longer trusted.
 * All auth must go through cryptographically signed JWT tokens.
 */
export async function verifyAdminAuth(_request: NextRequest): Promise<{
  valid: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();

    // Try admin_token cookie (JWT)
    let token = cookieStore.get('admin_token')?.value;

    // Try Authorization header as fallback
    if (!token) {
      const authHeader = _request.headers.get('authorization');
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

    // Always fetch the user from DB to verify current role/status (never trust token payload alone)
    const user = await getAdminUser(payload.userId as string);
    if (!user) {
      return { valid: false, error: 'Authentication failed' };
    }

    if (!user.is_active) {
      return { valid: false, error: 'Authentication failed' };
    }

    return { valid: true, user };
  } catch {
    return { valid: false, error: 'Authentication failed' };
  }
}

/**
 * @deprecated Legacy unsigned session interface — kept for type compatibility only.
 * Do not use for authentication. Use JWT tokens via requireAdmin() instead.
 */
export interface AdminSession {
  adminId: string;
  role: AdminRole;
  expires: string;
}

/**
 * @deprecated Legacy unsigned session cookie is no longer trusted.
 * Always returns null. Use requireAdmin() instead.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  return null;
}

/**
 * Require admin authentication via signed JWT token.
 * Verifies the token, fetches the user from DB, and checks role.
 */
export async function requireAdmin(
  allowedRoles?: AdminRole[]
): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return null;
    }

    const { valid, payload } = await verifyToken(token);

    if (!valid || !payload?.userId) {
      return null;
    }

    const user = await getAdminUser(payload.userId as string);

    if (!user || !user.is_active) {
      return null;
    }

    // Check role if specified
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
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
