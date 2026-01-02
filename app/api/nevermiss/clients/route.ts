// =====================================================
// NEVERMISS CLIENTS API
// GET /api/nevermiss/clients
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getNevermissClients } from '@/lib/admin/nevermiss-dashboard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'all' | 'near_cap' | 'over_cap' | 'low_usage' | 'healthy' | null;

    const clients = await getNevermissClients(auth.id, filter || 'all');

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('NeverMiss clients error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
