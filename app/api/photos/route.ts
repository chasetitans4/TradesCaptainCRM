// =====================================================
// JOB PHOTOS API
// GET /api/photos?jobId=xxx - Get photos for a job
// POST /api/photos - Upload a photo
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { uploadJobPhoto, getJobPhotos } from '@/lib/photos';
import { checkUploadRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching photos' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch photos' },
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

    // Rate limit uploads (20 per minute per user)
    const rateLimit = await checkUploadRateLimit(profile.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 60).toString(),
          },
        }
      );
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

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    const photoId = await uploadJobPhoto({
      businessId: profile.business_id,
      jobId,
      file,
      photoType,
      caption: caption || undefined,
      userId: profile.id,
    });

    return NextResponse.json({ id: photoId, success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error uploading photo' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
