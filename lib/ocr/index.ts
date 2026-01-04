// =====================================================
// RECEIPT OCR LIBRARY
// Extract structured data from receipt images using AI vision
// =====================================================

import 'openai/shims/node';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const ocrLogger = logger.child({ context: 'ocr' });

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OCR features');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export function isOCRConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface ExtractedReceiptData {
  vendor: string | null;
  vendorAddress: string | null;
  vendorPhone: string | null;
  date: string | null;
  time: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  paymentMethod: string | null;
  lastFourDigits: string | null;
  items: {
    description: string;
    quantity: number;
    unitPrice: number | null;
    total: number;
  }[];
  category: string | null;
  confidence: number;
  rawText: string | null;
}

export interface OCRResult {
  success: boolean;
  data?: ExtractedReceiptData;
  error?: string;
}

/**
 * Extract receipt data from an image URL or base64 data
 */
export async function extractReceiptData(
  imageSource: string,
  options?: {
    extractItems?: boolean;
    suggestCategory?: boolean;
  }
): Promise<OCRResult> {
  try {
    if (!isOCRConfigured()) {
      return { success: false, error: 'OCR not configured. Set OPENAI_API_KEY.' };
    }

    const extractItems = options?.extractItems !== false;
    const suggestCategory = options?.suggestCategory !== false;

    const systemPrompt = `You are a receipt OCR assistant. Extract structured data from receipt images accurately.
Return a JSON object with these fields:
- vendor: Store/company name
- vendorAddress: Full address if visible
- vendorPhone: Phone number if visible
- date: Date in YYYY-MM-DD format
- time: Time in HH:MM format (24hr) if visible
- subtotal: Amount before tax (number)
- tax: Tax amount (number)
- total: Total amount paid (number)
- paymentMethod: "cash", "credit", "debit", "check", or other
- lastFourDigits: Last 4 digits of card if visible
${extractItems ? '- items: Array of {description, quantity, unitPrice, total}' : ''}
${suggestCategory ? '- category: Best category from: "materials", "tools", "fuel", "office", "meals", "travel", "equipment", "parts", "other"' : ''}
- confidence: Your confidence level 0-100
- rawText: Any important text that doesn\'t fit above

For missing values use null. Numbers should be plain numbers without $ signs.
Only return valid JSON, no markdown formatting.`;

    // Determine image source type
    let imageContent: OpenAI.Chat.ChatCompletionContentPartImage;
    if (imageSource.startsWith('data:')) {
      // Base64 encoded image
      imageContent = {
        type: 'image_url',
        image_url: { url: imageSource, detail: 'high' },
      };
    } else if (imageSource.startsWith('http')) {
      // URL
      imageContent = {
        type: 'image_url',
        image_url: { url: imageSource, detail: 'high' },
      };
    } else {
      return { success: false, error: 'Invalid image source. Provide URL or base64 data.' };
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all receipt data from this image:' },
            imageContent,
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'No response from OCR service' };
    }

    // Parse JSON response
    let parsed: any;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return { success: false, error: 'Failed to parse OCR response' };
    }

    const data: ExtractedReceiptData = {
      vendor: parsed.vendor || null,
      vendorAddress: parsed.vendorAddress || null,
      vendorPhone: parsed.vendorPhone || null,
      date: parsed.date || null,
      time: parsed.time || null,
      subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
      tax: typeof parsed.tax === 'number' ? parsed.tax : null,
      total: typeof parsed.total === 'number' ? parsed.total : null,
      paymentMethod: parsed.paymentMethod || null,
      lastFourDigits: parsed.lastFourDigits || null,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            description: item.description || 'Unknown item',
            quantity: item.quantity || 1,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : null,
            total: typeof item.total === 'number' ? item.total : 0,
          }))
        : [],
      category: parsed.category || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      rawText: parsed.rawText || null,
    };

    return { success: true, data };
  } catch (error: any) {
    ocrLogger.error({
      msg: 'Receipt OCR error',
      imageSource,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message || 'OCR processing failed' };
  }
}

/**
 * Process receipt and create expense record
 */
