// =====================================================
// ADMIN AGENTS API
// Manage sales agents and admin users
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: agents, error } = await query;

    if (error) throw error;

    // Get stats for each agent
    const agentsWithStats = await Promise.all(
      (agents || []).map(async (agent) => {
        if (agent.role !== 'agent') {
          return agent;
        }

        // Get lead count
        const { count: activeLeads } = await supabase
          .from('sales_leads')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .not('status', 'in', '("won","lost","unqualified")');

        // Get deals count
        const { count: totalDeals } = await supabase
          .from('crm_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id);

        // Get pending commissions
        const { data: pendingCommissions } = await supabase
          .from('agent_commissions')
          .select('commission_amount')
          .eq('agent_id', agent.id)
          .in('status', ['pending', 'eligible', 'approved']);

        const commissionsPending = pendingCommissions?.reduce(
          (sum, c) => sum + (c.commission_amount || 0),
          0
        ) || 0;

        // Get paid commissions YTD
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const { data: paidCommissions } = await supabase
          .from('agent_commissions')
          .select('commission_amount')
          .eq('agent_id', agent.id)
          .eq('status', 'paid')
          .gte('paid_at', startOfYear);

        const commissionsPaidYtd = paidCommissions?.reduce(
          (sum, c) => sum + (c.commission_amount || 0),
          0
        ) || 0;

        return {
          ...agent,
          stats: {
            activeLeads: activeLeads || 0,
            totalDeals: totalDeals || 0,
            commissionsPending,
            commissionsPaidYtd,
          },
        };
      })
    );

    return NextResponse.json({ agents: agentsWithStats });
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching agents',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // Only super_admin and admin can create agents
  if (!['super_admin', 'admin'].includes(auth.user!.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { email, full_name, phone, role, commission_rate, hire_date } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'Email, full name, and role are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this email already exists' },
        { status: 400 }
      );
    }

    // Generate a temporary password and hash with bcrypt (agent will need to reset)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const { data: agent, error } = await supabase
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name,
        phone,
        role,
        commission_rate: commission_rate || 0.10,
        hire_date,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('admin_activity_log').insert({
      admin_id: auth.user!.id,
      action: 'created_agent',
      resource_type: 'admin_user',
      resource_id: agent.id,
      details: { email, role },
    });

    return NextResponse.json({
      agent,
      message: 'Agent created successfully',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Error creating agent',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create agent' },
      { status: 500 }
    );
  }
}
