// =====================================================
// SCAN RECEIPT API
// POST /api/expenses/scan-receipt - OCR only, returns extracted data
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image_url, image_base64 } = body;

    if (!image_url && !image_base64) {
      return NextResponse.json(
        { error: 'Either image_url or image_base64 is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OCR service not configured' },
        { status: 503 }
      );
    }

    // Build the image content for OpenAI
    let imageContent: any;
    if (image_base64) {
      imageContent = {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${image_base64}`,
        },
      };
    } else {
      imageContent = {
        type: 'image_url',
        image_url: { url: image_url },
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract the following from this receipt image and return as JSON only (no markdown, no explanation):
{
  "vendor": "store name",
  "date": "YYYY-MM-DD",
  "subtotal": number or null,
  "tax": number or null,
  "total": number,
  "payment_method": "cash" or "card" or "check" or null,
  "card_last_four": "1234" or null,
  "line_items": [{"description": "item", "amount": number}] or [],
  "confidence": "high" or "medium" or "low"
}
If any field is unclear or not visible, use null. For total, make your best estimate.`,
              },
              imageContent,
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      apiLogger.error({ error: errorData, route: 'POST /api/expenses/scan-receipt', context: 'OpenAI API error' });
      return NextResponse.json(
        { error: 'OCR service error' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'Failed to extract receipt data' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const ocrResult = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      data: ocrResult,
    });
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/expenses/scan-receipt' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan receipt' },
      { status: 500 }
    );
  }
}
