// =====================================================
// CUSTOMER MEDIA API
// GET /api/customers/[id]/media - Get customer's media with retention info
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify customer belongs to business
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', customerId)
      .eq('business_id', userData.business_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get images with retention info
    const { data: images } = await supabase
      .from('customer_images')
      .select(`
        id,
        thumbnail_url,
        preview_url,
        compressed_url,
        width,
        height,
        category,
        entity_id,
        original_size,
        compressed_size,
        archived,
        retention_expires_at,
        created_at
      `)
      .eq('customer_id', customerId)
      .eq('business_id', userData.business_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Get issue media
    const { data: issues } = await supabase
      .from('customer_issue_reports')
      .select(`
        id,
        title,
        media_urls,
        media_archived,
        media_retention_expires_at,
        created_at
      `)
      .eq('customer_id', customerId)
      .eq('business_id', userData.business_id)
      .is('media_deleted_at', null)
      .not('media_urls', 'is', null)
      .order('created_at', { ascending: false });

    // Calculate totals
    const totalImages = images?.length || 0;
    const archivedImages = images?.filter(i => i.archived).length || 0;
    const totalIssueMedia = issues?.reduce((sum, i) =>
      sum + ((i.media_urls as any[])?.length || 0), 0) || 0;
    const archivedIssueMedia = issues?.filter(i => i.media_archived).length || 0;

    const totalStorageBytes = images?.reduce((sum, i) =>
      sum + (i.original_size || 0) + (i.compressed_size || 0), 0) || 0;

    // Find earliest expiry
    const expiringImages = images?.filter(i =>
      !i.archived && i.retention_expires_at
    ) || [];
    const earliestExpiry = expiringImages.length > 0
      ? expiringImages.reduce((min, i) =>
          new Date(i.retention_expires_at!) < new Date(min)
            ? i.retention_expires_at!
            : min
        , expiringImages[0].retention_expires_at!)
      : null;

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
      },
      summary: {
        totalImages,
        archivedImages,
        totalIssueMedia,
        archivedIssueMedia,
        totalStorageBytes,
        totalStorageMB: (totalStorageBytes / 1024 / 1024).toFixed(2),
        earliestExpiry,
        isFullyArchived: totalImages === archivedImages && totalIssueMedia === archivedIssueMedia,
      },
      images: images || [],
      issues: issues?.map(issue => ({
        id: issue.id,
        title: issue.title,
        mediaCount: (issue.media_urls as any[])?.length || 0,
        media: issue.media_urls,
        archived: issue.media_archived,
        retentionExpiresAt: issue.media_retention_expires_at,
        createdAt: issue.created_at,
      })) || [],
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get customer media error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get media' }, { status: 500 });
  }
}
