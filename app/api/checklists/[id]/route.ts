// =====================================================
// CHECKLIST ITEM UPDATE API
// PATCH /api/checklists/[id] - Update checklist item
// DELETE /api/checklists/[id] - Delete checklist template
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { updateChecklistItem, deleteChecklistTemplate } from '@/lib/checklists';
import { apiLogger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { itemId, isCompleted, notes } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    await updateChecklistItem(id, itemId, profile.id, {
      completed: isCompleted,
      notes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error updating checklist item' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/owner can delete templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    await deleteChecklistTemplate(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error deleting checklist template' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete checklist template' },
      { status: 500 }
    );
  }
}
