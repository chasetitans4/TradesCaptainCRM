// =====================================================
// INVENTORY ITEM API
// GET /api/inventory/[id] - Get single item
// PATCH /api/inventory/[id] - Update item
// DELETE /api/inventory/[id] - Soft delete (retire) item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, checkPermission } from '@/lib/permissions/check-permission';
import {
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryUsageHistory,
} from '@/lib/inventory';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const item = await getInventoryItem(id);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Verify ownership
    if (item.business_id !== session.user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let usageHistory = null;
    if (includeHistory) {
      usageHistory = await getInventoryUsageHistory(id);
    }

    return NextResponse.json({ item, usageHistory });
  } catch (error) {
    apiLogger.error({
      msg: 'Inventory get error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkPermission('manage_inventory');
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get item to verify ownership
    const existingItem = await getInventoryItem(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (existingItem.business_id !== session.user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Map camelCase to snake_case for database
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.categoryId !== undefined) updates.category_id = body.categoryId;
    if (body.brand !== undefined) updates.brand = body.brand;
    if (body.model !== undefined) updates.model = body.model;
    if (body.serialNumber !== undefined) updates.serial_number = body.serialNumber;
    if (body.purchaseDate !== undefined) updates.purchase_date = body.purchaseDate;
    if (body.purchasePrice !== undefined) updates.purchase_price = body.purchasePrice;
    if (body.currentValue !== undefined) updates.current_value = body.currentValue;
    if (body.warrantyExpires !== undefined) updates.warranty_expires = body.warrantyExpires;
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
    if (body.assignedVehicle !== undefined) updates.assigned_vehicle = body.assignedVehicle;
    if (body.location !== undefined) updates.location = body.location;
    if (body.status !== undefined) updates.status = body.status;
    if (body.condition !== undefined) updates.condition = body.condition;
    if (body.lastMaintenance !== undefined) updates.last_maintenance = body.lastMaintenance;
    if (body.nextMaintenance !== undefined) updates.next_maintenance = body.nextMaintenance;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.minQuantity !== undefined) updates.min_quantity = body.minQuantity;
    if (body.photoUrls !== undefined) updates.photo_urls = body.photoUrls;
    if (body.specifications !== undefined) updates.specifications = body.specifications;
    if (body.notes !== undefined) updates.notes = body.notes;

    const item = await updateInventoryItem(id, updates);

    apiLogger.info({
      msg: 'Inventory item updated',
      itemId: id,
      businessId: session.user.businessId,
    });

    return NextResponse.json({ item });
  } catch (error) {
    apiLogger.error({
      msg: 'Inventory update error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkPermission('manage_inventory');
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get item to verify ownership
    const existingItem = await getInventoryItem(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (existingItem.business_id !== session.user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteInventoryItem(id);

    apiLogger.info({
      msg: 'Inventory item retired',
      itemId: id,
      businessId: session.user.businessId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Inventory delete error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
