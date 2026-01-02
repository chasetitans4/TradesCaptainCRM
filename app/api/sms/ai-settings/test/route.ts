// =====================================================
// AI SMS TEST ENDPOINT
// POST /api/sms/ai-settings/test
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { checkAIRateLimit } from '@/lib/rate-limit';

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can test AI
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can test AI settings' },
        { status: 403 }
      );
    }

    // Rate limit AI test calls (50 per minute per business)
    const rateLimit = await checkAIRateLimit(profile.business_id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'AI rate limit exceeded. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 60).toString(),
          },
        }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { message, tone, knowledge_base } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build system prompt based on tone and knowledge base
    const toneInstructions = {
      professional: 'Respond in a formal, business-like manner. Use proper grammar and maintain a courteous, respectful tone.',
      friendly: 'Respond in a warm, approachable manner while remaining professional. Use casual but appropriate language.',
      casual: 'Respond in a relaxed, conversational manner. Use contractions and informal expressions where appropriate.',
    };

    const systemPrompt = `You are an AI assistant for a service business. Your role is to help customers via SMS.

TONE: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}

${knowledge_base ? `BUSINESS INFORMATION:\n${knowledge_base}\n` : ''}

GUIDELINES:
- Keep responses concise (SMS has character limits)
- Be helpful and aim to answer questions or schedule appointments
- If you can't help with something, offer to have a human follow up
- Never make up information not provided in the business information
- Be conversational but stay on topic

Respond to the customer message naturally.`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error testing AI:', error);
    return NextResponse.json(
      { error: 'Failed to test AI response' },
      { status: 500 }
    );
  }
}
