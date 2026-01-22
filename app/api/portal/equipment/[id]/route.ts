import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getEquipmentDetails, getEquipmentServiceHistory } from '@/lib/portal/equipment';
import { getEquipmentDocuments } from '@/lib/portal/documents';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/equipment/[id] - Get equipment details with service history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];

    // Get equipment details
    const equipment = await getEquipmentDetails(
      id,
      session.customerId,
      session.businessId
    );

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const response: Record<string, any> = { equipment };

    // Optionally include service history
    if (include.includes('history')) {
      response.serviceHistory = await getEquipmentServiceHistory(
        id,
        session.customerId,
        session.businessId
      );
    }

    // Optionally include documents
    if (include.includes('documents')) {
      response.documents = await getEquipmentDocuments(
        id,
        session.customerId,
        session.businessId
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal equipment details GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch equipment details' }, { status: 500 });
  }
}
