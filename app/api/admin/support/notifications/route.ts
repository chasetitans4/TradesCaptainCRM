// =====================================================
// ADMIN SUPPORT - NOTIFICATION LOGS API
// GET /api/admin/support/notifications - Get notification logs
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  getNotificationLogs,
  getNotificationQueue,
} from '@/lib/admin/nevermiss-support';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id');
    const action = searchParams.get('action') || 'logs';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'logs': {
        const logs = await getNotificationLogs(organizationId, limit);

        // Group by status for summary
        const summary = {
          pending: logs.filter((l) => l.status === 'pending').length,
          sent: logs.filter((l) => l.status === 'sent').length,
          delivered: logs.filter((l) => l.status === 'delivered').length,
          failed: logs.filter((l) => l.status === 'failed').length,
        };

        return NextResponse.json({
          logs,
          summary,
          count: logs.length,
        });
      }

      case 'queue': {
        const queue = await getNotificationQueue(organizationId);

        return NextResponse.json({
          queue,
          pending_count: queue.length,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in GET /api/admin/support/notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notification data' },
      { status: 500 }
    );
  }
}
