// =====================================================
// IMAGE OPTIMIZATION
// Sharp-based image processing for compression and thumbnails
// =====================================================

import sharp from 'sharp';

interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Process and optimize an image
 * Reduces file size by ~70% on average
 */
export async function processImage(
  buffer: Buffer,
  options: ProcessImageOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = 'webp',
  } = options;

  let processor = sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate(); // Auto-rotate based on EXIF data

  switch (format) {
    case 'webp':
      processor = processor.webp({ quality });
      break;
    case 'jpeg':
      processor = processor.jpeg({ quality, progressive: true });
      break;
    case 'png':
      processor = processor.png({ quality, compressionLevel: 9 });
      break;
  }

  return processor.toBuffer();
}

/**
 * Create a thumbnail from an image
 */
export async function createThumbnail(
  buffer: Buffer,
  size: number = 200
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 70 })
    .toBuffer();
}

/**
 * Create multiple sizes for responsive images
 */
export async function createResponsiveSizes(
  buffer: Buffer
): Promise<{
  small: Buffer;  // 480px
  medium: Buffer; // 960px
  large: Buffer;  // 1920px
  thumbnail: Buffer; // 200px square
}> {
  const [small, medium, large, thumbnail] = await Promise.all([
    sharp(buffer)
      .resize(480, null, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer(),
    sharp(buffer)
      .resize(960, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    sharp(buffer)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
    createThumbnail(buffer, 200),
  ]);

  return { small, medium, large, thumbnail };
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}> {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    hasAlpha: metadata.hasAlpha || false,
  };
}

/**
 * Convert image to different format
 */
export async function convertImage(
  buffer: Buffer,
  format: 'webp' | 'jpeg' | 'png',
  quality: number = 80
): Promise<Buffer> {
  let processor = sharp(buffer);

  switch (format) {
    case 'webp':
      processor = processor.webp({ quality });
      break;
    case 'jpeg':
      processor = processor.jpeg({ quality, progressive: true });
      break;
    case 'png':
      processor = processor.png({ quality });
      break;
  }

  return processor.toBuffer();
}

/**
 * Crop image to specific dimensions
 */
export async function cropImage(
  buffer: Buffer,
  width: number,
  height: number,
  options: {
    left?: number;
    top?: number;
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  } = {}
): Promise<Buffer> {
  if (options.left !== undefined && options.top !== undefined) {
    return sharp(buffer)
      .extract({
        left: options.left,
        top: options.top,
        width,
        height,
      })
      .toBuffer();
  }

  return sharp(buffer)
    .resize(width, height, {
      fit: 'cover',
      position: options.position || 'center',
    })
    .toBuffer();
}

/**
 * Add watermark to image
 */
export async function addWatermark(
  imageBuffer: Buffer,
  watermarkBuffer: Buffer,
  options: {
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
    scale?: number;
  } = {}
): Promise<Buffer> {
  const {
    position = 'bottom-right',
    opacity = 0.5,
    scale = 0.15,
  } = options;

  const imageMetadata = await sharp(imageBuffer).metadata();
  const watermarkWidth = Math.round((imageMetadata.width || 800) * scale);

  // Resize watermark
  const resizedWatermark = await sharp(watermarkBuffer)
    .resize(watermarkWidth, null)
    .ensureAlpha(opacity)
    .modulate({ lightness: 1, saturation: 1 })
    .toBuffer();

  // Calculate position
  let gravity: string;
  switch (position) {
    case 'center':
      gravity = 'center';
      break;
    case 'top-left':
      gravity = 'northwest';
      break;
    case 'top-right':
      gravity = 'northeast';
      break;
    case 'bottom-left':
      gravity = 'southwest';
      break;
    case 'bottom-right':
    default:
      gravity = 'southeast';
  }

  return sharp(imageBuffer)
    .composite([
      {
        input: resizedWatermark,
        gravity: gravity as any,
        blend: 'over',
      },
    ])
    .toBuffer();
}

/**
 * Blur image (useful for backgrounds or placeholder)
 */
export async function blurImage(
  buffer: Buffer,
  sigma: number = 10
): Promise<Buffer> {
  return sharp(buffer)
    .blur(sigma)
    .toBuffer();
}

/**
 * Create a low-quality placeholder (LQIP)
 * Useful for progressive image loading
 */
export async function createPlaceholder(
  buffer: Buffer,
  width: number = 20
): Promise<string> {
  const placeholder = await sharp(buffer)
    .resize(width, null)
    .blur(2)
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${placeholder.toString('base64')}`;
}

/**
 * Optimize image for job photos (main use case)
 * Returns both optimized image and thumbnail
 */
export async function optimizeJobPhoto(buffer: Buffer): Promise<{
  optimized: Buffer;
  thumbnail: Buffer;
  placeholder: string;
  metadata: {
    originalSize: number;
    optimizedSize: number;
    thumbnailSize: number;
    compressionRatio: number;
  };
}> {
  const originalSize = buffer.length;

  const [optimized, thumbnail, placeholder] = await Promise.all([
    processImage(buffer, { maxWidth: 1920, quality: 80, format: 'webp' }),
    createThumbnail(buffer, 200),
    createPlaceholder(buffer, 20),
  ]);

  return {
    optimized,
    thumbnail,
    placeholder,
    metadata: {
      originalSize,
      optimizedSize: optimized.length,
      thumbnailSize: thumbnail.length,
      compressionRatio: Math.round((1 - optimized.length / originalSize) * 100),
    },
  };
}

/**
 * Validate image file
 */
export async function validateImage(
  buffer: Buffer,
  options: {
    maxSize?: number; // in bytes
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    allowedFormats?: string[];
  } = {}
): Promise<{ valid: boolean; error?: string }> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    minWidth = 100,
    minHeight = 100,
    maxWidth = 8000,
    maxHeight = 8000,
    allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'],
  } = options;

  // Check size
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  try {
    const metadata = await sharp(buffer).metadata();

    // Check format
    if (!allowedFormats.includes(metadata.format || '')) {
      return {
        valid: false,
        error: `Invalid format. Allowed: ${allowedFormats.join(', ')}`,
      };
    }

    // Check dimensions
    if ((metadata.width || 0) < minWidth || (metadata.height || 0) < minHeight) {
      return {
        valid: false,
        error: `Image must be at least ${minWidth}x${minHeight} pixels`,
      };
    }

    if ((metadata.width || 0) > maxWidth || (metadata.height || 0) > maxHeight) {
      return {
        valid: false,
        error: `Image cannot exceed ${maxWidth}x${maxHeight} pixels`,
      };
    }

    return { valid: true };
  } catch (_error) {
    return {
      valid: false,
      error: 'Invalid or corrupted image file',
    };
  }
}
