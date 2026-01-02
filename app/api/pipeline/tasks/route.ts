// =====================================================
// PIPELINE TASKS API
// GET /api/pipeline/tasks - Get tasks (today/overdue)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getTodaysTasks, getOverdueTasks } from '@/lib/admin/pipeline';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'today';

    let tasks;
    if (type === 'overdue') {
      tasks = await getOverdueTasks(admin.id);
    } else {
      tasks = await getTodaysTasks(admin.id);
    }

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
