// =====================================================
// FOUNDERS STATUS API
// GET /api/admin/founders/status - Get founders program status
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getFoundersStatus } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getFoundersStatus();

    return NextResponse.json({
      total_slots: status.total_slots,
      slots_used: status.slots_used,
      slots_remaining: status.total_slots - status.slots_used,
      is_open: status.is_open,
      closed_at: status.closed_at,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/founders/status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get founders status' },
      { status: 500 }
    );
  }
}
