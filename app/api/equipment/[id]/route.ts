// =====================================================
// EQUIPMENT BY ID API
// GET /api/equipment/[id] - Get equipment details
// PATCH /api/equipment/[id] - Update equipment
// DELETE /api/equipment/[id] - Delete equipment
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getEquipment, updateEquipment, deleteEquipment } from '@/lib/equipment';

function mapEquipmentToUi(row: any) {
  const statusMap: Record<string, string> = {
    active: 'active',
    needs_repair: 'needs_service',
    replaced: 'replaced',
    removed: 'inactive',
  };
  return {
    id: row.id,
    equipment_type: { name: row.equipment_type },
    model_number: row.model ?? '',
    serial_number: row.serial_number ?? undefined,
    install_date: row.install_date ?? undefined,
    warranty_expiration: row.warranty_expires ?? undefined,
    location: row.location_in_property ?? undefined,
    notes: row.notes ?? undefined,
    status: statusMap[row.status] ?? row.status,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const equipment = await getEquipment(id);

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json(mapEquipmentToUi(equipment));
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/equipment/[id]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const equipment = await updateEquipment(id, {
      model: body.modelNumber,
      serialNumber: body.serialNumber,
      locationInProperty: body.location,
      notes: body.notes,
      specifications: body.specifications,
      warrantyExpires: body.warrantyExpiration || undefined,
      status: body.status,
    });

    return NextResponse.json(mapEquipmentToUi(equipment));
  } catch (error) {
    apiLogger.error({ error, route: 'PATCH /api/equipment/[id]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await deleteEquipment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, route: 'DELETE /api/equipment/[id]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
