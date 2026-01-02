// =====================================================
// Leads Captain v2 Rules API
// GET /api/nevermiss/v2/rules - List rules
// POST /api/nevermiss/v2/rules - Create rule
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/nevermiss/v2/features';
import type { CreateRuleRequest } from '@/types/nevermiss';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Get config ID
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('nevermiss_rules')
      .select('*')
      .eq('config_id', config.id)
      .order('priority', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: rules, error } = await query;
    if (error) throw error;

    // Get limit info
    const limitInfo = await checkPlanLimit(profile.business_id, 'rules');

    return NextResponse.json({
      rules: rules || [],
      total: rules?.length || 0,
      system_count: rules?.filter(r => r.is_system).length || 0,
      custom_count: rules?.filter(r => !r.is_system).length || 0,
      limits: limitInfo,
    });
  } catch (error: unknown) {
    console.error('Error fetching rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
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

    // Get config ID
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check plan limit
    const limitInfo = await checkPlanLimit(profile.business_id, 'rules');
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
        .from('nevermiss_rules')
        .select('priority')
        .eq('config_id', config.id)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      priority = (maxPriority?.priority || 100) + 10;
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('nevermiss_rules')
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
    await supabase.from('nevermiss_audit_log').insert({
      config_id: config.id,
      action: 'rule_created',
      actor: profile.email || 'user',
      details: { rule_id: rule.id, rule_name: rule.name },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create rule' },
      { status: 500 }
    );
  }
}
