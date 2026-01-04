// =====================================================
// ADMIN ME API
// GET /api/admin/me - Get current admin user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminUser } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check expiry
    if (new Date(sessionData.expires) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const admin = await getAdminUser(sessionData.adminId);

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get admin me error',
      path: '/api/admin/me',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get admin' },
      { status: 500 }
    );
  }
}
