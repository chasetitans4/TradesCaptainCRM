/**
 * Barcode/QR Code Decoding Library
 *
 * Per Design Constitution Section 3.15.4:
 * - Barcode/QR scanning for equipment lookup
 * - Fast decode with visual feedback
 * - Support for common barcode formats
 */

/**
 * Supported barcode formats
 */
export type BarcodeFormat =
  | 'qr_code'
  | 'code_128'
  | 'code_39'
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'itf'
  | 'pdf417'
  | 'data_matrix';

/**
 * Decoded barcode result
 */
export interface DecodeResult {
  /** Raw decoded value */
  rawValue: string;
  /** Detected format */
  format: BarcodeFormat | 'unknown';
  /** Bounding box in image coordinates */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Confidence score (0-1) if available */
  confidence?: number;
  /** Timestamp of decode */
  timestamp: Date;
}

/**
 * Scanner options
 */
export interface ScannerOptions {
  /** Formats to look for (default: all) */
  formats?: BarcodeFormat[];
  /** Scan interval in ms (default: 100) */
  scanInterval?: number;
  /** Whether to use torch/flashlight */
  useTorch?: boolean;
}

/**
 * Check if BarcodeDetector API is available
 */
export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Get supported barcode formats from native API
 */
export async function getSupportedFormats(): Promise<BarcodeFormat[]> {
  if (!isBarcodeDetectorSupported()) {
    return [];
  }

  try {
    // @ts-expect-error - BarcodeDetector is not in TypeScript lib yet
    const formats = await BarcodeDetector.getSupportedFormats();
    return formats as BarcodeFormat[];
  } catch {
    return [];
  }
}

/**
 * Create a barcode detector instance
 */
export function createBarcodeDetector(formats?: BarcodeFormat[]): BarcodeDetectorInstance | null {
  if (!isBarcodeDetectorSupported()) {
    console.warn('BarcodeDetector API not supported');
    return null;
  }

  try {
    // @ts-expect-error - BarcodeDetector is not in TypeScript lib yet
    return new BarcodeDetector({ formats: formats || undefined });
  } catch (error) {
    console.error('Failed to create BarcodeDetector:', error);
    return null;
  }
}

/**
 * BarcodeDetector instance interface
 */
interface BarcodeDetectorInstance {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
}

/**
 * Decode barcodes from an image source
 */
export async function decodeFromImage(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  detector?: BarcodeDetectorInstance | null
): Promise<DecodeResult[]> {
  const barcodeDetector = detector || createBarcodeDetector();

  if (!barcodeDetector) {
    return [];
  }

  try {
    const barcodes = await barcodeDetector.detect(source);

    return barcodes.map((barcode): DecodeResult => ({
      rawValue: barcode.rawValue,
      format: barcode.format as BarcodeFormat || 'unknown',
      boundingBox: barcode.boundingBox ? {
        x: barcode.boundingBox.x,
        y: barcode.boundingBox.y,
        width: barcode.boundingBox.width,
        height: barcode.boundingBox.height,
      } : undefined,
      timestamp: new Date(),
    }));
  } catch (error) {
    console.error('Barcode detection failed:', error);
    return [];
  }
}

/**
 * Decode from video stream continuously
 */
export function createVideoScanner(
  video: HTMLVideoElement,
  onDetect: (results: DecodeResult[]) => void,
  options?: ScannerOptions
): { start: () => void; stop: () => void } {
  const detector = createBarcodeDetector(options?.formats);
  const interval = options?.scanInterval || 100;
  let animationId: number | null = null;
  let isRunning = false;

  async function scan() {
    if (!isRunning || !detector) return;

    try {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        const results = await decodeFromImage(video, detector);
        if (results.length > 0) {
          onDetect(results);
        }
      }
    } catch (error) {
      console.error('Video scan error:', error);
    }

    // Schedule next scan
    if (isRunning) {
      setTimeout(() => {
        animationId = requestAnimationFrame(scan);
      }, interval);
    }
  }

  return {
    start() {
      if (!detector) {
        console.warn('BarcodeDetector not available');
        return;
      }
      isRunning = true;
      animationId = requestAnimationFrame(scan);
    },
    stop() {
      isRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
  };
}

/**
 * Parse decoded value to identify content type
 */
export interface ParsedBarcodeContent {
  type: 'url' | 'equipment_id' | 'part_number' | 'serial' | 'text';
  value: string;
  metadata?: Record<string, string>;
}

export function parseBarcodeContent(rawValue: string): ParsedBarcodeContent {
  // Check for URL
  if (/^https?:\/\//i.test(rawValue)) {
    return { type: 'url', value: rawValue };
  }

  // Check for equipment ID pattern (e.g., EQ-12345, EQUIP-ABC123)
  const equipmentMatch = rawValue.match(/^(EQ|EQUIP|EQUIPMENT)[-_]?([A-Z0-9]+)$/i);
  if (equipmentMatch) {
    return {
      type: 'equipment_id',
      value: equipmentMatch[2],
      metadata: { prefix: equipmentMatch[1] }
    };
  }

  // Check for part number pattern (e.g., PN-12345, PART-ABC123)
  const partMatch = rawValue.match(/^(PN|PART|P)[-_]?([A-Z0-9-]+)$/i);
  if (partMatch) {
    return {
      type: 'part_number',
      value: partMatch[2],
      metadata: { prefix: partMatch[1] }
    };
  }

  // Check for serial number pattern (e.g., SN-12345, S/N: ABC123)
  const serialMatch = rawValue.match(/^(SN|S\/N|SERIAL)[:_-]?\s*([A-Z0-9-]+)$/i);
  if (serialMatch) {
    return {
      type: 'serial',
      value: serialMatch[2],
      metadata: { prefix: serialMatch[1] }
    };
  }

  // Default to plain text
  return { type: 'text', value: rawValue };
}

/**
 * Trigger haptic feedback for successful scan
 */
export function triggerScanHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([50, 30, 50]); // Quick double vibrate
  }
}
