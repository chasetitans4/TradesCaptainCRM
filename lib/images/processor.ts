// =====================================================
// IMAGE PROCESSOR
// Compression, thumbnail generation, and optimization
// Uses Sharp for high-performance image processing
// =====================================================

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';

// Configuration
export const IMAGE_CONFIG = {
  // Compression settings
  compression: {
    jpeg: { quality: 85, progressive: true },
    webp: { quality: 85, effort: 4 },
    png: { compressionLevel: 9, progressive: true },
  },
  // Thumbnail settings
  thumbnail: {
    width: 150,
    height: 150,
    fit: 'cover' as const,
  },
  // Medium preview (for galleries)
  preview: {
    width: 800,
    height: 800,
    fit: 'inside' as const,
  },
  // Max dimensions for full-res storage
  maxDimension: 4096,
  // Supported input formats
  supportedFormats: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'tiff', 'avif'],
  // Output format preference
  preferredFormat: 'webp' as const,
};

export interface ProcessedImage {
  original: {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
  };
  compressed: {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
  };
  thumbnail: {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
  };
  preview: {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
  };
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTimeMs: number;
  };
}

export interface ImageUploadResult {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    originalUrl: string;
    compressedUrl: string;
    thumbnailUrl: string;
    previewUrl: string;
    width: number;
    height: number;
    originalSize: number;
    compressedSize: number;
    format: string;
  };
}

/**
 * Validate image file before processing
 */
