// =====================================================
// Prompt 8: Photo Analyzer
// Analyzes customer-submitted photos of equipment/issues
// Uses Claude's vision capabilities
// =====================================================

import Anthropic from '@anthropic-ai/sdk';
import { jobLogger } from '@/lib/logger';
import {
  PhotoAnalyzerInput,
  PhotoAnalyzerOutput,
  DetectedIssue,
  EquipmentIdentification,
  PhotoCategory,
  PhotoUrgency,
  PromptResult,
} from '@/types/leads-captain/prompt-types';
import { getAnthropic, parseJSONResponse, withTimeout } from './base-prompt';

// =====================================================
// SYSTEM PROMPT
// =====================================================

function buildPhotoAnalyzerSystemPrompt(businessType: string): string {
  return `You are an expert technician and inspector for ${businessType} services, analyzing photos sent by customers.

YOUR TASK:
Analyze the photo to identify equipment, issues, damage, or conditions relevant to service work.

ANALYSIS AREAS:
1. Equipment Identification - What equipment is shown? Brand, model, approximate age?
2. Issue Detection - What problems or damage are visible?
3. Safety Hazards - Any immediate safety concerns?
4. Service Needs - What type of service might be needed?
5. Urgency Assessment - How urgent is this situation?

EQUIPMENT CONDITIONS:
- excellent: Like new, well maintained
- good: Normal wear, functional
- fair: Shows age/wear but operational
- poor: Significant issues, may need replacement soon
- critical: Dangerous or non-functional

URGENCY LEVELS:
- critical: Immediate safety hazard (gas leak, electrical fire risk, flooding)
- high: Urgent repair needed within 24 hours
- medium: Should be addressed within a week
- low: Routine maintenance or minor issue
- none: Informational only, no action needed

PHOTO CATEGORIES:
- equipment: Shows installed equipment (HVAC, water heater, etc.)
- damage: Shows damage to equipment or property
- installation: Shows installation work or wiring/piping
- before_after: Comparison photos
- issue: Shows a specific problem
- general: General property or unclear

OUTPUT FORMAT (JSON):
{
  "category": "equipment|damage|installation|before_after|issue|general",
  "summary": "2-3 sentence description of what the photo shows",
  "detectedIssues": [
    {
      "description": "What the issue is",
      "severity": "critical|high|medium|low",
      "location": "Where in the image (e.g., 'top left', 'near the valve')",
      "confidence": 85
    }
  ],
  "equipment": {
    "type": "Type of equipment",
    "brand": "Brand if visible",
    "model": "Model if visible",
    "approximateAge": "Estimated age range",
    "condition": "excellent|good|fair|poor|critical",
    "confidence": 80
  },
  "urgency": "critical|high|medium|low|none",
  "safetyWarnings": ["Any safety concerns"],
  "recommendedActions": ["Suggested next steps"],
  "estimatedServiceType": "repair|replacement|maintenance|inspection|null",
  "additionalNotes": "Any other relevant observations",
  "confidence": 75
}

GUIDELINES:
- Be specific about locations in the image
- If equipment brand/model isn't visible, say "Not visible" rather than guessing
- Always prioritize safety - when in doubt, flag as higher urgency
- Include confidence scores for your assessments
- If the image is unclear or not service-related, say so

OUTPUT: JSON only, no additional text`;
}

// =====================================================
// MAIN EXECUTION
// =====================================================

