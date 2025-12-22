// =====================================================
// EXPENSE CATEGORIES API
// GET /api/expense-categories - List categories
// POST /api/expense-categories - Create category
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getExpenseCategories,
  createExpenseCategory,
  initializeDefaultCategories,
} from '@/lib/expenses';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const categories = await getExpenseCategories(profile.business_id);

    // If no categories exist, initialize defaults
    if (categories.length === 0) {
      await initializeDefaultCategories(profile.business_id);
      const newCategories = await getExpenseCategories(profile.business_id);
      return NextResponse.json({ categories: newCategories });
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Error in GET /api/expense-categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Only admins/owners can create categories
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can create categories' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, icon, color, is_taxable, is_reimbursable, is_billable, gl_code } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await createExpenseCategory(profile.business_id, {
      name,
      icon,
      color,
      is_taxable,
      is_reimbursable,
      is_billable,
      gl_code,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/expense-categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 400 }
    );
  }
}
