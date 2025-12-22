// =====================================================
// ADMIN SUBMISSIONS API
// GET /api/admin/submissions - List agent submissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getAgentSubmissions, SubmissionStatus, SubmissionType } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as SubmissionStatus | null;
    const type = searchParams.get('type') as SubmissionType | null;
    const agentId = searchParams.get('agent_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    // Agents can only see their own submissions
    const filters: Record<string, any> = {};
    if (admin.role === 'agent') {
      filters.agentId = admin.id;
    } else if (agentId) {
      filters.agentId = agentId;
    }

    if (status) filters.status = status;
    if (type) filters.type = type;

    const { submissions, total } = await getAgentSubmissions(filters, page, limit);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/submissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get submissions' },
      { status: 500 }
    );
  }
}
