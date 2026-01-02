// =====================================================
// LEAD ACTIVITIES API
// GET /api/pipeline/leads/:leadId/activities
// POST /api/pipeline/leads/:leadId/activities
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLeadActivities, logActivity } from '@/lib/admin/pipeline';
import type { LeadActivityType } from '@/lib/admin/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const activities = await getLeadActivities(leadId);

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const body = await request.json();

    const activity = await logActivity(
      leadId,
      admin.id,
      body.activity_type as LeadActivityType,
      body.description,
      {
        duration_minutes: body.duration_minutes,
        outcome: body.outcome,
      }
    );

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error: any) {
    console.error('Log activity error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log activity' },
      { status: 500 }
    );
  }
}
