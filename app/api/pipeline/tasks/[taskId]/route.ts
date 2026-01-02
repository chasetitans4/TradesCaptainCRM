// =====================================================
// TASK DETAIL API
// PATCH /api/pipeline/tasks/:taskId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { updateTask, completeTask } from '@/lib/admin/pipeline';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();

    // Special handling for completing tasks
    if (body.action === 'complete') {
      const task = await completeTask(taskId, admin.id);
      return NextResponse.json({ task });
    }

    const task = await updateTask(taskId, body);

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}
