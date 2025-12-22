// =====================================================
// ADMIN LOGOUT API
// POST /api/admin/auth/logout
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear auth cookies
    cookieStore.delete('admin_token');
    cookieStore.delete('admin_refresh_token');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
