/**
 * Photo Compression Utilities
 *
 * Per Design Constitution Section 3.10.4 - Upload Handling:
 * - Resize to max 2048px on longest edge
 * - JPEG quality 80%
 * - Target: <500KB per photo
 */

export interface CompressionOptions {
  /** Maximum dimension (longest edge). Default: 2048 */
  maxDimension?: number;
  /** JPEG quality (0-1). Default: 0.8 */
  quality?: number;
  /** Target file size in bytes. Default: 500KB */
  targetSize?: number;
  /** Output format. Default: 'image/jpeg' */
  format?: 'image/jpeg' | 'image/webp';
}

export interface CompressedPhoto {
  /** Compressed image as Blob */
  blob: Blob;
  /** Data URL for preview */
  dataUrl: string;
  /** Original dimensions */
  originalWidth: number;
  originalHeight: number;
  /** Compressed dimensions */
  width: number;
  height: number;
  /** File size in bytes */
  size: number;
  /** Compression ratio (0-1, lower = more compression) */
  compressionRatio: number;
}

/**
 * Compress an image file for upload
 *
 * Constitution specs:
 * - Max 2048px on longest edge
 * - JPEG 80% quality
 * - Target <500KB
 *
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed photo data
 */
export async function compressPhoto(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressedPhoto> {
  const {
    maxDimension = 2048,
    quality = 0.8,
    targetSize = 500 * 1024, // 500KB
    format = 'image/jpeg',
  } = options;

  // Create image from file
  const img = await createImageFromFile(file);
  const { width: originalWidth, height: originalHeight } = img;

  // Calculate new dimensions maintaining aspect ratio
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob with specified quality
  let blob = await canvasToBlob(canvas, format, quality);

  // If still too large, progressively reduce quality
  let currentQuality = quality;
  while (blob.size > targetSize && currentQuality > 0.3) {
    currentQuality -= 0.1;
    blob = await canvasToBlob(canvas, format, currentQuality);
  }

  // Get data URL for preview
  const dataUrl = canvas.toDataURL(format, currentQuality);

  return {
    blob,
    dataUrl,
    originalWidth,
    originalHeight,
    width,
    height,
    size: blob.size,
    compressionRatio: blob.size / file.size,
  };
}

/**
 * Create an HTMLImageElement from a File or Blob
 */
function createImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert canvas to Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Get image dimensions without loading the full image
 */
export async function getImageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  const img = await createImageFromFile(file);
  return { width: img.width, height: img.height };
}

/**
 * Check if compression is needed based on file size and dimensions
 */
export async function needsCompression(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<boolean> {
  const { maxDimension = 2048, targetSize = 500 * 1024 } = options;

  // Check file size
  if (file.size > targetSize) {
    return true;
  }

  // Check dimensions
  try {
    const { width, height } = await getImageDimensions(file);
    return width > maxDimension || height > maxDimension;
  } catch {
    // If we can't read dimensions, assume compression is needed
    return true;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
