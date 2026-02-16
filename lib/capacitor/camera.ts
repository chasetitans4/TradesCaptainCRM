/**
 * Native Camera Wrapper
 *
 * Provides a unified interface for camera access across native and web platforms.
 * On native platforms, uses Capacitor Camera plugin.
 * On web, falls back to standard file input.
 */

import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { isNative, isPluginAvailable } from './platform';

export interface CapturedPhoto {
  /** Base64 encoded image data */
  base64?: string;
  /** Data URL for direct display */
  dataUrl?: string;
  /** Web path for Capacitor filesystem access */
  webPath?: string;
  /** Original format of the image */
  format: 'jpeg' | 'png' | 'gif' | 'webp';
  /** Whether the image was captured successfully */
  success: boolean;
  /** Error message if capture failed */
  error?: string;
}

export interface CameraOptions {
  /** Image quality (0-100) */
  quality?: number;
  /** Allow editing after capture */
  allowEditing?: boolean;
  /** Image width (for resizing) */
  width?: number;
  /** Image height (for resizing) */
  height?: number;
  /** Camera source */
  source?: 'camera' | 'photos' | 'prompt';
  /** Result type */
  resultType?: 'base64' | 'dataUrl' | 'uri';
}

const defaultOptions: CameraOptions = {
  quality: 80,
  allowEditing: false,
  width: 1920,
  height: 1080,
  source: 'camera',
  resultType: 'base64',
};

/**
 * Check if native camera is available
 */
export function isCameraAvailable(): boolean {
  return isNative() && isPluginAvailable('Camera');
}

/**
 * Request camera permissions
 * @returns Whether permission was granted
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (!isCameraAvailable()) {
    // On web, permission is requested at capture time
    return true;
  }

  try {
    const permission = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });
    return permission.camera === 'granted' || permission.camera === 'limited';
  } catch (error) {
    console.error('[Camera] Permission request failed:', error);
    return false;
  }
}

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isCameraAvailable()) {
    return 'prompt';
  }

  try {
      const permission = await Camera.checkPermissions();
      if (permission.camera === 'prompt-with-rationale') {
        return 'prompt';
      }
      if (permission.camera === 'limited') {
        return 'granted';
      }
      return permission.camera;
    } catch (error) {
    console.error('[Camera] Permission check failed:', error);
    return 'prompt';
  }
}

/**
 * Capture a photo using native camera or web fallback
 */
export async function capturePhoto(options: CameraOptions = {}): Promise<CapturedPhoto> {
  const mergedOptions = { ...defaultOptions, ...options };

  // Native camera capture
  if (isCameraAvailable()) {
    return captureNativePhoto(mergedOptions);
  }

  // Web fallback - this returns a promise that resolves when file is selected
  return captureWebPhoto(mergedOptions);
}

/**
 * Native camera capture using Capacitor
 */
async function captureNativePhoto(options: CameraOptions): Promise<CapturedPhoto> {
  try {
    const sourceMap: Record<string, CameraSource> = {
      camera: CameraSource.Camera,
      photos: CameraSource.Photos,
      prompt: CameraSource.Prompt,
    };

    const resultTypeMap: Record<string, CameraResultType> = {
      base64: CameraResultType.Base64,
      dataUrl: CameraResultType.DataUrl,
      uri: CameraResultType.Uri,
    };

    const photo: Photo = await Camera.getPhoto({
      quality: options.quality,
      allowEditing: options.allowEditing,
      resultType: resultTypeMap[options.resultType || 'base64'],
      source: sourceMap[options.source || 'camera'],
      width: options.width,
      height: options.height,
      saveToGallery: false,
      correctOrientation: true,
    });

    return {
      base64: photo.base64String,
      dataUrl: photo.dataUrl,
      webPath: photo.webPath,
      format: photo.format as 'jpeg' | 'png' | 'gif' | 'webp',
      success: true,
    };
  } catch (error) {
    console.error('[Camera] Native capture failed:', error);
    return {
      format: 'jpeg',
      success: false,
      error: error instanceof Error ? error.message : 'Camera capture failed',
    };
  }
}

/**
 * Web fallback using file input
 */
async function captureWebPhoto(options: CameraOptions): Promise<CapturedPhoto> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // Only use camera capture on mobile web
    if (options.source === 'camera') {
      input.capture = 'environment';
    }

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        resolve({
          format: 'jpeg',
          success: false,
          error: 'No file selected',
        });
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        const format = getImageFormat(file.type);

        resolve({
          base64,
          dataUrl: `data:${file.type};base64,${base64}`,
          format,
          success: true,
        });
      } catch (error) {
        resolve({
          format: 'jpeg',
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process image',
        });
      }
    };

    input.oncancel = () => {
      resolve({
        format: 'jpeg',
        success: false,
        error: 'User cancelled',
      });
    };

    input.click();
  });
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get image format from MIME type
 */
function getImageFormat(mimeType: string): 'jpeg' | 'png' | 'gif' | 'webp' {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpeg';
}

/**
 * Pick multiple photos from gallery
 */
export async function pickPhotos(limit: number = 10): Promise<CapturedPhoto[]> {
  if (!isCameraAvailable()) {
    // Web fallback - single select
    const photo = await captureWebPhoto({ source: 'photos' });
    return photo.success ? [photo] : [];
  }

  try {
    const result = await Camera.pickImages({
      quality: 80,
      limit,
    });

    return result.photos.map((photo) => ({
      base64: undefined, // pickImages doesn't return base64
      webPath: photo.webPath,
      format: photo.format as 'jpeg' | 'png' | 'gif' | 'webp',
      success: true,
    }));
  } catch (error) {
    console.error('[Camera] Pick photos failed:', error);
    return [];
  }
}
