// =====================================================
// ADMIN LOGIN API
// POST /api/admin/auth/login
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function createToken(payload: any, expiresIn: number): string {
  const crypto = require('crypto');
  const expPayload = { ...payload, exp: Date.now() + expiresIn };
  const payloadStr = base64Encode(JSON.stringify(expPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${signature}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const crypto = require('crypto');
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = createToken(
      { userId: user.id, email: user.email, role: user.role, type: 'access' },
      15 * 60 * 1000 // 15 minutes
    );

    const refreshToken = createToken(
      { userId: user.id, email: user.email, role: user.role, type: 'refresh' },
      7 * 24 * 60 * 60 * 1000 // 7 days
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
    cookieStore.set('admin_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/admin',
    });

    cookieStore.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/admin',
    });

    // Return user (without sensitive fields)
    const { password_hash, two_factor_secret, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
