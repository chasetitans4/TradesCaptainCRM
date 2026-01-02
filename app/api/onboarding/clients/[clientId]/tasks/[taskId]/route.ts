// =====================================================
// ONBOARDING TASK API
// PATCH /api/onboarding/clients/:clientId/tasks/:taskId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { updateOnboardingTask } from '@/lib/admin/onboarding';
import type { OnboardingTaskStatus } from '@/lib/admin/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; taskId: string }> }
) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();

    const task = await updateOnboardingTask(taskId, {
      status: body.status as OnboardingTaskStatus,
      blocked_reason: body.blocked_reason,
      notes: body.notes,
      completed_by: auth.name || auth.email,
    });

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}
