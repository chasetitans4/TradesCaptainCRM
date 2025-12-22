// =====================================================
// SINGLE REFERRAL PROGRAM API
// PATCH /api/referrals/programs/:id - Update a program
// DELETE /api/referrals/programs/:id - Delete a program
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: program, error } = await supabase
      .from('referral_programs')
      .update({
        name: body.name,
        description: body.description,
        referrer_reward_type: body.referrer_reward_type,
        referrer_reward_amount: body.referrer_reward_amount,
        referee_reward_type: body.referee_reward_type,
        referee_reward_amount: body.referee_reward_amount,
        min_purchase_amount: body.min_purchase_amount,
        is_active: body.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating referral program:', error);
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error('Error in PATCH /api/referrals/programs/:id:', error);
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

    const { error } = await supabase.from('referral_programs').delete().eq('id', id);

    if (error) {
      console.error('Error deleting referral program:', error);
      return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/referrals/programs/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
