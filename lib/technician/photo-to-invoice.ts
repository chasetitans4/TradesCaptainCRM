// =====================================================
// PHOTO-TO-INVOICE AI ORCHESTRATOR
// Analyzes receipt and parts photos to extract invoice line items
// =====================================================

import { extractReceiptData, type ExtractedReceiptData } from '@/lib/ocr';
import { executePhotoAnalyzer } from '@/lib/leads-captain/prompts/photo-analyzer';
import { logger } from '@/lib/logger';

const photoInvoiceLogger = logger.child({ context: 'photo-to-invoice' });

export type PhotoType = 'receipt' | 'parts' | 'damage';

export interface ExtractedLineItem {
  name: string;
  quantity: number;
  unit_price: number;
  confidence: number;
}

export interface PhotoAnalysisResult {
  success: boolean;
  items: ExtractedLineItem[];
  vendor?: string;
  receiptTotal?: number;
  taxAmount?: number;
  photoUrl?: string;
  photoType: PhotoType;
  confidence: number;
  error?: string;
}

/**
 * Analyze a photo and extract line items for invoice
 * Uses OpenAI for receipts (better at OCR) and Claude for parts identification
 */
export async function analyzePhotoForInvoice(
  imageSource: string, // URL or base64
  photoType: PhotoType,
  businessType: string = 'general'
): Promise<PhotoAnalysisResult> {
  const startTime = Date.now();

  try {
    if (photoType === 'receipt') {
      // Use OpenAI OCR for receipts - better at text extraction
      return await analyzeReceipt(imageSource);
    } else {
      // Use Claude vision for parts/damage - better at object identification
      return await analyzePartsPhoto(imageSource, photoType, businessType);
    }
  } catch (error) {
    photoInvoiceLogger.error({
      msg: 'Photo analysis failed',
      photoType,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      items: [],
      photoType,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Analyze a receipt image using OpenAI OCR
 */
async function analyzeReceipt(imageSource: string): Promise<PhotoAnalysisResult> {
  const result = await extractReceiptData(imageSource, {
    extractItems: true,
    suggestCategory: false,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      items: [],
      photoType: 'receipt',
      confidence: 0,
      error: result.error || 'Failed to extract receipt data',
    };
  }

  const extracted = result.data;

  // Convert OCR items to invoice line items
  const items: ExtractedLineItem[] = extracted.items.map((item) => ({
    name: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice ?? item.total / item.quantity,
    confidence: extracted.confidence / 100,
  }));

  // If no items extracted but we have a total, create a single line item
  if (items.length === 0 && extracted.total) {
    items.push({
      name: extracted.vendor ? `Purchase from ${extracted.vendor}` : 'Receipt items',
      quantity: 1,
      unit_price: extracted.total,
      confidence: extracted.confidence / 100 * 0.8, // Lower confidence for summary item
    });
  }

  photoInvoiceLogger.info({
    msg: 'Receipt analyzed',
    vendor: extracted.vendor,
    itemCount: items.length,
    total: extracted.total,
    confidence: extracted.confidence,
  });

  return {
    success: true,
    items,
    vendor: extracted.vendor || undefined,
    receiptTotal: extracted.total || undefined,
    taxAmount: extracted.tax || undefined,
    photoType: 'receipt',
    confidence: extracted.confidence / 100,
  };
}

/**
 * Analyze a parts/damage photo using Claude vision
 */
async function analyzePartsPhoto(
  imageSource: string,
  photoType: PhotoType,
  businessType: string
): Promise<PhotoAnalysisResult> {
  const isBase64 = imageSource.startsWith('data:');

  const result = await executePhotoAnalyzer({
    imageUrl: isBase64 ? '' : imageSource, // Empty string if using base64
    imageBase64: isBase64 ? imageSource : undefined,
    businessType,
    contextMessage: photoType === 'parts'
      ? 'Identify all parts/materials in this photo and estimate their retail prices for invoicing'
      : 'Identify damage and estimate repair costs',
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      items: [],
      photoType,
      confidence: 0,
      error: result.error || 'Failed to analyze photo',
    };
  }

  const analysis = result.data;
  const items: ExtractedLineItem[] = [];

  // Extract equipment as line items if identified
  if (analysis.equipment && analysis.equipment.type !== 'Unknown equipment') {
    // Estimate price based on equipment type and condition
    const estimatedPrice = estimatePartPrice(
      analysis.equipment.type,
      analysis.equipment.condition || 'fair'
    );

    items.push({
      name: formatPartName(analysis.equipment),
      quantity: 1,
      unit_price: estimatedPrice,
      confidence: (analysis.equipment.confidence || 50) / 100,
    });
  }

  // Add recommended actions as potential service line items
  if (analysis.estimatedServiceType) {
    const servicePrice = estimateServicePrice(analysis.estimatedServiceType);
    items.push({
      name: formatServiceName(analysis.estimatedServiceType),
      quantity: 1,
      unit_price: servicePrice,
      confidence: (analysis.confidence || 50) / 100 * 0.7, // Lower confidence for service estimates
    });
  }

  // If damage detected, add repair line items
  for (const issue of analysis.detectedIssues) {
    if (issue.severity === 'high' || issue.severity === 'critical') {
      const repairPrice = estimateRepairPrice(issue.severity);
      items.push({
        name: `Repair: ${issue.description.slice(0, 50)}`,
        quantity: 1,
        unit_price: repairPrice,
        confidence: (issue.confidence || 50) / 100,
      });
    }
  }

  photoInvoiceLogger.info({
    msg: 'Parts/damage photo analyzed',
    photoType,
    itemCount: items.length,
    equipment: analysis.equipment?.type,
    confidence: analysis.confidence,
  });

  return {
    success: true,
    items,
    photoType,
    confidence: (analysis.confidence || 50) / 100,
  };
}

/**
 * Format equipment info into a line item name
 */
function formatPartName(equipment: {
  type?: string;
  brand?: string;
  model?: string;
}): string {
  let name = equipment.type || 'Part';
  if (equipment.brand && equipment.brand !== 'Not visible') {
    name = `${equipment.brand} ${name}`;
  }
  if (equipment.model && equipment.model !== 'Not visible') {
    name += ` (${equipment.model})`;
  }
  return name;
}

/**
 * Format service type into a line item name
 */
function formatServiceName(serviceType: string): string {
  const serviceNames: Record<string, string> = {
    repair: 'Repair Service',
    replacement: 'Replacement Service',
    maintenance: 'Maintenance Service',
    inspection: 'Inspection Service',
  };
  return serviceNames[serviceType] || `${serviceType.charAt(0).toUpperCase()}${serviceType.slice(1)} Service`;
}

/**
 * Estimate part price based on type and condition
 * These are rough estimates - tech should adjust
 */
function estimatePartPrice(partType: string, condition: string): number {
  const lowerType = partType.toLowerCase();

  // Base prices for common parts
  const basePrices: Record<string, number> = {
    capacitor: 45,
    contactor: 35,
    thermostat: 150,
    blower: 350,
    compressor: 1200,
    coil: 600,
    filter: 25,
    valve: 85,
    motor: 280,
    pump: 200,
    'circuit board': 350,
    ignitor: 65,
    sensor: 55,
    switch: 40,
  };

  // Find matching part type
  let basePrice = 100; // Default
  for (const [key, price] of Object.entries(basePrices)) {
    if (lowerType.includes(key)) {
      basePrice = price;
      break;
    }
  }

  // Adjust for condition (new parts are full price)
  const conditionMultipliers: Record<string, number> = {
    excellent: 1.0,
    good: 1.0,
    fair: 0.9,
    poor: 0.8,
    critical: 0.7,
  };

  return Math.round(basePrice * (conditionMultipliers[condition] || 1.0));
}

/**
 * Estimate service price based on type
 */
function estimateServicePrice(serviceType: string): number {
  const servicePrices: Record<string, number> = {
    repair: 150,
    replacement: 200,
    maintenance: 125,
    inspection: 89,
  };
  return servicePrices[serviceType] || 150;
}

/**
 * Estimate repair price based on severity
 */
function estimateRepairPrice(severity: string): number {
  const severityPrices: Record<string, number> = {
    critical: 350,
    high: 250,
    medium: 150,
    low: 85,
  };
  return severityPrices[severity] || 150;
}

/**
 * Combine multiple photo analyses into a single set of line items
 * Deduplicates similar items and combines quantities
 */
export function combinePhotoAnalyses(
  analyses: PhotoAnalysisResult[]
): ExtractedLineItem[] {
  const itemMap = new Map<string, ExtractedLineItem>();

  for (const analysis of analyses) {
    if (!analysis.success) continue;

    for (const item of analysis.items) {
      const key = item.name.toLowerCase().trim();
      const existing = itemMap.get(key);

      if (existing) {
        // Combine quantities, keep higher confidence
        existing.quantity += item.quantity;
        existing.confidence = Math.max(existing.confidence, item.confidence);
      } else {
        itemMap.set(key, { ...item });
      }
    }
  }

  return Array.from(itemMap.values());
}
