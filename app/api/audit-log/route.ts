// =====================================================
// AUDIT LOG API
// GET /api/audit-log - Get audit log entries
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getAuditLog, getAuditSummary } from '@/lib/audit';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and owners to view audit log
    if (!['admin', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'list';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action') || undefined;
    const targetType = searchParams.get('targetType') || undefined;
    const targetId = searchParams.get('targetId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    if (mode === 'summary') {
      const days = parseInt(searchParams.get('days') || '30');
      const summary = await getAuditSummary(profile.business_id, days);
      return NextResponse.json(summary);
    }

    const result = await getAuditLog(profile.business_id, {
      limit,
      offset,
      action,
      targetType,
      targetId,
      userId,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({
      msg: 'Audit log GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get audit log' },
      { status: 500 }
    );
  }
}
