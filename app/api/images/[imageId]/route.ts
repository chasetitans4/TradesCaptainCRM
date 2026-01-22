// =====================================================
// IMAGE API - Single Image Operations
// GET /api/images/[imageId] - Get image details/URL
// DELETE /api/images/[imageId] - Delete an image
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getImage, getFullResolutionUrl, deleteImage } from '@/lib/images';

// GET - Get image details or specific resolution URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageId } = await params;
    const { searchParams } = new URL(request.url);
    const resolution = searchParams.get('resolution') as 'thumbnail' | 'preview' | 'compressed' | 'original' | null;

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get image metadata from database
    const { data: image } = await supabase
      .from('customer_images')
      .select('*')
      .eq('id', imageId)
      .eq('business_id', userData.business_id)
      .single();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // If original resolution requested, generate signed URL
    if (resolution === 'original') {
      const signedUrl = await getFullResolutionUrl(
        imageId,
        image.customer_id,
        userData.business_id,
        3600 // 1 hour expiry
      );

      if (!signedUrl) {
        return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
      }

      return NextResponse.json({
        id: image.id,
        url: signedUrl.url,
        expiresAt: signedUrl.expiresAt,
        width: image.width,
        height: image.height,
        resolution: 'original',
      });
    }

    // Return appropriate URL based on resolution
    const urls: Record<string, string> = {
      thumbnail: image.thumbnail_url,
      preview: image.preview_url,
      compressed: image.compressed_url,
    };

    return NextResponse.json({
      id: image.id,
      url: urls[resolution || 'compressed'] || image.compressed_url,
      thumbnailUrl: image.thumbnail_url,
      previewUrl: image.preview_url,
      compressedUrl: image.compressed_url,
      width: image.width,
      height: image.height,
      originalSize: image.original_size,
      compressedSize: image.compressed_size,
      compressionRatio: image.compression_ratio,
      category: image.category,
      createdAt: image.created_at,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Image GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get image' }, { status: 500 });
  }
}

// DELETE - Delete an image and all its variants
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageId } = await params;

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify image belongs to this business
    const { data: image } = await supabase
      .from('customer_images')
      .select('id, business_id')
      .eq('id', imageId)
      .eq('business_id', userData.business_id)
      .single();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete the image
    const result = await deleteImage(imageId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    apiLogger.info({
      msg: 'Image deleted',
      imageId,
      businessId: userData.business_id,
      deletedBy: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Image DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
