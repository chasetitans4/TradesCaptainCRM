// =====================================================
// MEDIA ARCHIVE API
// POST /api/customers/[id]/media/archive - Archive media
// DELETE /api/customers/[id]/media/archive - Unarchive media
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;
    const body = await request.json();
    const { type, ids } = body;

    if (!type || !ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify customer belongs to business
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', userData.business_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (type === 'image') {
      const { error } = await supabase
        .from('customer_images')
        .update({ archived: true })
        .in('id', ids)
        .eq('customer_id', customerId)
        .eq('business_id', userData.business_id);

      if (error) throw error;
    } else if (type === 'issue') {
      const { error } = await supabase
        .from('customer_issue_reports')
        .update({ media_archived: true })
        .in('id', ids)
        .eq('customer_id', customerId)
        .eq('business_id', userData.business_id);

      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    apiLogger.info({
      msg: 'Media archived',
      customerId,
      businessId: userData.business_id,
      type,
      count: ids.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Archive media error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to archive media' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;
    const body = await request.json();
    const { type, ids } = body;

    if (!type || !ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify customer belongs to business
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', userData.business_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (type === 'image') {
      const { error } = await supabase
        .from('customer_images')
        .update({ archived: false })
        .in('id', ids)
        .eq('customer_id', customerId)
        .eq('business_id', userData.business_id);

      if (error) throw error;
    } else if (type === 'issue') {
      const { error } = await supabase
        .from('customer_issue_reports')
        .update({ media_archived: false })
        .in('id', ids)
        .eq('customer_id', customerId)
        .eq('business_id', userData.business_id);

      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    apiLogger.info({
      msg: 'Media unarchived',
      customerId,
      businessId: userData.business_id,
      type,
      count: ids.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Unarchive media error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to unarchive media' }, { status: 500 });
  }
}
