// =====================================================
// SINGLE EXPENSE CATEGORY API
// PUT /api/expense-categories/:id - Update category
// DELETE /api/expense-categories/:id - Delete category
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { updateExpenseCategory, deleteExpenseCategory } from '@/lib/expenses';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can update categories
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can update categories' },
        { status: 403 }
      );
    }

    // Verify category belongs to business
    const { data: category } = await supabase
      .from('expense_categories')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!category || category.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.color !== undefined) updates.color = body.color;
    if (body.is_taxable !== undefined) updates.is_taxable = body.is_taxable;
    if (body.is_reimbursable !== undefined) updates.is_reimbursable = body.is_reimbursable;
    if (body.is_billable !== undefined) updates.is_billable = body.is_billable;
    if (body.gl_code !== undefined) updates.gl_code = body.gl_code;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const updatedCategory = await updateExpenseCategory(id, updates);

    return NextResponse.json({ category: updatedCategory });
  } catch (error) {
    apiLogger.error({ error, route: 'PUT /api/expense-categories/[id]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update category' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can delete categories
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can delete categories' },
        { status: 403 }
      );
    }

    // Verify category belongs to business
    const { data: category } = await supabase
      .from('expense_categories')
      .select('business_id, is_system')
      .eq('id', id)
      .single();

    if (!category || category.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (category.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system categories' },
        { status: 400 }
      );
    }

    await deleteExpenseCategory(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, route: 'DELETE /api/expense-categories/[id]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete category' },
      { status: 400 }
    );
  }
}
