// =====================================================
// PIPELINE LEAD DETAIL API
// GET /api/pipeline/leads/:leadId
// PATCH /api/pipeline/leads/:leadId
// DELETE /api/pipeline/leads/:leadId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLead, updateLead, deleteLead, moveLeadToStage } from '@/lib/admin/pipeline';
import type { PipelineStage } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const lead = await getLead(leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    apiLogger.error({ error, context: 'Get lead error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Special handling for stage moves
    if (body.action === 'move_stage') {
      const lead = await moveLeadToStage(
        leadId,
        admin.id,
        body.stage as PipelineStage,
        { lost_reason: body.lost_reason }
      );
      return NextResponse.json({ lead });
    }

    const lead = await updateLead(leadId, admin.id, body);

    return NextResponse.json({ lead });
  } catch (error) {
    apiLogger.error({ error, context: 'Update lead error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;

    await deleteLead(leadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Delete lead error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
