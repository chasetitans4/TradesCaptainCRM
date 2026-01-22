// =====================================================
// RECEIPT UPLOAD API
// POST /api/receipts/upload - Upload receipt image
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/features';
import { apiLogger } from '@/lib/logger';
import { processImage } from '@/lib/images/processor';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if receipts feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'receipts_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Receipts feature is not enabled' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC, PDF' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique base path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const basePath = `${profile.business_id}/${timestamp}-${randomId}`;

    // For images (not PDFs), apply compression while keeping original for OCR
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    let uploadBuffer = buffer;
    let uploadContentType = file.type;
    let fileName = `${basePath}.${file.name.split('.').pop() || 'jpg'}`;
    let thumbnailUrl: string | undefined;
    let compressionRatio: number | undefined;

    if (isImage && !file.type.includes('heic')) {
      try {
        // Process image: compress and generate thumbnail
        const processed = await processImage(buffer, {
          outputFormat: 'webp',
          quality: 85,
          generatePreview: false,
        });

        // Use compressed version for storage (reduces costs)
        uploadBuffer = Buffer.from(processed.compressed.buffer);
        uploadContentType = 'image/webp';
        fileName = `${basePath}.webp`;

        compressionRatio = processed.metadata.compressionRatio;

        // Also upload thumbnail for quick preview
        const thumbFileName = `${basePath}_thumb.webp`;
        const { error: thumbError } = await supabase.storage
          .from('receipts')
          .upload(thumbFileName, Buffer.from(processed.thumbnail.buffer), {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          });

        if (!thumbError) {
          const { data: thumbUrl } = supabase.storage
            .from('receipts')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbUrl.publicUrl;
        }

        apiLogger.info({
          msg: 'Receipt image compressed',
          originalSize: processed.metadata.originalSize,
          compressedSize: processed.metadata.compressedSize,
          ratio: compressionRatio?.toFixed(2),
        });
      } catch (compressionError) {
        // Fall back to original if compression fails (e.g., HEIC not supported)
        apiLogger.warn({
          msg: 'Receipt compression failed, using original',
          error: compressionError instanceof Error ? compressionError.message : 'Unknown error',
        });
      }
    }

    // Upload main file
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, uploadBuffer, {
        contentType: uploadContentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      apiLogger.error({ error, context: 'uploading receipt image' });
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
      thumbnailUrl,
      compressionRatio,
      compressed: isImage && !isPdf,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'uploading receipt' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}
