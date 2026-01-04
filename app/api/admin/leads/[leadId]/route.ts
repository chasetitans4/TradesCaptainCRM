// =====================================================
// ADMIN LEAD DETAIL API
// GET/PATCH/DELETE /api/admin/leads/:leadId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead, deleteLead, getLeadActivities } from '@/lib/admin/leads';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const lead = await getLead(leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Non-management roles can only see their own leads
    if (!['super_admin', 'admin', 'finance'].includes(auth.user.role)) {
      if (lead.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get activities
    const activities = await getLeadActivities(leadId);

    return NextResponse.json({ lead, activities });
  } catch (error) {
    apiLogger.error({
      msg: 'Get lead error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get lead' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const lead = await getLead(leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Non-management roles can only update their own leads
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      if (lead.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const updatedLead = await updateLead(leadId, body, auth.user.id);

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    apiLogger.error({
      msg: 'Update lead error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete leads
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leadId } = await params;
    await deleteLead(leadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Delete lead error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
