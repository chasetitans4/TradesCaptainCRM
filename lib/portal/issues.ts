// =====================================================
// PORTAL ISSUE REPORTING
// Customer issue submission with photo/video uploads
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type { CustomerIssueReport } from './types';

/**
 * Create a new issue report
 */
export async function createIssueReport(
  customerId: string,
  businessId: string,
  data: {
    title: string;
    description: string;
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    equipmentId?: string;
    locationNotes?: string;
  }
): Promise<{ success: boolean; issueId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Verify customer belongs to business
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  // If equipment specified, verify it belongs to customer
  if (data.equipmentId) {
    const { data: equipment } = await supabase
      .from('customer_equipment')
      .select('id')
      .eq('id', data.equipmentId)
      .eq('customer_id', customerId)
      .single();

    if (!equipment) {
      return { success: false, error: 'Equipment not found' };
    }
  }

  const { data: issue, error } = await supabase
    .from('customer_issue_reports')
    .insert({
      customer_id: customerId,
      business_id: businessId,
      equipment_id: data.equipmentId,
      title: data.title,
      description: data.description,
      urgency: data.urgency,
      location_notes: data.locationNotes,
      status: 'submitted',
    })
    .select('id')
    .single();

  if (error) {
    syncLogger.error({
      msg: 'Failed to create issue report',
      customerId,
      error: error.message,
    });
    return { success: false, error: 'Failed to submit issue report' };
  }

  syncLogger.info({
    msg: 'Issue report created via portal',
    issueId: issue.id,
    customerId,
    urgency: data.urgency,
  });

  return { success: true, issueId: issue.id };
}

// Constants for media uploads
const MAX_MEDIA_PER_ISSUE = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

/**
 * Validate media file
 */
export function validateMediaFile(
  fileType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MEDIA_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: 'File type not allowed. Supported: JPEG, PNG, GIF, WebP, MP4, MOV, WebM',
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 50MB limit',
    };
  }

  return { valid: true };
}

/**
 * Add media (photo/video) to an issue report
 */
export async function addIssueMedia(
  issueId: string,
  customerId: string,
  businessId: string,
  mediaData: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    thumbnailUrl?: string;
  }
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Validate file type and size
  const validation = validateMediaFile(mediaData.fileType, mediaData.fileSize);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Verify issue belongs to customer and is still editable
  const { data: issue } = await supabase
    .from('customer_issue_reports')
    .select('id, status, media_urls')
    .eq('id', issueId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!issue) {
    return { success: false, error: 'Issue report not found' };
  }

  if (!['submitted', 'reviewing'].includes(issue.status)) {
    return { success: false, error: 'Cannot add media to this issue' };
  }

  // Check media count limit
  const currentMedia = issue.media_urls || [];
  if (currentMedia.length >= MAX_MEDIA_PER_ISSUE) {
    return {
      success: false,
      error: `Maximum ${MAX_MEDIA_PER_ISSUE} files allowed per issue`,
    };
  }

  // Sanitize filename to prevent path traversal
  const sanitizedFileName = mediaData.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  const newMedia = {
    id: crypto.randomUUID(),
    url: mediaData.fileUrl,
    name: sanitizedFileName,
    type: mediaData.fileType,
    size: mediaData.fileSize,
    thumbnail: mediaData.thumbnailUrl,
    uploadedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('customer_issue_reports')
    .update({
      media_urls: [...currentMedia, newMedia],
    })
    .eq('id', issueId);

  if (error) {
    syncLogger.error({
      msg: 'Failed to add media to issue',
      issueId,
      error: error.message,
    });
    return { success: false, error: 'Failed to add media' };
  }

  syncLogger.info({
    msg: 'Media added to issue report',
    issueId,
    mediaId: newMedia.id,
    fileType: mediaData.fileType,
  });

  return { success: true, mediaId: newMedia.id };
}

/**
 * Delete media from an issue report
 */
