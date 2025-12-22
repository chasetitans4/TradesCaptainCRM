import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplate,
  applyTemplate,
  getTemplateCategories,
} from '@/lib/followup/templates';

// GET /api/followup/templates - Get available templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const templateId = searchParams.get('id');

    // Get single template
    if (templateId) {
      const template = getTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template });
    }

    // Get templates by category
    if (category) {
      const templates = getTemplatesByCategory(category);
      return NextResponse.json({ templates });
    }

    // Get all templates and categories
    const templates = getAllTemplates();
    const categories = getTemplateCategories();

    return NextResponse.json({ templates, categories });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/followup/templates - Apply a template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { templateId, taskAssignedTo } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const result = await applyTemplate(userData.business_id, templateId, {
      taskAssignedTo,
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error applying template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
