// =====================================================
// ONBOARDING TASK API
// PATCH /api/onboarding/clients/:clientId/tasks/:taskId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { updateOnboardingTask } from '@/lib/admin/onboarding';
import type { OnboardingTaskStatus } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; taskId: string }> }
) {
  try {
    await checkPermission('manage_onboarding');
    const session = await getServerSession();

    const { taskId } = await params;
    const body = await request.json();

    const task = await updateOnboardingTask(taskId, {
      status: body.status as OnboardingTaskStatus,
      blocked_reason: body.blocked_reason,
      notes: body.notes,
      completed_by: session!.user.name || session!.user.email || 'Unknown',
    });

    return NextResponse.json({ task });
  } catch (error) {
    apiLogger.error({ message: 'Update task error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}
