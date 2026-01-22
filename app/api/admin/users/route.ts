// =====================================================
// ADMIN USERS API
// GET /api/admin/users - List business users (for admin portal)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const businessId = searchParams.get('business_id');
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        business_id,
        created_at,
        last_login_at
      `)
      .order('full_name', { ascending: true });

    if (role) {
      query = query.eq('role', role);
    }
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    if (status) {
      query = query.eq('status', status);
    } else {
      // Default to active users only
      query = query.eq('status', 'active');
    }

    const { data: users, error } = await query;

    if (error) {
      apiLogger.error({
        msg: 'Error fetching users',
        error: error.message,
      });
      return NextResponse.json({ users: [] });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    apiLogger.error({
      msg: 'Admin users API error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
