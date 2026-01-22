// =====================================================
// Leads Captain v2 Rules API
// GET /api/leads-captain/v2/rules - List rules
// POST /api/leads-captain/v2/rules - Create rule
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, checkPermission } from '@/lib/permissions/check-permission';
import { createAdminClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/leads-captain/v2/features';
import { apiLogger } from '@/lib/logger';
import type { CreateRuleRequest } from '@/types/leads-captain';

export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', userData.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('leads_captain_rules')
      .select('*')
      .eq('config_id', config.id)
      .order('priority', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: rules, error } = await query;
    if (error) throw error;

    // Get limit info
    const limitInfo = await checkPlanLimit(userData.business_id, 'rules');

    return NextResponse.json({
      rules: rules || [],
      total: rules?.length || 0,
      system_count: rules?.filter(r => r.is_system).length || 0,
      custom_count: rules?.filter(r => !r.is_system).length || 0,
      limits: limitInfo,
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching rules',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkPermission('manage_leads_captain');
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body: CreateRuleRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.conditions || !body.actions) {
      return NextResponse.json(
        { error: 'Name, conditions, and actions are required' },
        { status: 400 }
      );
    }

    // Validate conditions structure
    if (!body.conditions.operator || !body.conditions.conditions) {
      return NextResponse.json(
        { error: 'Conditions must have operator and conditions array' },
        { status: 400 }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, email')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', userData.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check plan limit
    const limitInfo = await checkPlanLimit(userData.business_id, 'rules');
    if (!limitInfo.allowed) {
      return NextResponse.json(
        {
          error: `Rule limit reached (${limitInfo.max}). Upgrade your plan to add more.`,
          limit_info: limitInfo,
        },
        { status: 403 }
      );
    }

    // Determine priority (default to max + 10)
    let priority = body.priority;
    if (priority === undefined) {
      const { data: maxPriority } = await supabase
        .from('leads_captain_rules')
        .select('priority')
        .eq('config_id', config.id)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      priority = (maxPriority?.priority || 100) + 10;
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('leads_captain_rules')
      .insert({
        config_id: config.id,
        name: body.name,
        description: body.description || null,
        priority,
        conditions: body.conditions,
        actions: body.actions,
        is_system: false,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('leads_captain_audit_log').insert({
      config_id: config.id,
      action: 'rule_created',
      actor: userData.email || 'user',
      details: { rule_id: rule.id, rule_name: rule.name },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      message: 'Error creating rule',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create rule' },
      { status: 500 }
    );
  }
}
