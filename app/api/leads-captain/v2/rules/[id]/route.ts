// =====================================================
// Leads Captain v2 Rule Detail API
// GET /api/leads-captain/v2/rules/[id] - Get rule
// PUT /api/leads-captain/v2/rules/[id] - Update rule
// DELETE /api/leads-captain/v2/rules/[id] - Delete rule
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import type { UpdateRuleRequest } from '@/types/leads-captain';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get rule with template info if applicable
    const { data: rule, error } = await supabase
      .from('leads_captain_rules')
      .select('*')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (error || !rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // If rule uses a template, fetch template details
    let templateInfo = null;
    if (rule.actions?.send_template) {
      const { data: template } = await supabase
        .from('leads_captain_templates')
        .select('id, name, content')
        .eq('id', rule.actions.send_template)
        .single();
      templateInfo = template;
    }

    return NextResponse.json({ rule, template: templateInfo });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching rule',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const body: UpdateRuleRequest = await request.json();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if rule exists and belongs to this business
    const { data: existing } = await supabase
      .from('leads_captain_rules')
      .select('id, is_system')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'description', 'priority', 'conditions', 'actions', 'is_active'];

    for (const field of allowedFields) {
      if (body[field as keyof UpdateRuleRequest] !== undefined) {
        updateData[field] = body[field as keyof UpdateRuleRequest];
      }
    }

    // System rules have limited modifications
    if (existing.is_system) {
      // Only allow enabling/disabling and changing actions
      const restrictedFields = ['name', 'conditions'];
      for (const field of restrictedFields) {
        delete updateData[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate conditions if provided
    if (updateData.conditions) {
      const conditions = updateData.conditions as { operator?: string; conditions?: unknown[] };
      if (!conditions.operator || !conditions.conditions) {
        return NextResponse.json(
          { error: 'Conditions must have operator and conditions array' },
          { status: 400 }
        );
      }
    }

    const { data: rule, error } = await supabase
      .from('leads_captain_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('leads_captain_audit_log').insert({
      config_id: config.id,
      action: 'rule_updated',
      actor: profile.email || 'user',
      details: { rule_id: id, fields_updated: Object.keys(updateData) },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    apiLogger.error({
      message: 'Error updating rule',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if rule exists and is not a system rule
    const { data: existing } = await supabase
      .from('leads_captain_rules')
      .select('id, is_system, name')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'System rules cannot be deleted. You can disable them instead.' },
        { status: 403 }
      );
    }

    // Delete rule
    const { error } = await supabase
      .from('leads_captain_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log audit
    await supabase.from('leads_captain_audit_log').insert({
      config_id: config.id,
      action: 'rule_deleted',
      actor: profile.email || 'user',
      details: { rule_id: id, rule_name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      message: 'Error deleting rule',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
