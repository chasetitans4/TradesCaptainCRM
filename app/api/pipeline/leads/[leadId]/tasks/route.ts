// =====================================================
// LEAD TASKS API
// GET /api/pipeline/leads/:leadId/tasks
// POST /api/pipeline/leads/:leadId/tasks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLeadTasks, createTask } from '@/lib/admin/pipeline';
import type { LeadTaskType } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const { searchParams } = new URL(_request.url);
    const includeCompleted = searchParams.get('include_completed') === 'true';

    const tasks = await getLeadTasks(leadId, includeCompleted);

    return NextResponse.json({ tasks });
  } catch (error) {
    apiLogger.error({ error, context: 'Get tasks error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await params;
    const body = await request.json();

    const task = await createTask(leadId, admin.id, {
      task_type: body.task_type as LeadTaskType,
      description: body.description,
      due_date: body.due_date,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'Create task error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    );
  }
}
