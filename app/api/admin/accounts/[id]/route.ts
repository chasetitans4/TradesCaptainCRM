// =====================================================
// ADMIN SINGLE CRM ACCOUNT API
// GET /api/admin/accounts/:id - Get account details
// PUT /api/admin/accounts/:id - Update account
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher, requireAdminOrHigher } from '@/lib/admin/auth';
import { getCRMAccount, updateCRMAccount, logAdminActivity } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const account = await getCRMAccount(id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Agents can only see their own accounts
    if (admin.role === 'agent' && account.created_by_agent_id !== admin.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching account',
      path: '/api/admin/accounts/[id]',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get account' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const account = await getCRMAccount(id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.business_name !== undefined) updates.business_name = body.business_name;
    if (body.owner_email !== undefined) updates.owner_email = body.owner_email;
    if (body.owner_name !== undefined) updates.owner_name = body.owner_name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.plan_type !== undefined) updates.plan_type = body.plan_type;
    if (body.monthly_price !== undefined) updates.monthly_price = body.monthly_price;

    const updatedAccount = await updateCRMAccount(id, updates);

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(admin.id, 'updated_account', 'crm_account', id, updates, ip);

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    apiLogger.error({
      msg: 'Error updating account',
      path: '/api/admin/accounts/[id]',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 400 }
    );
  }
}