export async function processReceiptToExpense(
  imageUrl: string,
  businessId: string,
  userId: string,
  additionalData?: {
    jobId?: string;
    notes?: string;
    category?: string;
  }
): Promise<{
  success: boolean;
  expense?: any;
  extractedData?: ExtractedReceiptData;
  error?: string;
}> {
  try {
    // Extract receipt data
    const ocrResult = await extractReceiptData(imageUrl);

    if (!ocrResult.success || !ocrResult.data) {
      return { success: false, error: ocrResult.error || 'Failed to extract receipt data' };
    }

    const extracted = ocrResult.data;
    const supabase = await createClient();

    // Create expense record
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        business_id: businessId,
        user_id: userId,
        job_id: additionalData?.jobId,
        vendor: extracted.vendor || 'Unknown Vendor',
        description: extracted.items.length > 0
          ? extracted.items.map(i => i.description).join(', ')
          : 'Receipt expense',
        amount: extracted.total || 0,
        tax_amount: extracted.tax,
        category: additionalData?.category || extracted.category || 'other',
        expense_date: extracted.date || new Date().toISOString().split('T')[0],
        payment_method: extracted.paymentMethod,
        receipt_url: imageUrl,
        receipt_data: {
          ocr_extracted: true,
          confidence: extracted.confidence,
          vendor_address: extracted.vendorAddress,
          vendor_phone: extracted.vendorPhone,
          items: extracted.items,
          subtotal: extracted.subtotal,
          last_four: extracted.lastFourDigits,
          raw_text: extracted.rawText,
        },
        notes: additionalData?.notes,
        status: extracted.confidence >= 80 ? 'pending' : 'needs_review',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      expense,
      extractedData: extracted,
    };
  } catch (error: any) {
    ocrLogger.error({
      msg: 'Error processing receipt to expense',
      imageUrl,
      businessId,
      userId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

/**
 * Batch process multiple receipts
 */
export async function batchProcessReceipts(
  images: { url: string; metadata?: any }[],
  businessId: string,
  userId: string
): Promise<{
  processed: number;
  failed: number;
  results: { url: string; success: boolean; expenseId?: string; error?: string }[];
}> {
  const results: { url: string; success: boolean; expenseId?: string; error?: string }[] = [];

  for (const image of images) {
    try {
      const result = await processReceiptToExpense(
        image.url,
        businessId,
        userId,
        image.metadata
      );

      results.push({
        url: image.url,
        success: result.success,
        expenseId: result.expense?.id,
        error: result.error,
      });
    } catch (error: any) {
      results.push({
        url: image.url,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    processed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

/**
 * Re-process an existing expense receipt to update extracted data
 */
export async function reprocessExpenseReceipt(
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get expense with receipt URL
    const { data: expense } = await supabase
      .from('expenses')
      .select('receipt_url, business_id')
      .eq('id', expenseId)
      .single();

    if (!expense?.receipt_url) {
      return { success: false, error: 'No receipt image found for this expense' };
    }

    // Re-extract data
    const ocrResult = await extractReceiptData(expense.receipt_url);

    if (!ocrResult.success || !ocrResult.data) {
      return { success: false, error: ocrResult.error || 'Failed to extract receipt data' };
    }

    const extracted = ocrResult.data;

    // Update expense with new data
    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        vendor: extracted.vendor || undefined,
        amount: extracted.total || undefined,
        tax_amount: extracted.tax,
        category: extracted.category || undefined,
        expense_date: extracted.date || undefined,
        payment_method: extracted.paymentMethod,
        receipt_data: {
          ocr_extracted: true,
          reprocessed_at: new Date().toISOString(),
          confidence: extracted.confidence,
          vendor_address: extracted.vendorAddress,
          vendor_phone: extracted.vendorPhone,
          items: extracted.items,
          subtotal: extracted.subtotal,
          last_four: extracted.lastFourDigits,
          raw_text: extracted.rawText,
        },
        status: extracted.confidence >= 80 ? 'pending' : 'needs_review',
      })
      .eq('id', expenseId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    ocrLogger.error({
      msg: 'Error reprocessing receipt',
      expenseId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}