export async function executePhotoAnalyzer(
  input: PhotoAnalyzerInput
): Promise<PromptResult<PhotoAnalyzerOutput>> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!input.imageUrl && !input.imageBase64) {
      return {
        success: false,
        data: null,
        error: 'Either imageUrl or imageBase64 is required',
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    const anthropic = getAnthropic();
    const systemPrompt = buildPhotoAnalyzerSystemPrompt(input.businessType);

    // Build user message with image
    const userContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

    // Add image content
    if (input.imageBase64) {
      // Determine media type from base64 prefix or default to jpeg
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      let base64Data = input.imageBase64;

      if (input.imageBase64.startsWith('data:')) {
        const match = input.imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mediaType = match[1] as typeof mediaType;
          base64Data = match[2];
        }
      }

      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
    } else if (input.imageUrl) {
      userContent.push({
        type: 'image',
        source: {
          type: 'url',
          url: input.imageUrl,
        },
      });
    }

    // Add text context
    let textPrompt = 'Analyze this photo and provide a detailed assessment.';
    if (input.contextMessage) {
      textPrompt += `\n\nCustomer's message: "${input.contextMessage}"`;
    }
    if (input.previousPhotos && input.previousPhotos.length > 0) {
      textPrompt += `\n\nNote: This may be a follow-up or comparison to previous photos showing: ${input.previousPhotos.map(p => p.analysis.summary).join('; ')}`;
    }

    userContent.push({
      type: 'text',
      text: textPrompt,
    });

    // Call Claude with vision
    const response = await withTimeout(
      anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      }),
      30000 // 30 second timeout for image analysis
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const parsed = parseJSONResponse<PhotoAnalyzerOutput>(content.text);

    if (!parsed) {
      // Return fallback analysis
      const fallback = generateFallbackAnalysis(input);
      return {
        success: true,
        data: fallback,
        error: 'Could not parse AI response, using fallback',
        tokensUsed,
        latencyMs: Date.now() - startTime,
      };
    }

    // Validate and normalize the response
    const normalizedOutput = normalizeOutput(parsed);

    jobLogger.info({
      msg: 'Photo analysis completed',
      category: normalizedOutput.category,
      urgency: normalizedOutput.urgency,
      issueCount: normalizedOutput.detectedIssues.length,
      confidence: normalizedOutput.confidence,
    });

    return {
      success: true,
      data: normalizedOutput,
      tokensUsed,
      latencyMs: Date.now() - startTime,
    };

  } catch (error) {
    jobLogger.error({
      msg: 'Photo analyzer failed',
      error: error instanceof Error ? error.message : String(error),
    });

    // Return fallback on error
    const fallback = generateFallbackAnalysis(input);
    return {
      success: true,
      data: fallback,
      error: error instanceof Error ? error.message : 'Unknown error',
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }
}

// =====================================================
// NORMALIZE OUTPUT
// =====================================================

function normalizeOutput(parsed: Partial<PhotoAnalyzerOutput>): PhotoAnalyzerOutput {
  const validCategories: PhotoCategory[] = ['equipment', 'damage', 'installation', 'before_after', 'issue', 'general'];
  const validUrgencies: PhotoUrgency[] = ['critical', 'high', 'medium', 'low', 'none'];

  return {
    category: validCategories.includes(parsed.category as PhotoCategory)
      ? parsed.category as PhotoCategory
      : 'general',
    summary: parsed.summary || 'Unable to analyze photo',
    detectedIssues: Array.isArray(parsed.detectedIssues)
      ? parsed.detectedIssues.map(normalizeIssue)
      : [],
    equipment: parsed.equipment ? normalizeEquipment(parsed.equipment) : null,
    urgency: validUrgencies.includes(parsed.urgency as PhotoUrgency)
      ? parsed.urgency as PhotoUrgency
      : 'low',
    safetyWarnings: Array.isArray(parsed.safetyWarnings) ? parsed.safetyWarnings : [],
    recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
    estimatedServiceType: parsed.estimatedServiceType || null,
    additionalNotes: parsed.additionalNotes || '',
    confidence: typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 50,
  };
}

function normalizeIssue(issue: Partial<DetectedIssue>): DetectedIssue {
  const validSeverities = ['critical', 'high', 'medium', 'low'] as const;

  return {
    description: issue.description || 'Unknown issue',
    severity: validSeverities.includes(issue.severity as typeof validSeverities[number])
      ? issue.severity as typeof validSeverities[number]
      : 'medium',
    location: issue.location || 'Unknown location',
    confidence: typeof issue.confidence === 'number'
      ? Math.min(100, Math.max(0, issue.confidence))
      : 50,
  };
}

function normalizeEquipment(equipment: Partial<EquipmentIdentification>): EquipmentIdentification {
  const validConditions = ['excellent', 'good', 'fair', 'poor', 'critical'] as const;

  return {
    type: equipment.type || 'Unknown equipment',
    brand: equipment.brand,
    model: equipment.model,
    approximateAge: equipment.approximateAge,
    condition: validConditions.includes(equipment.condition as typeof validConditions[number])
      ? equipment.condition as typeof validConditions[number]
      : 'fair',
    confidence: typeof equipment.confidence === 'number'
      ? Math.min(100, Math.max(0, equipment.confidence))
      : 50,
  };
}

// =====================================================
// FALLBACK ANALYSIS
// =====================================================

