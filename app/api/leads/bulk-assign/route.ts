// =====================================================
// BULK LEAD ASSIGNMENT API
// POST /api/leads/bulk-assign - Assign multiple leads to a team member
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/permissions';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - require manage_leads permission for bulk operations
    if (!hasPermission(profile.role, 'manage_leads')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { lead_ids, assigned_to } = body;

    // Validate input
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'lead_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (lead_ids.length > 50) {
      return NextResponse.json(
        { error: 'Cannot assign more than 50 leads at once' },
        { status: 400 }
      );
    }

    // assigned_to can be null (to unassign) or a valid user ID
    if (assigned_to !== null && typeof assigned_to !== 'string') {
      return NextResponse.json(
        { error: 'assigned_to must be a string (user ID) or null' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // If assigning to someone, verify they exist and belong to the same business
    if (assigned_to) {
      const { data: assignee, error: assigneeError } = await supabase
        .from('users')
        .select('id, business_id')
        .eq('id', assigned_to)
        .single();

      if (assigneeError || !assignee) {
        return NextResponse.json(
          { error: 'Assignee not found' },
          { status: 404 }
        );
      }

      if (assignee.business_id !== profile.business_id) {
        return NextResponse.json(
          { error: 'Cannot assign leads to users from another business' },
          { status: 403 }
        );
      }
    }

    // Update all leads - only update leads that belong to this business
    const { data: updatedLeads, error: updateError } = await supabase
      .from('leads')
      .update({
        assigned_to,
        updated_at: new Date().toISOString(),
      })
      .in('id', lead_ids)
      .eq('business_id', profile.business_id)
      .select('id');

    if (updateError) {
      apiLogger.error({ error: updateError, message: 'Error bulk assigning leads' });
      return NextResponse.json(
        { error: 'Failed to assign leads' },
        { status: 500 }
      );
    }

    const updatedCount = updatedLeads?.length || 0;

    apiLogger.info({
      message: 'Bulk lead assignment completed',
      userId: profile.id,
      businessId: profile.business_id,
      assignedTo: assigned_to,
      requestedCount: lead_ids.length,
      updatedCount,
    });

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      message: assigned_to
        ? `${updatedCount} lead${updatedCount !== 1 ? 's' : ''} assigned successfully`
        : `${updatedCount} lead${updatedCount !== 1 ? 's' : ''} unassigned successfully`,
    });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in bulk lead assignment' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
