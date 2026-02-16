// =====================================================
// JOB PHOTOS LIBRARY
// Upload, retrieve, and manage job photos
// =====================================================

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'general';

interface UploadPhotoParams {
  jobId: string;
  businessId: string;
  userId: string;
  file: File;
  photoType: PhotoType;
  caption?: string;
  latitude?: number;
  longitude?: number;
}

interface JobPhoto {
  id: string;
  job_id: string;
  business_id: string;
  photo_url: string;
  thumbnail_url?: string;
  storage_path: string;
  photo_type: PhotoType;
  caption?: string;
  taken_at: string;
  uploaded_by: string;
  latitude?: number;
  longitude?: number;
  display_order: number;
  created_at: string;
  uploaded_by_user?: { name: string };
}

interface GroupedPhotos {
  before: JobPhoto[];
  during: JobPhoto[];
  after: JobPhoto[];
  issue: JobPhoto[];
  general: JobPhoto[];
  all: JobPhoto[];
}

/**
 * Upload a photo for a job (client-side)
 */
export async function uploadJobPhoto(params: UploadPhotoParams): Promise<string> {
  const { jobId, businessId, userId, file, photoType, caption, latitude, longitude } = params;
  const supabase = createClient();

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const storagePath = `${businessId}/${jobId}/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('job-photos')
    .getPublicUrl(storagePath);

  // Create thumbnail URL (using Supabase image transformation)
  const thumbnailUrl = `${publicUrl}?width=200&height=200&resize=cover`;

  // Save to database
  const { data, error } = await supabase
    .from('job_photos')
    .insert({
      business_id: businessId,
      job_id: jobId,
      photo_url: publicUrl,
      storage_path: storagePath,
      thumbnail_url: thumbnailUrl,
      photo_type: photoType,
      caption,
      uploaded_by: userId,
      latitude,
      longitude,
      taken_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data.id;
}

/**
 * Get all photos for a job, grouped by type (client-side)
 */
export async function getJobPhotos(jobId: string): Promise<GroupedPhotos> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_photos')
    .select(`
      *,
      uploaded_by_user:users!uploaded_by(name)
    `)
    .eq('job_id', jobId)
    .order('photo_type')
    .order('display_order')
    .order('created_at');

  if (error) throw error;

  const photos = data as JobPhoto[];

  // Group by type
  return {
    before: photos.filter(p => p.photo_type === 'before'),
    during: photos.filter(p => p.photo_type === 'during'),
    after: photos.filter(p => p.photo_type === 'after'),
    issue: photos.filter(p => p.photo_type === 'issue'),
    general: photos.filter(p => p.photo_type === 'general'),
    all: photos,
  };
}

/**
 * Get photos for a job (server-side)
 */
export async function getJobPhotosServer(jobId: string): Promise<GroupedPhotos> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('job_photos')
    .select(`
      *,
      uploaded_by_user:users!uploaded_by(name)
    `)
    .eq('job_id', jobId)
    .order('photo_type')
    .order('display_order')
    .order('created_at');

  if (error) throw error;

  const photos = data as JobPhoto[];

  return {
    before: photos.filter(p => p.photo_type === 'before'),
    during: photos.filter(p => p.photo_type === 'during'),
    after: photos.filter(p => p.photo_type === 'after'),
    issue: photos.filter(p => p.photo_type === 'issue'),
    general: photos.filter(p => p.photo_type === 'general'),
    all: photos,
  };
}

/**
 * Delete a photo (client-side)
 */
export async function deleteJobPhoto(photoId: string): Promise<void> {
  const supabase = createClient();

  // Get storage path first
  const { data: photo } = await supabase
    .from('job_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single();

  if (photo?.storage_path) {
    // Delete from storage
    await supabase.storage
      .from('job-photos')
      .remove([photo.storage_path]);
  }

  // Delete from database
  const { error } = await supabase
    .from('job_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
}

/**
 * Delete a photo (server-side, with business_id ownership check)
 */
export async function deleteJobPhotoServer(photoId: string, businessId: string): Promise<void> {
  const supabase = await createServerClient();

  // Get storage path and verify business ownership
  const { data: photo, error: fetchError } = await supabase
    .from('job_photos')
    .select('storage_path, business_id')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    throw new Error('Photo not found');
  }

  if (photo.business_id !== businessId) {
    throw new Error('Unauthorized');
  }

  if (photo.storage_path) {
    await supabase.storage
      .from('job-photos')
      .remove([photo.storage_path]);
  }

  const { error } = await supabase
    .from('job_photos')
    .delete()
    .eq('id', photoId)
    .eq('business_id', businessId);

  if (error) throw error;
}

/**
 * Update photo caption or type
 */
export async function updateJobPhoto(
  photoId: string,
  updates: { caption?: string; photoType?: PhotoType; displayOrder?: number }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('job_photos')
    .update({
      caption: updates.caption,
      photo_type: updates.photoType,
      display_order: updates.displayOrder,
    })
    .eq('id', photoId);

  if (error) throw error;
}

/**
 * Reorder photos within a type
 */
export async function reorderPhotos(
  jobId: string,
  photoType: PhotoType,
  photoIds: string[]
): Promise<void> {
  const supabase = createClient();

  // Update display_order for each photo
  for (let i = 0; i < photoIds.length; i++) {
    await supabase
      .from('job_photos')
      .update({ display_order: i })
      .eq('id', photoIds[i])
      .eq('job_id', jobId)
      .eq('photo_type', photoType);
  }
}

/**
 * Get photo count for a job
 */
export async function getPhotoCount(jobId: string): Promise<{
  total: number;
  byType: Record<PhotoType, number>;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_photos')
    .select('photo_type')
    .eq('job_id', jobId);

  if (error) throw error;

  const byType: Record<PhotoType, number> = {
    before: 0,
    during: 0,
    after: 0,
    issue: 0,
    general: 0,
  };

  for (const photo of data) {
    const type = photo.photo_type as PhotoType;
    if (byType[type] !== undefined) {
      byType[type]++;
    }
  }

  return {
    total: data.length,
    byType,
  };
}
