import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserSecurityEvents,
  getHighRiskEvents,
  getSecuritySummary,
} from '@/lib/auth/audit';
import { apiLogger } from '@/lib/logger';

// GET - Get security events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view'); // 'user' | 'business' | 'summary'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const riskLevels = searchParams.get('riskLevels')?.split(',');
    const eventTypes = searchParams.get('eventTypes')?.split(',');

    // Get user's business ID for admin queries
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    switch (view) {
      case 'summary': {
        // Business security summary (admin only)
        if (!profile?.business_id || !['owner', 'admin'].includes(profile?.role)) {
          return NextResponse.json(
            { error: 'Unauthorized to view business summary' },
            { status: 403 }
          );
        }

        const days = parseInt(searchParams.get('days') || '30');
        const summary = await getSecuritySummary(profile.business_id, days);
        return NextResponse.json(summary);
      }

      case 'business': {
        // High-risk events for business (admin only)
        if (!profile?.business_id || !['owner', 'admin'].includes(profile?.role)) {
          return NextResponse.json(
            { error: 'Unauthorized to view business events' },
            { status: 403 }
          );
        }

        const events = await getHighRiskEvents(profile.business_id, limit);
        return NextResponse.json({ events });
      }

      case 'user':
      default: {
        // User's own security events
        const { events, total } = await getUserSecurityEvents(user.id, {
          limit,
          offset,
          riskLevels: riskLevels as any,
          eventTypes: eventTypes as any,
        });

        return NextResponse.json({
          events,
          total,
          limit,
          offset,
          hasMore: offset + events.length < total,
        });
      }
    }
  } catch (error) {
    apiLogger.error({ msg: 'Get security events error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