export async function deleteIssueMedia(
  issueId: string,
  mediaId: string,
  customerId: string,
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Verify issue belongs to customer and is still editable
  const { data: issue } = await supabase
    .from('customer_issue_reports')
    .select('id, status, media_urls')
    .eq('id', issueId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!issue) {
    return { success: false, error: 'Issue report not found' };
  }

  if (!['submitted', 'reviewing'].includes(issue.status)) {
    return { success: false, error: 'Cannot modify media for this issue' };
  }

  const currentMedia = issue.media_urls || [];
  const mediaToDelete = currentMedia.find((m: any) => m.id === mediaId);

  if (!mediaToDelete) {
    return { success: false, error: 'Media not found' };
  }

  // Remove from array
  const updatedMedia = currentMedia.filter((m: any) => m.id !== mediaId);

  const { error } = await supabase
    .from('customer_issue_reports')
    .update({
      media_urls: updatedMedia,
    })
    .eq('id', issueId);

  if (error) {
    return { success: false, error: 'Failed to delete media' };
  }

  // Try to delete from storage (don't fail if this fails)
  try {
    const url = new URL(mediaToDelete.url);
    const pathMatch = url.pathname.match(/\/issue-media\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from('issue-media').remove([pathMatch[1]]);
    }
  } catch {
    // Storage deletion failed, but DB update succeeded - log but don't fail
    syncLogger.warn({
      msg: 'Failed to delete media file from storage',
      issueId,
      mediaId,
    });
  }

  return { success: true };
}

/**
 * Get customer's issue reports
 */
export async function getCustomerIssueReports(
  customerId: string,
  businessId: string,
  status?: string,
  limit: number = 20
): Promise<CustomerIssueReport[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('customer_issue_reports')
    .select(`
      *,
      customer_equipment(
        id,
        equipment_type,
        brand,
        model
      )
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer issue reports',
      customerId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map((issue: any) => ({
    ...issue,
    equipment: issue.customer_equipment,
  }));
}

/**
 * Get single issue report details
 */
export async function getIssueReportDetails(
  issueId: string,
  customerId: string,
  businessId: string
): Promise<CustomerIssueReport | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_issue_reports')
    .select(`
      *,
      customer_equipment(
        id,
        equipment_type,
        brand,
        model,
        serial_number
      ),
      jobs(
        id,
        title,
        status,
        scheduled_start
      )
    `)
    .eq('id', issueId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (error) {
    return null;
  }

  return {
    ...data,
    equipment: data.customer_equipment,
    linkedJob: data.jobs,
  };
}

/**
 * Update issue report (add more details)
 */
export async function updateIssueReport(
  issueId: string,
  customerId: string,
  businessId: string,
  updates: {
    description?: string;
    locationNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Verify issue and check if still editable
  const { data: issue } = await supabase
    .from('customer_issue_reports')
    .select('id, status')
    .eq('id', issueId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!issue) {
    return { success: false, error: 'Issue report not found' };
  }

  if (!['submitted', 'reviewing'].includes(issue.status)) {
    return { success: false, error: 'Cannot update this issue' };
  }

  const updateData: Record<string, any> = {};
  if (updates.description) updateData.description = updates.description;
  if (updates.locationNotes) updateData.location_notes = updates.locationNotes;

  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('customer_issue_reports')
    .update(updateData)
    .eq('id', issueId);

  if (error) {
    return { success: false, error: 'Failed to update issue report' };
  }

  return { success: true };
}

/**
 * Cancel an issue report
 */
export async function cancelIssueReport(
  issueId: string,
  customerId: string,
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Verify issue and check if can be cancelled
  const { data: issue } = await supabase
    .from('customer_issue_reports')
    .select('id, status')
    .eq('id', issueId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!issue) {
    return { success: false, error: 'Issue report not found' };
  }

  if (!['submitted', 'reviewing'].includes(issue.status)) {
    return { success: false, error: 'Cannot cancel this issue - it may already be in progress' };
  }

  const { error } = await supabase
    .from('customer_issue_reports')
    .update({
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', issueId);

  if (error) {
    return { success: false, error: 'Failed to cancel issue report' };
  }

  syncLogger.info({
    msg: 'Issue report cancelled via portal',
    issueId,
    customerId,
  });

  return { success: true };
}

/**
 * Get upload URL for issue media
 */
export async function getIssueMediaUploadUrl(
  issueId: string,
  customerId: string,
  businessId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; path: string } | null> {
  const supabase = createAdminClient();

  // Verify issue belongs to customer
  const { data: issue } = await supabase
    .from('customer_issue_reports')
    .select('id, status')
    .eq('id', issueId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!issue || !['submitted', 'reviewing'].includes(issue.status)) {
    return null;
  }

  // Generate unique path
  const ext = fileName.split('.').pop() || 'jpg';
  const path = `${businessId}/${customerId}/issues/${issueId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('issue-media')
    .createSignedUploadUrl(path);

  if (error) {
    syncLogger.error({
      msg: 'Failed to create upload URL for issue media',
      issueId,
      error: error.message,
    });
    return null;
  }

  // Get public URL
  const { data: publicData } = supabase.storage
    .from('issue-media')
    .getPublicUrl(path);

  return {
    uploadUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
    path,
  };
}
