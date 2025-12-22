// =====================================================
// CLOSE FOUNDERS PROGRAM API
// PUT /api/admin/founders/close - Close founders program
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { closeFoundersProgram, logAdminActivity } from '@/lib/admin';

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized - Super admin only' }, { status: 401 });
    }

    await closeFoundersProgram();

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(admin.id, 'closed_founders_program', undefined, undefined, undefined, ip);

    return NextResponse.json({
      success: true,
      message: 'Founders program has been closed',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/founders/close:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close founders program' },
      { status: 400 }
    );
  }
}
