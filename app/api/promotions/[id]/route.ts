// =====================================================
// SINGLE PROMOTION API
// GET /api/promotions/:id - Get a promotion
// PATCH /api/promotions/:id - Update a promotion
// DELETE /api/promotions/:id - Delete a promotion
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error in GET /api/promotions/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: promotion, error } = await supabase
      .from('promotions')
      .update({
        name: body.name,
        code: body.code?.toUpperCase(),
        description: body.description,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        min_purchase_amount: body.min_purchase_amount,
        max_discount_amount: body.max_discount_amount,
        applicable_services: body.applicable_services,
        start_date: body.start_date,
        end_date: body.end_date,
        usage_limit: body.usage_limit,
        is_active: body.is_active,
        is_public: body.is_public,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating promotion:', error);
      return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
    }

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error in PATCH /api/promotions/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.from('promotions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting promotion:', error);
      return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/promotions/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
