// =====================================================
// ADMIN LOGOUT API
// POST /api/admin/logout - Admin logout
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/admin/logout:', error);
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
