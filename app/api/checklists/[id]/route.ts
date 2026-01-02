// =====================================================
// CHECKLIST ITEM UPDATE API
// PATCH /api/checklists/[id] - Update checklist item
// DELETE /api/checklists/[id] - Delete checklist template
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { updateChecklistItem, deleteChecklistTemplate } from '@/lib/checklists';

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
    const { itemId, isCompleted, notes, photoUrl } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    await updateChecklistItem(id, itemId, profile.id, {
      completed: isCompleted,
      notes,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update checklist item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
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
  } catch (error: any) {
    console.error('Error deleting checklist template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete checklist template' },
      { status: 500 }
    );
  }
}
