// =====================================================
// RECEIPT OCR API
// POST /api/receipts/ocr - Extract data from receipt image
// POST /api/receipts/ocr/process - Extract and create receipt
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { extractReceiptData, processReceiptToExpense, isOCRConfigured } from '@/lib/ocr';
import { isFeatureEnabled } from '@/lib/features';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if receipts feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'receipts_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Receipts feature is not enabled' },
        { status: 403 }
      );
    }

    if (!isOCRConfigured()) {
      return NextResponse.json(
        { error: 'OCR is not configured. Set OPENAI_API_KEY.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageUrl, imageBase64, extractItems, suggestCategory, createReceipt, jobId, notes } = body;

    // Determine image source
    const imageSource = imageUrl || imageBase64;
    if (!imageSource) {
      return NextResponse.json(
        { error: 'Image URL or base64 data is required' },
        { status: 400 }
      );
    }

    // If createReceipt flag is set, process and create receipt in one step
    if (createReceipt) {
      const result = await processReceiptToExpense(
        imageSource,
        profile.business_id,
        profile.id,
        { jobId, notes }
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        extracted: result.extractedData,
        expense: result.expense,
      });
    }

    // Otherwise, just extract data without creating a receipt
    const result = await extractReceiptData(imageSource, {
      extractItems: extractItems !== false,
      suggestCategory: suggestCategory !== false,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'OCR API' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    );
  }
}
