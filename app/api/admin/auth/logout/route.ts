// =====================================================
// ADMIN LOGOUT API
// POST /api/admin/auth/logout
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear auth cookies
    cookieStore.delete({ name: 'admin_token', path: '/' });
    cookieStore.delete({ name: 'admin_refresh_token', path: '/' });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin logout error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
