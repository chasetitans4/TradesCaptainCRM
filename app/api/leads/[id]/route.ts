// =====================================================
// INDIVIDUAL LEAD API
// GET /api/leads/[id] - Get lead details
// PATCH /api/leads/[id] - Update lead
// DELETE /api/leads/[id] - Delete lead
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/permissions';
import { apiLogger } from '@/lib/logger';

// GET - Fetch a single lead
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(profile.role, 'view_leads')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        customer:customers!customer_id (
          id,
          name,
          phone,
          email
        )
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    apiLogger.error({ error, message: 'Error fetching lead' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(profile.role, 'manage_leads')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = await createServerSupabaseClient();

    // First verify the lead belongs to this business
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, business_id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided
    const allowedFields = [
      'status',
      'name',
      'phone',
      'email',
      'service_needed',
      'urgency',
      'source',
      'notes',
      'assigned_to',
      'customer_id',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Update the lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customer:customers (
          id,
          name,
          phone,
          email
        )
      `)
      .single();

    if (updateError) {
      apiLogger.error({ error: updateError, message: 'Error updating lead' });
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    apiLogger.info({
      message: 'Lead updated',
      leadId: id,
      userId: profile.id,
      changes: Object.keys(updateData),
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    apiLogger.error({ error, message: 'Error updating lead' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a lead
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(profile.role, 'manage_leads')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify lead belongs to this business before deleting
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, business_id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Delete the lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      apiLogger.error({ error: deleteError, message: 'Error deleting lead' });
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }

    apiLogger.info({
      message: 'Lead deleted',
      leadId: id,
      userId: profile.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, message: 'Error deleting lead' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
