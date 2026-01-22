// =====================================================
// PORTAL EQUIPMENT PHOTOS API
// GET /api/portal/equipment/[id]/photos - Get equipment photos
// POST /api/portal/equipment/[id]/photos - Upload photo
// DELETE /api/portal/equipment/[id]/photos - Delete photo
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS_PER_EQUIPMENT = 10;

// GET - Get photos for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const session = await getPortalSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify equipment belongs to customer
    const { data: equipment, error: equipmentError } = await supabase
      .from('customer_equipment')
      .select('id, photo_urls')
      .eq('id', equipmentId)
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .single();

    if (equipmentError || !equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json({ photos: equipment.photo_urls || [] });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal equipment photos GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get photos' },
      { status: 500 }
    );
  }
}

// POST - Upload photo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const session = await getPortalSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify equipment belongs to customer
    const { data: equipment, error: equipmentError } = await supabase
      .from('customer_equipment')
      .select('id, photo_urls')
      .eq('id', equipmentId)
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .single();

    if (equipmentError || !equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Check photo limit
    const currentPhotos = equipment.photo_urls || [];
    if (currentPhotos.length >= MAX_PHOTOS_PER_EQUIPMENT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_EQUIPMENT} photos allowed per equipment` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC' },
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

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const storagePath = `equipment/${session.businessId}/${session.customerId}/${equipmentId}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('equipment-photos')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      apiLogger.error({
        msg: 'Storage upload error',
        error: uploadError.message,
      });
      return NextResponse.json(
        { error: 'Failed to upload photo' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('equipment-photos')
      .getPublicUrl(storagePath);

    const photoUrl = urlData.publicUrl;

    // Update equipment with new photo URL
    const updatedPhotos = [...currentPhotos, photoUrl];

    const { error: updateError } = await supabase
      .from('customer_equipment')
      .update({
        photo_urls: updatedPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId);

    if (updateError) {
      // Try to clean up uploaded file
      await supabase.storage
        .from('equipment-photos')
        .remove([storagePath]);

      throw updateError;
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      totalPhotos: updatedPhotos.length,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal equipment photo upload error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

// DELETE - Remove photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const session = await getPortalSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoUrl = searchParams.get('photoUrl');

    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify equipment belongs to customer
    const { data: equipment, error: equipmentError } = await supabase
      .from('customer_equipment')
      .select('id, photo_urls')
      .eq('id', equipmentId)
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .single();

    if (equipmentError || !equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const currentPhotos = equipment.photo_urls || [];

    if (!currentPhotos.includes(photoUrl)) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Extract storage path from URL
    const urlParts = photoUrl.split('/equipment-photos/');
    if (urlParts.length === 2) {
      const storagePath = decodeURIComponent(urlParts[1]);
      // Delete from storage (don't fail if it doesn't exist)
      await supabase.storage
        .from('equipment-photos')
        .remove([storagePath]);
    }

    // Update equipment to remove photo URL
    const updatedPhotos = currentPhotos.filter((url: string) => url !== photoUrl);

    const { error: updateError } = await supabase
      .from('customer_equipment')
      .update({
        photo_urls: updatedPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      totalPhotos: updatedPhotos.length,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal equipment photo delete error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
