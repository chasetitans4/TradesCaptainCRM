// =====================================================
// JOB PHOTO BY ID API
// DELETE /api/photos/[id] - Delete a photo
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { deleteJobPhotoServer } from '@/lib/photos';
import { apiLogger } from '@/lib/logger';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await deleteJobPhotoServer(id, profile.business_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error deleting photo' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
