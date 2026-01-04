// =====================================================
// ADMIN LOGOUT API
// POST /api/admin/logout - Admin logout
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin logout error',
      path: '/api/admin/logout',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logout failed' },
      { status: 500 }
    );
  }
}