export function validateImage(
  buffer: Buffer,
  mimeType: string,
  maxSizeBytes: number = 50 * 1024 * 1024
): { valid: boolean; error?: string } {
  // Check size
  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  // Check mime type
  const format = mimeType.replace('image/', '').toLowerCase();
  if (!IMAGE_CONFIG.supportedFormats.includes(format)) {
    return {
      valid: false,
      error: `Unsupported format: ${format}. Supported: ${IMAGE_CONFIG.supportedFormats.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Process an image: compress and generate thumbnails
 */
export async function processImage(
  inputBuffer: Buffer,
  options: {
    outputFormat?: 'jpeg' | 'webp' | 'png' | 'original';
    quality?: number;
    generatePreview?: boolean;
  } = {}
): Promise<ProcessedImage> {
  const startTime = Date.now();
  const {
    outputFormat = IMAGE_CONFIG.preferredFormat,
    quality,
    generatePreview = true,
  } = options;

  // Get original image metadata
  const originalMetadata = await sharp(inputBuffer).metadata();
  const originalWidth = originalMetadata.width || 0;
  const originalHeight = originalMetadata.height || 0;
  const originalFormat = originalMetadata.format || 'unknown';

  // Determine output format
  const targetFormat = outputFormat === 'original' ? originalFormat : outputFormat;

  // Create base sharp instance with auto-rotation based on EXIF
  const baseImage = sharp(inputBuffer).rotate();

  // Resize if exceeds max dimension
  let compressedImage = baseImage.clone();
  if (originalWidth > IMAGE_CONFIG.maxDimension || originalHeight > IMAGE_CONFIG.maxDimension) {
    compressedImage = compressedImage.resize({
      width: IMAGE_CONFIG.maxDimension,
      height: IMAGE_CONFIG.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Apply compression based on format
  const compressionOptions = getCompressionOptions(targetFormat as any, quality);
  compressedImage = applyFormatOptions(compressedImage, targetFormat as any, compressionOptions);

  // Generate compressed buffer
  const compressedBuffer = await compressedImage.toBuffer();
  const compressedMetadata = await sharp(compressedBuffer).metadata();

  // Generate thumbnail
  const thumbnailBuffer = await baseImage
    .clone()
    .resize({
      width: IMAGE_CONFIG.thumbnail.width,
      height: IMAGE_CONFIG.thumbnail.height,
      fit: IMAGE_CONFIG.thumbnail.fit,
      position: 'center',
    })
    .webp({ quality: 80 })
    .toBuffer();
  const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

  // Generate preview (medium resolution)
  let previewBuffer = compressedBuffer;
  let previewMetadata = compressedMetadata;

  if (generatePreview && (originalWidth > IMAGE_CONFIG.preview.width || originalHeight > IMAGE_CONFIG.preview.height)) {
    previewBuffer = await baseImage
      .clone()
      .resize({
        width: IMAGE_CONFIG.preview.width,
        height: IMAGE_CONFIG.preview.height,
        fit: IMAGE_CONFIG.preview.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    previewMetadata = await sharp(previewBuffer).metadata();
  }

  const processingTimeMs = Date.now() - startTime;
  const compressionRatio = inputBuffer.length / compressedBuffer.length;

  return {
    original: {
      buffer: inputBuffer,
      width: originalWidth,
      height: originalHeight,
      format: originalFormat,
      size: inputBuffer.length,
    },
    compressed: {
      buffer: compressedBuffer,
      width: compressedMetadata.width || 0,
      height: compressedMetadata.height || 0,
      format: targetFormat,
      size: compressedBuffer.length,
    },
    thumbnail: {
      buffer: thumbnailBuffer,
      width: thumbnailMetadata.width || 0,
      height: thumbnailMetadata.height || 0,
      format: 'webp',
      size: thumbnailBuffer.length,
    },
    preview: {
      buffer: previewBuffer,
      width: previewMetadata.width || 0,
      height: previewMetadata.height || 0,
      format: 'webp',
      size: previewBuffer.length,
    },
    metadata: {
      originalSize: inputBuffer.length,
      compressedSize: compressedBuffer.length,
      compressionRatio,
      processingTimeMs,
    },
  };
}

/**
 * Get compression options for a specific format
 */
function getCompressionOptions(
  format: 'jpeg' | 'webp' | 'png',
  customQuality?: number
): any {
  const config = IMAGE_CONFIG.compression[format] || IMAGE_CONFIG.compression.jpeg;

  if (customQuality !== undefined) {
    return { ...config, quality: customQuality };
  }

  return config;
}

/**
 * Apply format-specific options to sharp instance
 */
function applyFormatOptions(
  image: sharp.Sharp,
  format: 'jpeg' | 'webp' | 'png' | string,
  options: any
): sharp.Sharp {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return image.jpeg(options);
    case 'webp':
      return image.webp(options);
    case 'png':
      return image.png(options);
    default:
      return image.webp(IMAGE_CONFIG.compression.webp);
  }
}

/**
 * Upload processed image to storage
 */
export async function uploadProcessedImage(
  processed: ProcessedImage,
  options: {
    businessId: string;
    customerId: string;
    category: 'issue' | 'job' | 'profile' | 'document';
    entityId?: string;
    fileName: string;
  }
): Promise<ImageUploadResult> {
  const supabase = createAdminClient();
  const { businessId, customerId, category, entityId, fileName } = options;

  // Generate unique ID and paths
  const imageId = crypto.randomUUID();
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const basePath = `${businessId}/${customerId}/${category}${entityId ? `/${entityId}` : ''}`;

  const paths = {
    original: `${basePath}/original/${imageId}_${timestamp}_${sanitizedName}`,
    compressed: `${basePath}/compressed/${imageId}_${timestamp}.webp`,
    thumbnail: `${basePath}/thumbnails/${imageId}_${timestamp}_thumb.webp`,
    preview: `${basePath}/previews/${imageId}_${timestamp}_preview.webp`,
  };

  try {
    // Upload all versions in parallel
    const [originalUpload, compressedUpload, thumbnailUpload, previewUpload] = await Promise.all([
      supabase.storage
        .from('customer-images-original')
        .upload(paths.original, processed.original.buffer, {
          contentType: `image/${processed.original.format}`,
          cacheControl: '31536000', // 1 year cache for originals
        }),
      supabase.storage
        .from('customer-images')
        .upload(paths.compressed, processed.compressed.buffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        }),
      supabase.storage
        .from('customer-thumbnails')
        .upload(paths.thumbnail, processed.thumbnail.buffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        }),
      supabase.storage
        .from('customer-previews')
        .upload(paths.preview, processed.preview.buffer, {
          contentType: 'image/webp',
          cacheControl: '2592000', // 30 days for previews
        }),
    ]);

    // Check for errors
    if (originalUpload.error) throw new Error(`Original upload failed: ${originalUpload.error.message}`);
    if (compressedUpload.error) throw new Error(`Compressed upload failed: ${compressedUpload.error.message}`);
    if (thumbnailUpload.error) throw new Error(`Thumbnail upload failed: ${thumbnailUpload.error.message}`);
    if (previewUpload.error) throw new Error(`Preview upload failed: ${previewUpload.error.message}`);

    // Get public URLs
    const urls = {
      original: supabase.storage.from('customer-images-original').getPublicUrl(paths.original).data.publicUrl,
      compressed: supabase.storage.from('customer-images').getPublicUrl(paths.compressed).data.publicUrl,
      thumbnail: supabase.storage.from('customer-thumbnails').getPublicUrl(paths.thumbnail).data.publicUrl,
      preview: supabase.storage.from('customer-previews').getPublicUrl(paths.preview).data.publicUrl,
    };

    // Store metadata in database
    const { error: dbError } = await supabase.from('customer_images').insert({
      id: imageId,
      business_id: businessId,
      customer_id: customerId,
      category,
      entity_id: entityId,
      original_filename: sanitizedName,
      original_path: paths.original,
      compressed_path: paths.compressed,
      thumbnail_path: paths.thumbnail,
      preview_path: paths.preview,
      original_url: urls.original,
      compressed_url: urls.compressed,
      thumbnail_url: urls.thumbnail,
      preview_url: urls.preview,
      width: processed.compressed.width,
      height: processed.compressed.height,
      original_size: processed.metadata.originalSize,
      compressed_size: processed.metadata.compressedSize,
      compression_ratio: processed.metadata.compressionRatio,
      format: processed.compressed.format,
      processing_time_ms: processed.metadata.processingTimeMs,
    });

    if (dbError) {
      syncLogger.error({
        msg: 'Failed to store image metadata',
        error: dbError.message,
        imageId,
      });
      // Don't fail the upload, just log the error
    }

    syncLogger.info({
      msg: 'Image processed and uploaded',
      imageId,
      originalSize: processed.metadata.originalSize,
      compressedSize: processed.metadata.compressedSize,
      compressionRatio: processed.metadata.compressionRatio.toFixed(2),
      processingTimeMs: processed.metadata.processingTimeMs,
    });

    return {
      success: true,
      data: {
        id: imageId,
        originalUrl: urls.original,
        compressedUrl: urls.compressed,
        thumbnailUrl: urls.thumbnail,
        previewUrl: urls.preview,
        width: processed.compressed.width,
        height: processed.compressed.height,
        originalSize: processed.metadata.originalSize,
        compressedSize: processed.metadata.compressedSize,
        format: processed.compressed.format,
      },
    };
  } catch (error) {
    syncLogger.error({
      msg: 'Image upload failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId,
      customerId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image upload failed',
    };
  }
}

/**
 * Delete an image and all its variants
 */
export async function deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Get image metadata
  const { data: image, error: fetchError } = await supabase
    .from('customer_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, error: 'Image not found' };
  }

  try {
    // Delete all versions from storage
    await Promise.all([
      supabase.storage.from('customer-images-original').remove([image.original_path]),
      supabase.storage.from('customer-images').remove([image.compressed_path]),
      supabase.storage.from('customer-thumbnails').remove([image.thumbnail_path]),
      supabase.storage.from('customer-previews').remove([image.preview_path]),
    ]);

    // Delete metadata from database
    await supabase.from('customer_images').delete().eq('id', imageId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get image by ID with optional resolution
 */
export async function getImage(
  imageId: string,
  resolution: 'thumbnail' | 'preview' | 'compressed' | 'original' = 'compressed'
): Promise<{ url: string; width: number; height: number } | null> {
  const supabase = createAdminClient();

  const { data: image } = await supabase
    .from('customer_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (!image) return null;

  const urlMap: Record<string, string> = {
    thumbnail: image.thumbnail_url,
    preview: image.preview_url,
    compressed: image.compressed_url,
    original: image.original_url,
  };

  return {
    url: urlMap[resolution] || image.compressed_url,
    width: image.width,
    height: image.height,
  };
}

/**
 * Get all images for a customer
 */
export async function getCustomerImages(
  customerId: string,
  businessId: string,
  options: {
    category?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  images: Array<{
    id: string;
    thumbnailUrl: string;
    previewUrl: string;
    compressedUrl: string;
    width: number;
    height: number;
    uploadedAt: string;
    category: string;
  }>;
  total: number;
}> {
  const supabase = createAdminClient();
  const { category, entityId, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('customer_images')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error || !data) {
    return { images: [], total: 0 };
  }

  return {
    images: data.map((img) => ({
      id: img.id,
      thumbnailUrl: img.thumbnail_url,
      previewUrl: img.preview_url,
      compressedUrl: img.compressed_url,
      width: img.width,
      height: img.height,
      uploadedAt: img.created_at,
      category: img.category,
    })),
    total: count || 0,
  };
}

/**
 * Serve decompressed/full-resolution image
 * This creates a signed URL for secure access to the original
 */
export async function getFullResolutionUrl(
  imageId: string,
  customerId: string,
  businessId: string,
  expiresInSeconds: number = 3600
): Promise<{ url: string; expiresAt: string } | null> {
  const supabase = createAdminClient();

  // Verify ownership
  const { data: image } = await supabase
    .from('customer_images')
    .select('original_path')
    .eq('id', imageId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!image) return null;

  // Create signed URL for secure access
  const { data, error } = await supabase.storage
    .from('customer-images-original')
    .createSignedUrl(image.original_path, expiresInSeconds);

  if (error || !data) return null;

  return {
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}
