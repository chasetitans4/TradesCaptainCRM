// =====================================================
// ADMIN BUSINESS LOGO API
// POST /api/admin/businesses/[id]/logo - Upload logo for a business
// DELETE /api/admin/businesses/[id]/logo - Remove business logo
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/admin';
import { v4 as uuidv4 } from 'uuid';
import { apiLogger } from '@/lib/logger';
import { resizeLogo, isLogoError, LOGO_DIMENSIONS } from '@/lib/images/logo-resize';

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, SVG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify business exists
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Delete old logo if exists
    if (business.logo_url) {
      const oldPath = extractStoragePath(business.logo_url);
      if (oldPath) {
        await supabase.storage.from('business-logos').remove([oldPath]);
      }
    }

    // Convert File to Buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Resize and optimize the logo
    const resizeResult = await resizeLogo(inputBuffer, file.type);

    if (isLogoError(resizeResult)) {
      return NextResponse.json(
        {
          error: resizeResult.message,
          type: resizeResult.type,
          details: resizeResult.details,
          requirements: {
            minimum: `${LOGO_DIMENSIONS.MIN_WIDTH}x${LOGO_DIMENSIONS.MIN_HEIGHT}px`,
            recommended: `${LOGO_DIMENSIONS.RECOMMENDED_WIDTH}x${LOGO_DIMENSIONS.RECOMMENDED_HEIGHT}px`,
          },
        },
        { status: 400 }
      );
    }

    // Generate unique filename with correct extension
    const fileExt = resizeResult.contentType === 'image/svg+xml' ? 'svg' : 'webp';
    const fileName = `${businessId}/${uuidv4()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(fileName, resizeResult.buffer, {
        contentType: resizeResult.contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      apiLogger.error({ error: uploadError, context: 'Admin: Error uploading logo to storage' });
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(fileName);

    // Update business record
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ logo_url: publicUrl })
      .eq('id', businessId);

    if (updateError) {
      apiLogger.error({ error: updateError, context: 'Admin: Error updating business logo_url' });
      throw updateError;
    }

    apiLogger.info({
      context: 'Admin uploaded business logo',
      businessId,
      businessName: business.name,
      adminId: session.adminId,
      dimensions: {
        original: `${resizeResult.originalWidth}x${resizeResult.originalHeight}`,
        final: `${resizeResult.width}x${resizeResult.height}`,
        wasResized: resizeResult.wasResized,
      },
    });

    return NextResponse.json({
      logo_url: publicUrl,
      success: true,
      dimensions: {
        width: resizeResult.width,
        height: resizeResult.height,
        originalWidth: resizeResult.originalWidth,
        originalHeight: resizeResult.originalHeight,
        wasResized: resizeResult.wasResized,
      },
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Admin: Error uploading business logo' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get current logo
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Delete from storage if exists
    if (business.logo_url) {
      const storagePath = extractStoragePath(business.logo_url);
      if (storagePath) {
        await supabase.storage.from('business-logos').remove([storagePath]);
      }
    }

    // Update business record
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ logo_url: null })
      .eq('id', businessId);

    if (updateError) throw updateError;

    apiLogger.info({
      context: 'Admin deleted business logo',
      businessId,
      businessName: business.name,
      adminId: session.adminId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Admin: Error deleting business logo' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete logo' },
      { status: 500 }
    );
  }
}

/**
 * Extract storage path from Supabase public URL
 */
function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/business-logos/');
    return pathParts.length > 1 ? pathParts[1] : null;
  } catch {
    return null;
  }
}
