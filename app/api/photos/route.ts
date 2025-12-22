// =====================================================
// JOB PHOTOS API
// GET /api/photos?jobId=xxx - Get photos for a job
// POST /api/photos - Upload a photo
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { uploadJobPhoto, getJobPhotos } from '@/lib/photos';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const photos = await getJobPhotos(jobId);

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const jobId = formData.get('jobId') as string;
    const photoType = formData.get('photoType') as 'before' | 'during' | 'after' | 'issue' | 'general';
    const caption = formData.get('caption') as string | null;

    if (!file || !jobId || !photoType) {
      return NextResponse.json(
        { error: 'File, jobId, and photoType are required' },
        { status: 400 }
      );
    }

    const photoId = await uploadJobPhoto({
      businessId: profile.business_id,
      jobId,
      file,
      photoType,
      caption: caption || undefined,
      uploadedBy: profile.id,
    });

    return NextResponse.json({ id: photoId, success: true });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
