// =====================================================
// INVENTORY API
// GET /api/inventory - List inventory items
// POST /api/inventory - Create new inventory item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, checkPermission } from '@/lib/permissions/check-permission';
import {
  getInventoryItems,
  createInventoryItem,
  getLowStockItems,
  getItemsNeedingMaintenance,
} from '@/lib/inventory';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const needsMaintenance = searchParams.get('needsMaintenance') === 'true';

    // Special queries
    if (lowStockOnly) {
      const items = await getLowStockItems(session.user.businessId);
      return NextResponse.json({ items });
    }

    if (needsMaintenance) {
      const items = await getItemsNeedingMaintenance(session.user.businessId);
      return NextResponse.json({ items });
    }

    // Regular filtered query
    const items = await getInventoryItems({
      businessId: session.user.businessId,
      categoryId: categoryId || undefined,
      status: status || undefined,
      assignedTo: assignedTo || undefined,
      search: search || undefined,
    });

    return NextResponse.json({ items });
  } catch (error) {
    apiLogger.error({
      msg: 'Inventory list error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
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

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const item = await createInventoryItem({
      business_id: session.user.businessId,
      name: body.name,
      description: body.description,
      category_id: body.categoryId,
      brand: body.brand,
      model: body.model,
      serial_number: body.serialNumber,
      purchase_date: body.purchaseDate,
      purchase_price: body.purchasePrice,
      current_value: body.currentValue,
      warranty_expires: body.warrantyExpires,
      assigned_to: body.assignedTo,
      assigned_vehicle: body.assignedVehicle,
      location: body.location,
      status: body.status || 'available',
      condition: body.condition,
      last_maintenance: body.lastMaintenance,
      next_maintenance: body.nextMaintenance,
      quantity: body.quantity || 1,
      min_quantity: body.minQuantity,
      photo_urls: body.photoUrls,
      specifications: body.specifications,
      notes: body.notes,
    });

    apiLogger.info({
      msg: 'Inventory item created',
      itemId: item.id,
      businessId: session.user.businessId,
      name: body.name,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      msg: 'Inventory create error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
