// =====================================================
// MEDIA CLEANUP JOB
// Deletes customer media 21 days after invoice is sent
// Runs daily via cron or queue worker
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';

interface ExpiredMedia {
  media_type: string;
  media_id: string;
  business_id: string;
  customer_id: string;
  entity_type: string;
  entity_id: string | null;
  storage_paths: {
    original?: string;
    compressed?: string;
    thumbnail?: string;
    preview?: string;
    path?: string; // For issue media
  };
  size_bytes: number;
}

interface CleanupResult {
  success: boolean;
  imagesDeleted: number;
  issueMediaDeleted: number;
  storageFreedBytes: number;
  errors: string[];
}

/**
 * Run the media cleanup job
 * Deletes expired media from storage and marks as deleted in DB
 */
export async function runMediaCleanup(batchSize: number = 100): Promise<CleanupResult> {
  const supabase = createAdminClient();
  const result: CleanupResult = {
    success: true,
    imagesDeleted: 0,
    issueMediaDeleted: 0,
    storageFreedBytes: 0,
    errors: [],
  };

  syncLogger.info({ msg: 'Starting media cleanup job', batchSize });

  try {
    // Get expired customer_images
    const { data: expiredImages, error: fetchError } = await supabase
      .rpc('get_expired_media', { p_limit: batchSize });

    if (fetchError) {
      throw new Error(`Failed to fetch expired media: ${fetchError.message}`);
    }

    if (!expiredImages || expiredImages.length === 0) {
      syncLogger.info({ msg: 'No expired media to clean up' });
      return result;
    }

    syncLogger.info({ msg: `Found ${expiredImages.length} expired media items` });

    // Process each expired item
    for (const media of expiredImages as ExpiredMedia[]) {
      try {
        await deleteMediaFromStorage(supabase, media);
        result.storageFreedBytes += media.size_bytes || 0;

        if (media.media_type === 'image') {
          result.imagesDeleted++;
        } else {
          result.issueMediaDeleted++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete ${media.media_id}: ${errorMsg}`);
        syncLogger.error({
          msg: 'Failed to delete media',
          mediaId: media.media_id,
          error: errorMsg,
        });
      }
    }

    // Mark all processed items as deleted in DB
    const mediaIds = expiredImages
      .filter((m: ExpiredMedia) => m.media_type === 'image')
      .map((m: ExpiredMedia) => m.media_id);

    if (mediaIds.length > 0) {
      await supabase.rpc('mark_media_deleted', {
        p_media_ids: mediaIds,
        p_reason: 'retention_expired',
      });
    }

    // Clean up issue media separately
    await cleanupExpiredIssueMedia(supabase, batchSize);

    syncLogger.info({
      msg: 'Media cleanup completed',
      imagesDeleted: result.imagesDeleted,
      issueMediaDeleted: result.issueMediaDeleted,
      storageFreedMB: (result.storageFreedBytes / 1024 / 1024).toFixed(2),
      errors: result.errors.length,
    });

  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
    syncLogger.error({ msg: 'Media cleanup job failed', error: errorMsg });
  }

  return result;
}

/**
 * Delete media files from Supabase storage
 */
async function deleteMediaFromStorage(
  supabase: ReturnType<typeof createAdminClient>,
  media: ExpiredMedia
): Promise<void> {
  const paths = media.storage_paths;

  if (media.media_type === 'image') {
    // Delete all image variants
    const deletions = [];

    if (paths.original) {
      deletions.push(
        supabase.storage.from('customer-images-original').remove([paths.original])
      );
    }
    if (paths.compressed) {
      deletions.push(
        supabase.storage.from('customer-images').remove([paths.compressed])
      );
    }
    if (paths.thumbnail) {
      deletions.push(
        supabase.storage.from('customer-thumbnails').remove([paths.thumbnail])
      );
    }
    if (paths.preview) {
      deletions.push(
        supabase.storage.from('customer-previews').remove([paths.preview])
      );
    }

    await Promise.all(deletions);
  } else if (paths.path) {
    // Issue media - single file
    await supabase.storage.from('issue-media').remove([paths.path]);
  }
}

/**
 * Clean up expired issue media (stored in JSONB)
 */
async function cleanupExpiredIssueMedia(
  supabase: ReturnType<typeof createAdminClient>,
  limit: number
): Promise<number> {
  // Get issues with expired media
  const { data: expiredIssues, error } = await supabase
    .from('customer_issue_reports')
    .select('id, business_id, customer_id, media_urls')
    .lt('media_retention_expires_at', new Date().toISOString())
    .eq('media_archived', false)
    .is('media_deleted_at', null)
    .not('media_urls', 'is', null)
    .limit(limit);

  if (error || !expiredIssues) {
    return 0;
  }

  let deletedCount = 0;

  for (const issue of expiredIssues) {
    const mediaUrls = issue.media_urls as any[];
    if (!mediaUrls || mediaUrls.length === 0) continue;

    // Delete each media file from storage
    for (const media of mediaUrls) {
      try {
        // Extract path from URL
        const url = media.url || '';
        const pathMatch = url.match(/\/issue-media\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('issue-media').remove([pathMatch[1]]);
        }

        // Log deletion
        await supabase.from('media_deletion_log').insert({
          business_id: issue.business_id,
          customer_id: issue.customer_id,
          media_type: media.isVideo ? 'video' : 'image',
          media_id: media.id,
          entity_type: 'issue',
          entity_id: issue.id,
          original_size_bytes: media.originalSize || media.size || 0,
          reason: 'retention_expired',
        });

        deletedCount++;
      } catch (error) {
        syncLogger.error({
          msg: 'Failed to delete issue media file',
          issueId: issue.id,
          mediaId: media.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    // Mark issue media as deleted
    await supabase
      .from('customer_issue_reports')
      .update({
        media_urls: [],
        media_deleted_at: new Date().toISOString(),
      })
      .eq('id', issue.id);
  }

  return deletedCount;
}

/**
 * Get media retention stats for a business
 */
export async function getMediaRetentionStats(businessId: string): Promise<{
  totalMedia: number;
  archivedMedia: number;
  expiringWithin7Days: number;
  totalStorageBytes: number;
  customersWithExpiringMedia: number;
}> {
  const supabase = createAdminClient();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [imageStats, issueStats, expiringCustomers] = await Promise.all([
    // Image stats
    supabase
      .from('customer_images')
      .select('id, archived, retention_expires_at, original_size, compressed_size')
      .eq('business_id', businessId)
      .is('deleted_at', null),

    // Issue media stats
    supabase
      .from('customer_issue_reports')
      .select('id, media_archived, media_retention_expires_at, media_urls')
      .eq('business_id', businessId)
      .is('media_deleted_at', null)
      .not('media_urls', 'is', null),

    // Customers with expiring media
    supabase
      .from('customer_images')
      .select('customer_id')
      .eq('business_id', businessId)
      .eq('archived', false)
      .lt('retention_expires_at', sevenDaysFromNow)
      .gt('retention_expires_at', new Date().toISOString())
      .is('deleted_at', null),
  ]);

  const images = imageStats.data || [];
  const issues = issueStats.data || [];
  const expiring = expiringCustomers.data || [];

  const totalImageStorage = images.reduce((sum, img) =>
    sum + (img.original_size || 0) + (img.compressed_size || 0), 0
  );

  const issueMediaCount = issues.reduce((sum, issue) =>
    sum + ((issue.media_urls as any[])?.length || 0), 0
  );

  const uniqueExpiringCustomers = new Set(expiring.map(e => e.customer_id)).size;

  return {
    totalMedia: images.length + issueMediaCount,
    archivedMedia: images.filter(i => i.archived).length +
      issues.filter(i => i.media_archived).length,
    expiringWithin7Days: images.filter(i =>
      !i.archived &&
      i.retention_expires_at &&
      new Date(i.retention_expires_at) < new Date(sevenDaysFromNow) &&
      new Date(i.retention_expires_at) > new Date()
    ).length,
    totalStorageBytes: totalImageStorage,
    customersWithExpiringMedia: uniqueExpiringCustomers,
  };
}
