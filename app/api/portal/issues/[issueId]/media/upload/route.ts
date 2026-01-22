// =====================================================
// PORTAL ISSUE MEDIA UPLOAD WITH COMPRESSION
// POST /api/portal/issues/[issueId]/media/upload
// Uploads image, compresses it, generates thumbnail
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';
import {
  validateImage,
  processImageAdvanced,
  uploadProcessedImage,
} from '@/lib/images';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Constants
const MAX_MEDIA_PER_ISSUE = 10;
const MAX_VIDEOS_PER_ISSUE = 2;
const MAX_VIDEO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_DURATION_SECONDS = 30;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;
    const supabase = createAdminClient();

    // Verify issue belongs to customer and is editable
    const { data: issue } = await supabase
      .from('customer_issue_reports')
      .select('id, status, media_urls')
      .eq('id', issueId)
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .single();

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (!['submitted', 'reviewing'].includes(issue.status)) {
      return NextResponse.json({ error: 'Cannot add media to this issue' }, { status: 400 });
    }

    // Check media count
    const currentMedia = issue.media_urls || [];
    if (currentMedia.length >= MAX_MEDIA_PER_ISSUE) {
      return NextResponse.json({
        error: `Maximum ${MAX_MEDIA_PER_ISSUE} files allowed per issue`,
      }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    // Handle video files with strict limits
    if (isVideo) {
      // Check video count limit
      const existingVideoCount = currentMedia.filter((m: any) => m.isVideo).length;
      if (existingVideoCount >= MAX_VIDEOS_PER_ISSUE) {
        return NextResponse.json({
          error: `Maximum ${MAX_VIDEOS_PER_ISSUE} videos allowed per issue`,
        }, { status: 400 });
      }

      // Check video size limit
      if (buffer.length > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json({
          error: `Video must be under ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB. Your video is ${(buffer.length / 1024 / 1024).toFixed(1)}MB.`,
        }, { status: 400 });
      }

      return handleVideoUpload(
        supabase,
        buffer,
        file,
        issueId,
        issue,
        currentMedia,
        session,
        request
      );
    }

    // Validate image
    const validation = await validateImage(buffer, {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'heic', 'heif'],
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Process image (compress + thumbnails)
    const processed = await processImageAdvanced(buffer, {
      outputFormat: 'webp',
      generatePreview: true,
    });

    // Upload to storage
    const uploadResult = await uploadProcessedImage(processed, {
      businessId: session.businessId,
      customerId: session.customerId,
      category: 'issue',
      entityId: issueId,
      fileName: file.name,
    });

    if (!uploadResult.success || !uploadResult.data) {
      return NextResponse.json({ error: uploadResult.error || 'Upload failed' }, { status: 500 });
    }

    // Add to issue media array
    const newMedia = {
      id: uploadResult.data.id,
      url: uploadResult.data.compressedUrl,
      thumbnailUrl: uploadResult.data.thumbnailUrl,
      previewUrl: uploadResult.data.previewUrl,
      name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      type: 'image/webp',
      originalType: file.type,
      size: uploadResult.data.compressedSize,
      originalSize: uploadResult.data.originalSize,
      width: uploadResult.data.width,
      height: uploadResult.data.height,
      uploadedAt: new Date().toISOString(),
      compressed: true,
    };

    const { error: updateError } = await supabase
      .from('customer_issue_reports')
      .update({
        media_urls: [...currentMedia, newMedia],
      })
      .eq('id', issueId);

    if (updateError) {
      apiLogger.error({
        msg: 'Failed to update issue media',
        issueId,
        error: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to save media' }, { status: 500 });
    }

    // Log activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'issue_media_uploaded',
      details: {
        issueId,
        mediaId: newMedia.id,
        originalSize: uploadResult.data.originalSize,
        compressedSize: uploadResult.data.compressedSize,
        compressionRatio: (uploadResult.data.originalSize / uploadResult.data.compressedSize).toFixed(2),
      },
      request,
    });

    apiLogger.info({
      msg: 'Issue media uploaded with compression',
      issueId,
      mediaId: newMedia.id,
      originalSize: uploadResult.data.originalSize,
      compressedSize: uploadResult.data.compressedSize,
    });

    return NextResponse.json({
      success: true,
      media: newMedia,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue media upload error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}

/**
 * Handle video upload (no compression)
 */
async function handleVideoUpload(
  supabase: ReturnType<typeof createAdminClient>,
  buffer: Buffer,
  file: File,
  issueId: string,
  issue: any,
  currentMedia: any[],
  session: { customerId: string; businessId: string },
  request: NextRequest
) {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const mediaId = crypto.randomUUID();
  const timestamp = Date.now();
  const path = `${session.businessId}/${session.customerId}/issue/${issueId}/${mediaId}_${timestamp}_${sanitizedName}`;

  // Upload video directly
  const { error: uploadError } = await supabase.storage
    .from('issue-media')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Video upload failed' }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage
    .from('issue-media')
    .getPublicUrl(path);

  const newMedia = {
    id: mediaId,
    url: publicUrl.publicUrl,
    name: sanitizedName,
    type: file.type,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
    isVideo: true,
  };

  const { error: updateError } = await supabase
    .from('customer_issue_reports')
    .update({
      media_urls: [...currentMedia, newMedia],
    })
    .eq('id', issueId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
  }

  await logPortalActivity({
    customerId: session.customerId,
    businessId: session.businessId,
    action: 'issue_video_uploaded',
    details: { issueId, mediaId, size: buffer.length },
    request,
  });

  return NextResponse.json({
    success: true,
    media: newMedia,
  });
}
