// =====================================================
// INVENTORY CATEGORIES API
// GET /api/inventory/categories - List categories
// POST /api/inventory/categories - Create custom category
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, checkPermission } from '@/lib/permissions/check-permission';
import {
  getInventoryCategories,
  buildCategoryTree,
  createInventoryCategory,
} from '@/lib/inventory';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asTree = searchParams.get('tree') === 'true';

    const categories = await getInventoryCategories(session.user.businessId);

    if (asTree) {
      const tree = buildCategoryTree(categories);
      return NextResponse.json({ categories: tree });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    apiLogger.error({
      msg: 'Categories list error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkPermission('manage_inventory');
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const category = await createInventoryCategory(
      session.user.businessId,
      body.name,
      body.parentCategoryId,
      body.icon,
      body.color
    );

    apiLogger.info({
      msg: 'Custom category created',
      categoryId: category.id,
      businessId: session.user.businessId,
      name: body.name,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      msg: 'Category create error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
