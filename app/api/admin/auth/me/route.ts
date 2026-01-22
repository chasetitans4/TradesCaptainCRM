// =====================================================
// ADMIN CURRENT USER API
// GET /api/admin/auth/me
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be configured');
  }
  return new TextEncoder().encode(secret);
}

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, getJwtSecret());
      payload = verifiedPayload;
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', payload.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, two_factor_secret, ...safeUser } = user;

    return NextResponse.json({ user: { ...safeUser, name: (safeUser as any).full_name } });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin me error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
