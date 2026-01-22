// =====================================================
// JOB PHOTOS API
// GET /api/photos?jobId=xxx - Get photos for a job
// POST /api/photos - Upload a photo
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createClient } from '@/lib/supabase/server';
import { getJobPhotos } from '@/lib/photos';
import { checkUploadRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';
import { processImage } from '@/lib/images/processor';
import { v4 as uuidv4 } from 'uuid';

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'general';

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

    // Convert file to buffer and compress
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = await createClient();
    const fileName = `${uuidv4()}.webp`;
    const storagePath = `${profile.business_id}/${jobId}/${fileName}`;
    const thumbPath = `${profile.business_id}/${jobId}/${uuidv4()}_thumb.webp`;

    let uploadBuffer: Buffer = buffer;
    let uploadContentType = file.type;
    let thumbnailBuffer: Buffer | null = null;
    let compressionRatio: number | undefined;

    try {
      // Process and compress image
      const processed = await processImage(buffer, {
        outputFormat: 'webp',
        quality: 85,
        generatePreview: true,
      });

      uploadBuffer = Buffer.from(processed.compressed.buffer);
      uploadContentType = 'image/webp';
      thumbnailBuffer = Buffer.from(processed.thumbnail.buffer);
      compressionRatio = processed.metadata.compressionRatio;

      apiLogger.info({
        msg: 'Job photo compressed',
        originalSize: processed.metadata.originalSize,
        compressedSize: processed.metadata.compressedSize,
        ratio: compressionRatio?.toFixed(2),
      });
    } catch (compressionError) {
      apiLogger.warn({
        msg: 'Photo compression failed, using original',
        error: compressionError instanceof Error ? compressionError.message : 'Unknown error',
      });
    }

    // Upload main image
    const { error: uploadError } = await supabase.storage
      .from('job-photos')
      .upload(storagePath, uploadBuffer, {
        contentType: uploadContentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Upload thumbnail if compression succeeded
    let thumbnailUrl: string | undefined;
    if (thumbnailBuffer) {
      const { error: thumbError } = await supabase.storage
        .from('job-photos')
        .upload(thumbPath, thumbnailBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });

      if (!thumbError) {
        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
          .from('job-photos')
          .getPublicUrl(thumbPath);
        thumbnailUrl = thumbPublicUrl;
      }
    }

    // Get public URL for main image
    const { data: { publicUrl } } = supabase.storage
      .from('job-photos')
      .getPublicUrl(storagePath);

    // Fallback thumbnail using Supabase transformation
    if (!thumbnailUrl) {
      thumbnailUrl = `${publicUrl}?width=200&height=200&resize=cover`;
    }

    // Save to database
    const { data: photoData, error: dbError } = await supabase
      .from('job_photos')
      .insert({
        business_id: profile.business_id,
        job_id: jobId,
        photo_url: publicUrl,
        storage_path: storagePath,
        thumbnail_url: thumbnailUrl,
        photo_type: photoType,
        caption: caption || null,
        uploaded_by: profile.id,
        taken_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      id: photoData.id,
      success: true,
      url: publicUrl,
      thumbnailUrl,
      compressionRatio,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error uploading photo' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
