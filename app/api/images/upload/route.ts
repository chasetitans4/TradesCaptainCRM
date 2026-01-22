// =====================================================
// IMAGE UPLOAD API
// POST /api/images/upload - Upload and process an image
// Compresses, generates thumbnails, and stores all variants
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  validateImage,
  processImageAdvanced,
  uploadProcessedImage,
} from '@/lib/images';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for large images

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customerId = formData.get('customerId') as string | null;
    const category = formData.get('category') as string | null;
    const entityId = formData.get('entityId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    if (!category || !['issue', 'job', 'profile', 'document'].includes(category)) {
      return NextResponse.json({
        error: 'category is required and must be one of: issue, job, profile, document',
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image
    const validation = await validateImage(buffer, {
      allowedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'heic', 'heif'],
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Process image (compress + generate thumbnails)
    const processed = await processImageAdvanced(buffer, {
      outputFormat: 'webp',
      generatePreview: true,
    });

    // Upload all versions to storage
    const result = await uploadProcessedImage(processed, {
      businessId: userData.business_id,
      customerId,
      category: category as 'issue' | 'job' | 'profile' | 'document',
      entityId: entityId || undefined,
      fileName: file.name,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    apiLogger.info({
      msg: 'Image uploaded and processed',
      imageId: result.data?.id,
      originalSize: result.data?.originalSize,
      compressedSize: result.data?.compressedSize,
      businessId: userData.business_id,
    });

    return NextResponse.json({
      success: true,
      image: result.data,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Image upload error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
