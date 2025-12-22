// =====================================================
// SMS TEMPLATE OPERATIONS
// PUT/DELETE /api/sms/templates/[id]
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can update templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can update templates' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Verify template belongs to this business
    const { data: existing } = await supabase
      .from('sms_templates')
      .select('id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.name) updates.name = body.name;
    if (body.content) updates.content = body.content;
    if (body.category !== undefined) updates.category = body.category;
    if (typeof body.is_default === 'boolean') updates.is_default = body.is_default;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('sms_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can delete templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can delete templates' },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('sms_templates')
      .delete()
      .eq('id', id)
      .eq('business_id', profile.business_id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
