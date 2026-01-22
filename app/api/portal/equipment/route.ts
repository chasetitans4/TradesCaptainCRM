// =====================================================
// PORTAL EQUIPMENT API
// GET /api/portal/equipment - Get customer's equipment with service history
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch equipment
    const { data: equipmentList, error: equipmentError } = await supabase
      .from('customer_equipment')
      .select(`
        id,
        equipment_type,
        name,
        brand,
        model,
        serial_number,
        install_date,
        warranty_expires,
        last_service_date,
        next_service_due,
        notes,
        status,
        photo_urls,
        location_in_property,
        condition
      `)
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .order('created_at', { ascending: false });

    if (equipmentError) {
      throw equipmentError;
    }

    // Fetch service history for each equipment
    // We do this by finding jobs linked to this equipment via job_equipment
    const equipmentIds = equipmentList.map(e => e.id);
    
    let serviceHistoryMap: Record<string, any[]> = {};

    if (equipmentIds.length > 0) {
      const { data: jobEquipment } = await supabase
        .from('job_equipment')
        .select(`
          equipment_id,
          service_performed,
          job:jobs (
            id,
            completed_at,
            title,
            description,
            status,
            technician:users (
              name
            )
          )
        `)
        .in('equipment_id', equipmentIds)
        .eq('job.status', 'completed') // Only completed jobs count as history
        .order('created_at', { ascending: false });

      // Group by equipment_id
      if (jobEquipment) {
        jobEquipment.forEach((record: any) => {
          if (!record.job) return;
          
          if (!serviceHistoryMap[record.equipment_id]) {
            serviceHistoryMap[record.equipment_id] = [];
          }

          serviceHistoryMap[record.equipment_id].push({
            id: record.job.id,
            date: record.job.completed_at,
            type: record.service_performed || 'Service',
            description: record.job.description || record.job.title,
            technician: record.job.technician?.name || 'Technician'
          });
        });
      }
    }

    // Attach history to equipment
    const equipmentWithHistory = equipmentList.map(item => ({
      ...item,
      service_history: serviceHistoryMap[item.id] || []
    }));

    return NextResponse.json(equipmentWithHistory);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal equipment GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get equipment' },
      { status: 500 }
    );
  }
}