function generateFallbackAnalysis(input: PhotoAnalyzerInput): PhotoAnalyzerOutput {
  return {
    category: 'general',
    summary: 'Photo received but detailed analysis is currently unavailable. A technician will review this image.',
    detectedIssues: [],
    equipment: null,
    urgency: 'medium',
    safetyWarnings: [],
    recommendedActions: [
      'A technician will review this photo',
      'Please describe any issues you see in the photo',
    ],
    estimatedServiceType: null,
    additionalNotes: input.contextMessage
      ? `Customer provided context: "${input.contextMessage}"`
      : 'No additional context provided',
    confidence: 0,
  };
}

// =====================================================
// QUICK ANALYSIS (Non-Vision Fallback)
// =====================================================

/**
 * Quick analysis based only on context message when vision is unavailable
 */
export function quickPhotoAnalysisFromContext(
  contextMessage: string,
  businessType: string
): Partial<PhotoAnalyzerOutput> {
  const lowerMessage = contextMessage.toLowerCase();

  // Detect urgency from message
  let urgency: PhotoUrgency = 'low';
  if (/leak|flood|water everywhere|emergency|smoke|fire|gas smell/i.test(lowerMessage)) {
    urgency = 'critical';
  } else if (/broken|not working|won't start|no heat|no ac|no hot water/i.test(lowerMessage)) {
    urgency = 'high';
  } else if (/issue|problem|weird|noise|strange/i.test(lowerMessage)) {
    urgency = 'medium';
  }

  // Detect category from message
  let category: PhotoCategory = 'general';
  if (/damage|broken|crack|rust|corrosion/i.test(lowerMessage)) {
    category = 'damage';
  } else if (/install|wiring|pipe|duct/i.test(lowerMessage)) {
    category = 'installation';
  } else if (/before|after|compare|same/i.test(lowerMessage)) {
    category = 'before_after';
  } else if (/unit|system|equipment|heater|ac|furnace/i.test(lowerMessage)) {
    category = 'equipment';
  } else if (/issue|problem|wrong|help/i.test(lowerMessage)) {
    category = 'issue';
  }

  // Detect service type
  let serviceType: string | null = null;
  if (/replace|new|upgrade/i.test(lowerMessage)) {
    serviceType = 'replacement';
  } else if (/fix|repair|broken/i.test(lowerMessage)) {
    serviceType = 'repair';
  } else if (/maintain|tune-up|check|inspect/i.test(lowerMessage)) {
    serviceType = 'maintenance';
  }

  return {
    category,
    urgency,
    estimatedServiceType: serviceType,
    additionalNotes: `Based on customer message: "${contextMessage}"`,
    confidence: 30, // Low confidence without vision
  };
}

// =====================================================
// BATCH ANALYSIS
// =====================================================

/**
 * Analyze multiple photos (e.g., before/after or multiple angles)
 */
export async function analyzePhotoSet(
  photos: PhotoAnalyzerInput[],
  businessType: string
): Promise<{
  analyses: PromptResult<PhotoAnalyzerOutput>[];
  overallAssessment: string;
  combinedUrgency: PhotoUrgency;
}> {
  const analyses: PromptResult<PhotoAnalyzerOutput>[] = [];

  // Analyze each photo
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    // Pass previous analyses for context
    const input: PhotoAnalyzerInput = {
      ...photo,
      businessType,
      previousPhotos: analyses
        .filter(a => a.success && a.data)
        .map((a, idx) => ({
          id: `photo-${idx}`,
          imageUrl: photos[idx].imageUrl,
          analysis: a.data!,
          analyzedAt: new Date().toISOString(),
          modelUsed: 'claude-sonnet-4-20250514',
          tokensUsed: a.tokensUsed,
        })),
    };

    const result = await executePhotoAnalyzer(input);
    analyses.push(result);
  }

  // Determine combined urgency (highest wins)
  const urgencyOrder: PhotoUrgency[] = ['critical', 'high', 'medium', 'low', 'none'];
  let combinedUrgency: PhotoUrgency = 'none';
  for (const analysis of analyses) {
    if (analysis.data) {
      const currentIdx = urgencyOrder.indexOf(analysis.data.urgency);
      const combinedIdx = urgencyOrder.indexOf(combinedUrgency);
      if (currentIdx < combinedIdx) {
        combinedUrgency = analysis.data.urgency;
      }
    }
  }

  // Build overall assessment
  const summaries = analyses
    .filter(a => a.success && a.data)
    .map((a, i) => `Photo ${i + 1}: ${a.data!.summary}`)
    .join(' ');

  const overallAssessment = `Analyzed ${photos.length} photo(s). ${summaries}`;

  return {
    analyses,
    overallAssessment,
    combinedUrgency,
  };
}
