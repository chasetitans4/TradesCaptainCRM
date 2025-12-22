// =====================================================
// ADMIN WEB CUSTOMERS API
// Manage web plan customers
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    let query = supabase
      .from('web_customers')
      .select(`
        *,
        agent:admin_users!web_customers_agent_id_fkey(id, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // If agent role, only show their customers
    if (auth.user!.role === 'agent') {
      query = query.eq('agent_id', auth.user!.id);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: customers, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      customers,
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Error fetching web customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch web customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const {
      business_name,
      contact_name,
      email,
      phone,
      plan_type,
      billing_interval,
      agent_id,
    } = body;

    if (!business_name || !contact_name || !email || !plan_type) {
      return NextResponse.json(
        { error: 'Business name, contact name, email, and plan type are required' },
        { status: 400 }
      );
    }

    // Calculate MRR based on plan
    const planPrices: Record<string, { monthly: number; annual: number }> = {
      starter: { monthly: 49, annual: 490 },
      professional: { monthly: 99, annual: 990 },
      enterprise: { monthly: 199, annual: 1990 },
    };

    const mrr = billing_interval === 'annual'
      ? Math.round(planPrices[plan_type]?.annual / 12) || 0
      : planPrices[plan_type]?.monthly || 0;

    const { data: customer, error } = await supabase
      .from('web_customers')
      .insert({
        business_name,
        contact_name,
        email: email.toLowerCase(),
        phone,
        plan_type,
        billing_interval: billing_interval || 'monthly',
        mrr,
        status: 'active',
        agent_id: agent_id || auth.user!.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('admin_activity_log').insert({
      admin_id: auth.user!.id,
      action: 'created_web_customer',
      resource_type: 'web_customer',
      resource_id: customer.id,
      details: { business_name, plan_type },
    });

    return NextResponse.json({
      customer,
      message: 'Web customer created successfully',
    });
  } catch (error: any) {
    console.error('Error creating web customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create web customer' },
      { status: 500 }
    );
  }
}
