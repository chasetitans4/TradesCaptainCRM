// =====================================================
// PORTAL IMAGE DETAILS API
// GET /api/portal/images/[imageId] - Get full-res image URL
// Customer can request the original/full-resolution version
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageId } = await params;
    const { searchParams } = new URL(request.url);
    const resolution = searchParams.get('resolution') || 'compressed';

    const supabase = createAdminClient();

    // Get image, verifying ownership
    const { data: image, error } = await supabase
      .from('customer_images')
      .select('*')
      .eq('id', imageId)
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .single();

    if (error || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // If requesting original, generate signed URL
    if (resolution === 'original') {
      const { data: signedUrlData, error: signError } = await supabase.storage
        .from('customer-images-original')
        .createSignedUrl(image.original_path, 3600); // 1 hour expiry

      if (signError || !signedUrlData) {
        return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
      }

      // Log the full-res access
      await logPortalActivity({
        customerId: session.customerId,
        businessId: session.businessId,
        action: 'image_full_res_viewed',
        details: { imageId },
        request,
      });

      return NextResponse.json({
        id: image.id,
        url: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        width: image.width,
        height: image.height,
        resolution: 'original',
      });
    }

    // Return standard resolution URL
    const urls: Record<string, string> = {
      thumbnail: image.thumbnail_url,
      preview: image.preview_url,
      compressed: image.compressed_url,
    };

    return NextResponse.json({
      id: image.id,
      url: urls[resolution] || image.compressed_url,
      thumbnailUrl: image.thumbnail_url,
      previewUrl: image.preview_url,
      width: image.width,
      height: image.height,
      category: image.category,
      createdAt: image.created_at,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal image GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get image' }, { status: 500 });
  }
}
