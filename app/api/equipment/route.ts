// =====================================================
// CUSTOMER EQUIPMENT API
// GET /api/equipment?customerId=xxx - Get customer equipment
// POST /api/equipment - Create equipment record
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createEquipment, getCustomerEquipment, getEquipmentWithExpiringWarranties } from '@/lib/equipment';

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

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const expiringWarranties = searchParams.get('expiringWarranties') === 'true';
    const withinDays = parseInt(searchParams.get('withinDays') || '30');

    if (expiringWarranties) {
      const equipment = await getEquipmentWithExpiringWarranties(profile.business_id, withinDays);
      return NextResponse.json(equipment);
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const equipment = (await getCustomerEquipment(customerId)).map(mapEquipmentToUi);

    return NextResponse.json(equipment);
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, equipmentTypeId, modelNumber, serialNumber, installDate, warrantyExpiration, location, notes, specifications } = body;

    if (!customerId || !equipmentTypeId || !modelNumber) {
      return NextResponse.json(
        { error: 'customerId, equipmentTypeId, and modelNumber are required' },
        { status: 400 }
      );
    }

    const inserted = await createEquipment({
      businessId: profile.business_id,
      customerId,
      equipmentType: equipmentTypeId,
      model: modelNumber,
      serialNumber,
      installDate: installDate ? new Date(installDate).toISOString().split('T')[0] : undefined,
      warrantyExpires: warrantyExpiration ? new Date(warrantyExpiration).toISOString().split('T')[0] : undefined,
      locationInProperty: location,
      notes,
      specifications,
    });

    return NextResponse.json(mapEquipmentToUi(inserted));
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create equipment' },
      { status: 500 }
    );
  }
}
