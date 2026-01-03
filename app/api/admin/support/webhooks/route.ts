// =====================================================
// ADMIN SUPPORT - WEBHOOK EVENTS API
// GET /api/admin/support/webhooks - Get webhook events
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  getWebhookEvents,
  getOrphanedStatusEvents,
  checkForDuplicateEvents,
} from '@/lib/admin/leads-captain-support';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id');
    const conversationId = searchParams.get('conversation_id');
    const action = searchParams.get('action') || 'events';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    switch (action) {
      case 'events': {
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organization_id is required' },
            { status: 400 }
          );
        }

        const events = await getWebhookEvents(organizationId, limit);

        return NextResponse.json({
          events,
          count: events.length,
        });
      }

      case 'orphaned': {
        // Get orphaned status events (unprocessed for > 5 minutes)
        const orphaned = await getOrphanedStatusEvents();

        return NextResponse.json({
          orphaned_events: orphaned,
          count: orphaned.length,
          message: orphaned.length > 0
            ? 'There are orphaned status events that may indicate a processing issue'
            : 'No orphaned events found',
        });
      }

      case 'duplicates': {
        if (!conversationId) {
          return NextResponse.json(
            { error: 'conversation_id is required for duplicate check' },
            { status: 400 }
          );
        }

        const duplicates = await checkForDuplicateEvents(conversationId);

        return NextResponse.json({
          duplicates,
          has_duplicates: duplicates.length > 0,
          message: duplicates.length > 0
            ? 'Duplicate events found - may indicate webhook retry issues'
            : 'No duplicate events found',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in GET /api/admin/support/webhooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get webhook data' },
      { status: 500 }
    );
  }
}
