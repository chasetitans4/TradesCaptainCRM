// =====================================================
// Leads Captain v2 Templates API
// GET /api/leads-captain/v2/templates - List templates
// POST /api/leads-captain/v2/templates - Create template
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { createAdminClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/leads-captain/v2/features';
import { apiLogger } from '@/lib/logger';
import type { CreateTemplateRequest } from '@/types/leads-captain';

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
      .from('leads_captain_templates')
      .select('*')
      .eq('config_id', config.id)
      .order('is_system', { ascending: false })
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;
    if (error) throw error;

    // Get limit info
    const limitInfo = await checkPlanLimit(userData.business_id, 'templates');

    return NextResponse.json({
      templates: templates || [],
      total: templates?.length || 0,
      system_count: templates?.filter(t => t.is_system).length || 0,
      custom_count: templates?.filter(t => !t.is_system).length || 0,
      limits: limitInfo,
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error fetching templates',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
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
    const body: CreateTemplateRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
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
    const limitInfo = await checkPlanLimit(userData.business_id, 'templates');
    if (!limitInfo.allowed) {
      return NextResponse.json(
        {
          error: `Template limit reached (${limitInfo.max}). Upgrade your plan to add more.`,
          limit_info: limitInfo,
        },
        { status: 403 }
      );
    }

    // Create template
    const { data: template, error } = await supabase
      .from('leads_captain_templates')
      .insert({
        config_id: config.id,
        name: body.name,
        template_key: body.template_key || null,
        content: body.content,
        max_length: body.max_length || 320,
        emoji_setting: body.emoji_setting || 'business_default',
        ai_personalization: body.ai_personalization || 'none',
        is_system: false,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('leads_captain_audit_log').insert({
      config_id: config.id,
      action: 'template_created',
      actor: userData.email || 'user',
      details: { template_id: template.id, template_name: template.name },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      message: 'Error creating template',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}
