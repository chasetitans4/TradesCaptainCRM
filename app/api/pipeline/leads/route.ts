// =====================================================
// PIPELINE LEADS API
// GET /api/pipeline/leads - Get all leads
// POST /api/pipeline/leads - Create lead
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLeads, createLead } from '@/lib/admin/pipeline';
import type { PipelineStage } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage') as PipelineStage | null;
    const source = searchParams.get('source') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const leads = await getLeads(admin.id, {
      stage: stage || undefined,
      source,
      limit,
      offset,
    });

    return NextResponse.json({ leads });
  } catch (error) {
    apiLogger.error({ error, context: 'Get leads error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const lead = await createLead(admin.id, body);

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'Create lead error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead' },
      { status: 500 }
    );
  }
}
