// =====================================================
// ADMIN LEADS API
// GET/POST /api/admin/leads
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLeads, createLead } from '@/lib/admin/leads';
import { checkPermission, hasServerPermission, getServerSession } from '@/lib/permissions/check-permission';
import { LeadStatus } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    if (!await hasServerPermission('view_admin_leads')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;
    const status = searchParams.get('status') as LeadStatus | undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    // Non-management roles can only see their own leads
    // Note: session.user.role is typed as string | AdminRole, but checkPermission verifies it.
    const userRole = session.user.role;
    const effectiveAgentId = ['super_admin', 'admin', 'finance'].includes(userRole)
      ? agentId
      : session.user.id;

    const result = await getLeads({
      agentId: effectiveAgentId,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({
      msg: 'Get leads error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkPermission('manage_admin_leads');
    
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const lead = await createLead(session.user.id, data);

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    apiLogger.error({
      msg: 'Create lead error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead' },
      { status: 500 }
    );
  }
}
