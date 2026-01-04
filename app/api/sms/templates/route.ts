// =====================================================
// SMS TEMPLATES
// GET/POST /api/sms/templates
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import type { CreateSMSTemplateInput } from '@/types';
import { apiLogger } from '@/lib/logger';

// GET - List templates
export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: templates, error } = await supabase
      .from('sms_templates')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('category')
      .order('name');

    if (error) {
      apiLogger.error({ error, context: 'fetching templates' });
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching templates' });
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can create templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can create templates' },
        { status: 403 }
      );
    }

    const body: CreateSMSTemplateInput = await request.json();

    if (!body.name || !body.content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: template, error } = await supabase
      .from('sms_templates')
      .insert({
        business_id: profile.business_id,
        name: body.name,
        content: body.content,
        category: body.category || null,
        is_default: body.is_default || false,
      })
      .select()
      .single();

    if (error) {
      apiLogger.error({ error, context: 'creating template' });
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    apiLogger.error({ error, context: 'creating template' });
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
