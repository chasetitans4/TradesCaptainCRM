// =====================================================
// QR CODE GENERATOR SERVICE
//
// Generates QR codes (PNG and SVG) for Proof of Work
// Uses 'qrcode' npm package with Error Correction Level H
// =====================================================

import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { QrCodeOptions } from '@/types/proof-of-work';
import { DEFAULT_QR_OPTIONS } from '@/types/proof-of-work';

/**
 * Get the public URL for a Proof of Work
 */
function getPublicUrl(publicToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tradescaptain.com';
  return `${baseUrl}/proof/${publicToken}`;
}

/**
 * Get the short URL for a Proof of Work
 */
function getShortUrl(shortCode: string): string {
  // Short URL domain for PoW links
  const shortDomain = process.env.POW_SHORT_DOMAIN || 'pow.tc';
  return `https://${shortDomain}/${shortCode}`;
}

/**
 * Generate QR code as PNG data URL
 */
export async function generateQrCodePng(
  url: string,
  options: QrCodeOptions = DEFAULT_QR_OPTIONS
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: options.width || 256,
      margin: options.margin || 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'H',
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    logger.error({
      msg: 'Failed to generate QR code PNG',
      url,
      error,
    });
    throw error;
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQrCodeSvg(
  url: string,
  options: QrCodeOptions = DEFAULT_QR_OPTIONS
): Promise<string> {
  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: options.width || 256,
      margin: options.margin || 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'H',
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
    });
    return svg;
  } catch (error) {
    logger.error({
      msg: 'Failed to generate QR code SVG',
      url,
      error,
    });
    throw error;
  }
}

/**
 * Upload QR code to storage and return public URL
 */
async function uploadQrCode(
  businessId: string,
  powId: string,
  dataUrl: string,
  format: 'png' | 'svg'
): Promise<string | null> {
  const supabase = createAdminClient();

  try {
    // Convert data URL to blob
    let blob: Blob;
    let contentType: string;

    if (format === 'png') {
      const base64Data = dataUrl.split(',')[1];
      const binaryData = Buffer.from(base64Data, 'base64');
      blob = new Blob([binaryData], { type: 'image/png' });
      contentType = 'image/png';
    } else {
      // SVG is plain text
      blob = new Blob([dataUrl], { type: 'image/svg+xml' });
      contentType = 'image/svg+xml';
    }

    const fileName = `qr-code.${format}`;
    const storagePath = `${businessId}/proof-of-work/${powId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(storagePath, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      logger.error({
        msg: 'Failed to upload QR code',
        powId,
        format,
        error: uploadError,
      });
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    logger.error({
      msg: 'Error uploading QR code',
      powId,
      format,
      error,
    });
    return null;
  }
}

/**
 * Generate and upload both PNG and SVG QR codes for a Proof of Work
 * Returns URLs for both formats
 */
export async function generateQrCodes(
  publicToken: string,
  shortCode: string,
  businessId?: string,
  powId?: string
): Promise<{ pngUrl: string | null; svgUrl: string | null } | null> {
  try {
    // Use the short URL for the QR code (cleaner, shorter)
    const url = getShortUrl(shortCode);

    // Generate QR codes
    const [pngDataUrl, svgString] = await Promise.all([
      generateQrCodePng(url),
      generateQrCodeSvg(url),
    ]);

    // If business ID and PoW ID provided, upload to storage
    if (businessId && powId) {
      const [pngUrl, svgUrl] = await Promise.all([
        uploadQrCode(businessId, powId, pngDataUrl, 'png'),
        uploadQrCode(businessId, powId, svgString, 'svg'),
      ]);

      return { pngUrl, svgUrl };
    }

    // Return data URLs if not uploading
    return {
      pngUrl: pngDataUrl,
      svgUrl: `data:image/svg+xml,${encodeURIComponent(svgString)}`,
    };
  } catch (error) {
    logger.error({
      msg: 'Failed to generate QR codes',
      publicToken,
      shortCode,
      error,
    });
    return null;
  }
}

/**
 * Generate QR code for display on mobile app (data URL only, no upload)
 */
export async function generateQrCodeForDisplay(
  publicToken: string,
  shortCode: string,
  format: 'png' | 'svg' = 'png'
): Promise<string | null> {
  try {
    const url = getShortUrl(shortCode);

    if (format === 'png') {
      return await generateQrCodePng(url);
    } else {
      const svg = await generateQrCodeSvg(url);
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to generate QR code for display',
      publicToken,
      shortCode,
      format,
      error,
    });
    return null;
  }
}

/**
 * Get QR code options with custom branding
 */
export function getQrCodeOptions(
  primaryColor?: string,
  backgroundColor?: string
): QrCodeOptions {
  return {
    ...DEFAULT_QR_OPTIONS,
    color: {
      dark: primaryColor || DEFAULT_QR_OPTIONS.color?.dark || '#000000',
      light: backgroundColor || DEFAULT_QR_OPTIONS.color?.light || '#FFFFFF',
    },
  };
}
