// =====================================================
// ADMIN AUTH HELPERS
// Helper functions for admin authentication middleware
// =====================================================

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getAdminUser, AdminUser, AdminRole } from './index';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';

function verifyToken(token: string): { valid: boolean; payload?: any } {
  const crypto = require('crypto');
  const [payloadStr, signature] = token.split('.');
  if (!payloadStr || !signature) return { valid: false };

  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadStr)
    .digest('base64url');

  if (signature !== expectedSig) return { valid: false };

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) return { valid: false };
    return { valid: true, payload };
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

    const { valid, payload } = verifyToken(token);
    if (!valid || !payload) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const user = await getAdminUser(payload.userId);
    if (!user) {
      return { valid: false, error: 'User not found' };
    }

    if (user.status !== 'active') {
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
