// =====================================================
// PENDING REIMBURSEMENTS API
// GET /api/expenses/reimbursement/pending - Get pending reimbursements
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPendingReimbursements } from '@/lib/expenses';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    // Technicians can only see their own pending reimbursements
    const targetUserId = profile.role === 'technician' ? profile.id : userId || undefined;

    const result = await getPendingReimbursements(profile.business_id, targetUserId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/expenses/reimbursement/pending:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get pending reimbursements' },
      { status: 500 }
    );
  }
}
