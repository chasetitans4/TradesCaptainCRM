// =====================================================
// EXPENSE CATEGORIES API
// GET /api/expense-categories - List categories
// POST /api/expense-categories - Create category
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  getExpenseCategories,
  createExpenseCategory,
  initializeDefaultCategories,
} from '@/lib/expenses';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
       const queryBusinessId = searchParams.get('businessId');
       if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
        if (session.user.role === 'admin' || session.user.role === 'super_admin') {
             return NextResponse.json({ categories: [] });
        }
        return NextResponse.json({ error: 'User business not found' }, { status: 404 });
    }

    const categories = await getExpenseCategories(businessId);

    // If no categories exist, initialize defaults
    if (categories.length === 0) {
      await initializeDefaultCategories(businessId);
      const newCategories = await getExpenseCategories(businessId);
      return NextResponse.json({ categories: newCategories });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/expense-categories' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can create categories
    if (session.user.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can create categories' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, icon, color, is_taxable, is_reimbursable, is_billable, gl_code, businessId: bodyBusinessId } = body;

    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
        if (bodyBusinessId) businessId = bodyBusinessId;
    }

    if (!businessId) {
        return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await createExpenseCategory(businessId, {
      name,
      icon,
      color,
      is_taxable,
      is_reimbursable,
      is_billable,
      gl_code,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/expense-categories' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create category' },
      { status: 400 }
    );
  }
}
