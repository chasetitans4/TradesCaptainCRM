import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  addJobMaterial,
  updateJobMaterial,
  deleteJobMaterial,
  getJobMaterials,
  getJobMaterialTotals,
  searchMaterials,
  getFrequentMaterials,
} from '@/lib/costing/materials';
import { apiLogger } from '@/lib/logger';

// GET /api/costing/materials - Get materials
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const search = searchParams.get('search');
    const frequent = searchParams.get('frequent');
    const totalsOnly = searchParams.get('totals');

    // Search for materials
    if (search) {
      const results = await searchMaterials(userData.business_id, search);
      return NextResponse.json({ materials: results });
    }

    // Get frequent materials
    if (frequent === 'true') {
      const results = await getFrequentMaterials(userData.business_id);
      return NextResponse.json({ materials: results });
    }

    // Get materials for job
    if (jobId) {
      if (totalsOnly === 'true') {
        const totals = await getJobMaterialTotals(jobId);
        return NextResponse.json({ totals });
      }

      const materials = await getJobMaterials(jobId);
      return NextResponse.json({ materials });
    }

    return NextResponse.json(
      { error: 'Job ID or search query is required' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ msg: 'Error fetching materials', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch materials' }, { status: 500 });
  }
}

// POST /api/costing/materials - Material actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobId, materialId, ...data } = body;

    let result;

    switch (action) {
      case 'add':
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }
        if (!data.name || data.quantity === undefined || data.unitCost === undefined) {
          return NextResponse.json(
            { error: 'Name, quantity, and unit cost are required' },
            { status: 400 }
          );
        }
        result = await addJobMaterial(jobId, {
          name: data.name,
          description: data.description,
          partNumber: data.partNumber,
          quantity: data.quantity,
          unitCost: data.unitCost,
          unitPrice: data.unitPrice,
          source: data.source,
          supplier: data.supplier,
          inventoryItemId: data.inventoryItemId,
        });
        break;

      case 'update':
        if (!materialId) {
          return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
        }
        result = await updateJobMaterial(materialId, data);
        break;

      case 'delete':
        if (!materialId) {
          return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
        }
        result = await deleteJobMaterial(materialId);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ msg: 'Error with material action', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process material action' }, { status: 500 });
  }
}
