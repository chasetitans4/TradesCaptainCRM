// =====================================================
// EQUIPMENT BY ID API
// GET /api/equipment/[id] - Get equipment details
// PATCH /api/equipment/[id] - Update equipment
// DELETE /api/equipment/[id] - Delete equipment
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getEquipment, updateEquipment, deleteEquipment } from '@/lib/equipment';

export async function GET(
  request: NextRequest,
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

    return NextResponse.json(equipment);
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch equipment' },
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
      modelNumber: body.modelNumber,
      serialNumber: body.serialNumber,
      location: body.location,
      notes: body.notes,
      specifications: body.specifications,
      warrantyExpiration: body.warrantyExpiration ? new Date(body.warrantyExpiration) : undefined,
      status: body.status,
    });

    return NextResponse.json(equipment);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
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
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
