// =====================================================
// ADMIN CRM ACCOUNTS API
// GET /api/admin/accounts - List CRM accounts
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getCRMAccounts, PlanStatus, PlanType } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as PlanStatus | null;
    const planType = searchParams.get('plan_type') as PlanType | null;
    const agentId = searchParams.get('agent_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    // Agents can only see their own accounts
    const filters: Record<string, any> = {};
    if (admin.role === 'agent') {
      filters.agentId = admin.id;
    } else if (agentId) {
      filters.agentId = agentId;
    }

    if (status) filters.status = status;
    if (planType) filters.planType = planType;
    if (search) filters.search = search;

    const { accounts, total } = await getCRMAccounts(filters, page, limit);

    return NextResponse.json({
      accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get accounts' },
      { status: 500 }
    );
  }
}
