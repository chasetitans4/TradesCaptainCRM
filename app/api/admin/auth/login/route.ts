// =====================================================
// ADMIN LOGIN API
// POST /api/admin/auth/login
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { checkLoginRateLimit } from '@/lib/rate-limit';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { apiLogger } from '@/lib/logger';

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
  return new TextEncoder().encode(secret);
}

/**
 * Create JWT token using jose library
 */
async function createToken(
  payload: Record<string, unknown>,
  expiresIn: string
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verify password using bcrypt (secure) or legacy PBKDF2 (for migration)
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash);
  }

  // Legacy PBKDF2 format: salt:hash - use timing-safe comparison
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-real-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    // Check Redis-backed rate limit (5 attempts per 15 minutes per IP)
    const rateLimit = await checkLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 900).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      apiLogger.warn({ msg: 'Admin login failed: user lookup', email });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      apiLogger.warn({ msg: 'Admin login failed: inactive account', email });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      apiLogger.warn({ msg: 'Admin login failed: bad password', email });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate tokens using jose
    const accessToken = await createToken(
      { userId: user.id, email: user.email, role: user.role, type: 'access' },
      '15m' // 15 minutes
    );

    const refreshToken = await createToken(
      { userId: user.id, email: user.email, role: user.role, type: 'refresh' },
      '7d' // 7 days
    );

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Log activity
    await supabase.from('admin_activity_log').insert({
      admin_user_id: user.id,
      action: 'login',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    });

    // Set cookies
    const cookieStore = await cookies();
    const isLocal = request.headers.get('host')?.includes('localhost');
    const secureCookie = process.env.NODE_ENV === 'production' && !isLocal;

    cookieStore.set('admin_token', accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    cookieStore.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Return user (without sensitive fields)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, two_factor_secret, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin login error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
