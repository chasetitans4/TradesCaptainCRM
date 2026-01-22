// =====================================================
// ADMIN PROFILE API
// PATCH /api/admin/profile - Update current admin profile
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be configured');
  }
  return secret;
}

function verifyToken(token: string): { valid: boolean; payload?: any } {
  const crypto = require('crypto');
  const [payloadStr, signature] = token.split('.');
  if (!payloadStr || !signature) return { valid: false };

  const jwtSecret = getJwtSecret();
  const expectedSig = crypto
    .createHmac('sha256', jwtSecret)
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

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { valid, payload } = verifyToken(token);
    if (!valid || !payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, phone, timezone } = body;

    const supabase = createAdminClient();

    const updateData: Record<string, string> = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', payload.userId)
      .select()
      .single();

    if (error) {
      apiLogger.error({
        msg: 'Failed to update admin profile',
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, two_factor_secret, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin profile update error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
