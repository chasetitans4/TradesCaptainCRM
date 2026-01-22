// =====================================================
// LOGO IMAGE RESIZE UTILITY
// Auto-resize business logos to optimal dimensions
// =====================================================

import sharp from 'sharp';

// Logo dimension requirements
export const LOGO_DIMENSIONS = {
  // Minimum dimensions - images below this are rejected
  MIN_WIDTH: 100,
  MIN_HEIGHT: 100,
  // Recommended dimensions - what we tell users to upload
  RECOMMENDED_WIDTH: 400,
  RECOMMENDED_HEIGHT: 400,
  // Maximum dimensions - images are resized down to this
  MAX_WIDTH: 800,
  MAX_HEIGHT: 800,
  // Output quality for JPEG/WebP (1-100)
  QUALITY: 90,
};

export interface LogoResizeResult {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasResized: boolean;
}

export interface LogoValidationError {
  type: 'too_small' | 'invalid_format' | 'processing_error';
  message: string;
  details?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
  };
}

/**
 * Validate and resize a logo image
 * - Rejects images below minimum dimensions
 * - Auto-resizes images above maximum dimensions
 * - Converts to WebP for optimal file size (except SVG)
 * - Maintains aspect ratio
 */
export async function resizeLogo(
  inputBuffer: Buffer,
  originalType: string
): Promise<LogoResizeResult | LogoValidationError> {
  try {
    // SVG files are passed through without processing
    if (originalType === 'image/svg+xml') {
      return {
        buffer: inputBuffer,
        contentType: 'image/svg+xml',
        width: 0, // SVG is vector, no pixel dimensions
        height: 0,
        originalWidth: 0,
        originalHeight: 0,
        wasResized: false,
      };
    }

    // Get image metadata
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        type: 'invalid_format',
        message: 'Could not read image dimensions',
      };
    }

    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Check minimum dimensions
    if (originalWidth < LOGO_DIMENSIONS.MIN_WIDTH || originalHeight < LOGO_DIMENSIONS.MIN_HEIGHT) {
      return {
        type: 'too_small',
        message: `Image is too small. Minimum size is ${LOGO_DIMENSIONS.MIN_WIDTH}x${LOGO_DIMENSIONS.MIN_HEIGHT} pixels.`,
        details: {
          width: originalWidth,
          height: originalHeight,
          minWidth: LOGO_DIMENSIONS.MIN_WIDTH,
          minHeight: LOGO_DIMENSIONS.MIN_HEIGHT,
        },
      };
    }

    // Determine if resize is needed
    const needsResize =
      originalWidth > LOGO_DIMENSIONS.MAX_WIDTH || originalHeight > LOGO_DIMENSIONS.MAX_HEIGHT;

    // Calculate new dimensions maintaining aspect ratio
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (needsResize) {
      const aspectRatio = originalWidth / originalHeight;

      if (originalWidth > originalHeight) {
        // Landscape or square - constrain by width
        targetWidth = Math.min(originalWidth, LOGO_DIMENSIONS.MAX_WIDTH);
        targetHeight = Math.round(targetWidth / aspectRatio);
      } else {
        // Portrait - constrain by height
        targetHeight = Math.min(originalHeight, LOGO_DIMENSIONS.MAX_HEIGHT);
        targetWidth = Math.round(targetHeight * aspectRatio);
      }

      // Ensure we don't exceed max dimensions
      if (targetWidth > LOGO_DIMENSIONS.MAX_WIDTH) {
        targetWidth = LOGO_DIMENSIONS.MAX_WIDTH;
        targetHeight = Math.round(targetWidth / aspectRatio);
      }
      if (targetHeight > LOGO_DIMENSIONS.MAX_HEIGHT) {
        targetHeight = LOGO_DIMENSIONS.MAX_HEIGHT;
        targetWidth = Math.round(targetHeight * aspectRatio);
      }
    }

    // Process image
    let processedImage = image;

    if (needsResize) {
      processedImage = processedImage.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for optimal file size (better compression than PNG/JPEG)
    const outputBuffer = await processedImage
      .webp({ quality: LOGO_DIMENSIONS.QUALITY })
      .toBuffer();

    return {
      buffer: outputBuffer,
      contentType: 'image/webp',
      width: targetWidth,
      height: targetHeight,
      originalWidth,
      originalHeight,
      wasResized: needsResize,
    };
  } catch (error) {
    return {
      type: 'processing_error',
      message: error instanceof Error ? error.message : 'Failed to process image',
    };
  }
}

/**
 * Check if result is an error
 */
export function isLogoError(
  result: LogoResizeResult | LogoValidationError
): result is LogoValidationError {
  return 'type' in result && 'message' in result;
}

/**
 * Get human-readable resolution requirements text
 */
export function getResolutionRequirementsText(): {
  minimum: string;
  recommended: string;
  maximum: string;
} {
  return {
    minimum: `${LOGO_DIMENSIONS.MIN_WIDTH}x${LOGO_DIMENSIONS.MIN_HEIGHT}px`,
    recommended: `${LOGO_DIMENSIONS.RECOMMENDED_WIDTH}x${LOGO_DIMENSIONS.RECOMMENDED_HEIGHT}px`,
    maximum: `${LOGO_DIMENSIONS.MAX_WIDTH}x${LOGO_DIMENSIONS.MAX_HEIGHT}px`,
  };
}
