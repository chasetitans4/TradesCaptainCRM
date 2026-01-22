// =====================================================
// ADMIN SINGLE CRM ACCOUNT API
// GET /api/admin/accounts/:id - Get account details
// PUT /api/admin/accounts/:id - Update account
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher, requireAdminOrHigher } from '@/lib/admin/auth';
import { getCRMAccount, updateCRMAccount, logAdminActivity } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/server';
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

    // Try to get from crm_accounts first (for admin-created accounts)
    const crmAccount = await getCRMAccount(id);

    // Also try to get from businesses table (for self-registered businesses)
    const supabase = createAdminClient();
    const { data: business } = await supabase
      .from('businesses')
      .select(`
        *,
        users!users_business_id_fkey(id, name, email, role)
      `)
      .eq('id', id)
      .single();

    // If neither exists, return 404
    if (!crmAccount && !business) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Agents can only see their own accounts (for crm_accounts)
    if (crmAccount && admin.role === 'agent' && crmAccount.created_by_agent_id !== admin.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get stats for the business
    let userCount = 0;
    let customerCount = 0;
    let jobCount = 0;

    if (business) {
      // Count users
      userCount = business.users?.length || 0;

      // Count customers
      const { count: custCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', id);
      customerCount = custCount || 0;

      // Count jobs
      const { count: jCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', id);
      jobCount = jCount || 0;
    }

    // Merge data from both sources, preferring business data if available
    const owner = business?.users?.find((u: any) => u.role === 'owner') || business?.users?.[0];
    const account = {
      id,
      business_name: business?.name || crmAccount?.business_name,
      owner_name: owner?.name || crmAccount?.owner_name,
      owner_email: owner?.email || crmAccount?.owner_email,
      phone: business?.phone || crmAccount?.phone,
      email: business?.email,
      website: business?.website,
      address: business?.address,
      city: business?.city,
      state: business?.state,
      zip: business?.zip,
      logo_url: business?.logo_url,
      primary_color: business?.primary_color,
      plan_type: business?.plan_tier || crmAccount?.plan_type,
      plan_status: business?.subscription_status || crmAccount?.plan_status || 'active',
      trial_start_date: crmAccount?.trial_start_date,
      trial_end_date: crmAccount?.trial_end_date,
      founders_start_date: crmAccount?.founders_start_date,
      founders_end_date: crmAccount?.founders_end_date,
      cancelled_at: crmAccount?.cancelled_at,
      created_at: business?.created_at || crmAccount?.created_at,
      user_count: userCount,
      customer_count: customerCount,
      job_count: jobCount,
    };

    return NextResponse.json(account);
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
