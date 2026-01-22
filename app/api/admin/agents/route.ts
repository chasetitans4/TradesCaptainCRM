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
    // SECURITY: Select only needed fields - exclude password_hash and two_factor_secret
    let query = supabase
      .from('admin_users')
      .select('id, email, full_name, phone, role, status, hire_date, commission_rate, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: agents, error } = await query;

    if (error) {
      // Table might not exist
      return NextResponse.json({ agents: [] });
    }

    // Get agent IDs for batch queries (PERF: avoid N+1 queries)
    const agentIds = (agents || []).filter(a => a.role === 'agent').map(a => a.id);

    // Initialize stats maps
    const leadCountsMap = new Map<string, number>();
    const dealCountsMap = new Map<string, number>();
    const pendingCommissionsMap = new Map<string, number>();
    const paidCommissionsMap = new Map<string, number>();

    if (agentIds.length > 0) {
      // Batch query for leads (handle missing table)
      try {
        const { data: leadCounts } = await supabase
          .from('tc_leads')
          .select('agent_id')
          .in('agent_id', agentIds)
          .not('status', 'in', '("won","lost","unqualified")');

        // Count leads per agent
        for (const lead of leadCounts || []) {
          leadCountsMap.set(lead.agent_id, (leadCountsMap.get(lead.agent_id) || 0) + 1);
        }
      } catch {
        // Table doesn't exist
      }

      // Batch query for deals (handle missing table)
      try {
        const { data: dealCounts } = await supabase
          .from('crm_accounts')
          .select('agent_id')
          .in('agent_id', agentIds);

        // Count deals per agent
        for (const deal of dealCounts || []) {
          dealCountsMap.set(deal.agent_id, (dealCountsMap.get(deal.agent_id) || 0) + 1);
        }
      } catch {
        // Table doesn't exist
      }

      // Batch query for pending commissions (handle missing table)
      try {
        const { data: pendingCommissions } = await supabase
          .from('agent_commissions')
          .select('agent_id, commission_amount')
          .in('agent_id', agentIds)
          .in('status', ['pending', 'eligible', 'approved']);

        // Sum commissions per agent
        for (const comm of pendingCommissions || []) {
          pendingCommissionsMap.set(
            comm.agent_id,
            (pendingCommissionsMap.get(comm.agent_id) || 0) + (comm.commission_amount || 0)
          );
        }
      } catch {
        // Table doesn't exist
      }

      // Batch query for paid commissions YTD (handle missing table)
      try {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const { data: paidCommissions } = await supabase
          .from('agent_commissions')
          .select('agent_id, commission_amount')
          .in('agent_id', agentIds)
          .eq('status', 'paid')
          .gte('paid_at', startOfYear);

        // Sum commissions per agent
        for (const comm of paidCommissions || []) {
          paidCommissionsMap.set(
            comm.agent_id,
            (paidCommissionsMap.get(comm.agent_id) || 0) + (comm.commission_amount || 0)
          );
        }
      } catch {
        // Table doesn't exist
      }
    }

    // Assemble agents with stats
    const agentsWithStats = (agents || []).map((agent) => {
      if (agent.role !== 'agent') {
        return agent;
      }

      return {
        ...agent,
        stats: {
          activeLeads: leadCountsMap.get(agent.id) || 0,
          totalDeals: dealCountsMap.get(agent.id) || 0,
          commissionsPending: pendingCommissionsMap.get(agent.id) || 0,
          commissionsPaidYtd: paidCommissionsMap.get(agent.id) || 0,
        },
      };
    });

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

    // SECURITY: Select only safe fields - exclude password_hash and two_factor_secret
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
      .select('id, email, full_name, phone, role, status, hire_date, commission_rate, created_at')
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
