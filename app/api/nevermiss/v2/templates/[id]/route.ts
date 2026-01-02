// =====================================================
// Leads Captain v2 Template Detail API
// GET /api/nevermiss/v2/templates/[id] - Get template
// PUT /api/nevermiss/v2/templates/[id] - Update template
// DELETE /api/nevermiss/v2/templates/[id] - Delete template
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { previewTemplate } from '@/lib/nevermiss/v2/template-renderer';
import type { UpdateTemplateRequest } from '@/types/nevermiss';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get template
    const { data: template, error } = await supabase
      .from('nevermiss_templates')
      .select('*')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Include preview
    const preview = previewTemplate(template.content);

    return NextResponse.json({ template, preview });
  } catch (error: unknown) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch template' },
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
    const body: UpdateTemplateRequest = await request.json();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if template exists and belongs to this business
    const { data: existing } = await supabase
      .from('nevermiss_templates')
      .select('id, is_system')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'template_key', 'content', 'max_length', 'emoji_setting', 'ai_personalization', 'is_active'];

    for (const field of allowedFields) {
      if (body[field as keyof UpdateTemplateRequest] !== undefined) {
        updateData[field] = body[field as keyof UpdateTemplateRequest];
      }
    }

    // System templates can only have content modified
    if (existing.is_system) {
      const restrictedFields = ['name', 'template_key', 'is_active'];
      for (const field of restrictedFields) {
        delete updateData[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('nevermiss_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('nevermiss_audit_log').insert({
      config_id: config.id,
      action: 'template_updated',
      actor: profile.email || 'user',
      details: { template_id: id, fields_updated: Object.keys(updateData) },
    });

    return NextResponse.json({ template });
  } catch (error: unknown) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Get config ID for authorization
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Check if template exists and is not a system template
    const { data: existing } = await supabase
      .from('nevermiss_templates')
      .select('id, is_system, name')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'System templates cannot be deleted' },
        { status: 403 }
      );
    }

    // Check if template is used in any rules
    const { count: ruleCount } = await supabase
      .from('nevermiss_rules')
      .select('*', { count: 'exact', head: true })
      .eq('config_id', config.id)
      .filter('actions->send_template', 'eq', id);

    if (ruleCount && ruleCount > 0) {
      return NextResponse.json(
        { error: `Template is used by ${ruleCount} rule(s). Remove from rules before deleting.` },
        { status: 409 }
      );
    }

    // Delete template
    const { error } = await supabase
      .from('nevermiss_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log audit
    await supabase.from('nevermiss_audit_log').insert({
      config_id: config.id,
      action: 'template_deleted',
      actor: profile.email || 'user',
      details: { template_id: id, template_name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}
