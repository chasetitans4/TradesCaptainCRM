// =====================================================
// PORTAL ANALYTICS API
// GET /api/portal/analytics - Get customer's AI interaction stats
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const days = parseInt(searchParams.get('days') || '30');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get customer's phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('phone')
      .eq('id', session.customerId)
      .single();

    if (!customer?.phone) {
      return NextResponse.json({
        hasData: false,
        message: 'No phone number on file',
      });
    }

    // Get conversation for this customer
    const { data: conversation } = await supabase
      .from('sms_conversations')
      .select('id, created_at, status')
      .eq('business_id', session.businessId)
      .eq('phone', customer.phone)
      .single();

    if (!conversation) {
      return NextResponse.json({
        hasData: false,
        message: 'No conversation history',
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get message stats
    const { data: messages } = await supabase
      .from('sms_messages')
      .select('id, direction, sender, is_ai_response, ai_confidence, detected_intent, created_at')
      .eq('conversation_id', conversation.id)
      .gte('created_at', startDate.toISOString());

    const totalMessages = messages?.length || 0;
    const inboundMessages = messages?.filter(m => m.direction === 'inbound').length || 0;
    const outboundMessages = messages?.filter(m => m.direction === 'outbound').length || 0;
    const aiResponses = messages?.filter(m => m.is_ai_response || m.sender === 'ai').length || 0;
    const humanResponses = outboundMessages - aiResponses;

    // Calculate AI response rate
    const aiResponseRate = outboundMessages > 0
      ? Math.round((aiResponses / outboundMessages) * 100)
      : 0;

    // Calculate average AI confidence
    const aiMessages = messages?.filter(m => m.ai_confidence !== null && m.ai_confidence !== undefined) || [];
    const avgConfidence = aiMessages.length > 0
      ? Math.round(aiMessages.reduce((sum, m) => sum + (m.ai_confidence || 0), 0) / aiMessages.length)
      : null;

    // Get intent distribution
    const intentCounts: Record<string, number> = {};
    for (const msg of messages || []) {
      if (msg.detected_intent) {
        intentCounts[msg.detected_intent] = (intentCounts[msg.detected_intent] || 0) + 1;
      }
    }

    const intents = Object.entries(intentCounts)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: Math.round((count / inboundMessages) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average response time (simplified - time between inbound and next outbound)
    let totalResponseTime = 0;
    let responseCount = 0;
    const sortedMessages = [...(messages || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (let i = 0; i < sortedMessages.length - 1; i++) {
      const current = sortedMessages[i];
      const next = sortedMessages[i + 1];
      if (current.direction === 'inbound' && next.direction === 'outbound') {
        const responseTime = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
        // Only count reasonable response times (< 24 hours)
        if (responseTime < 24 * 60 * 60 * 1000) {
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    const avgResponseTimeMinutes = responseCount > 0
      ? Math.round(totalResponseTime / responseCount / 60000)
      : null;

    return NextResponse.json({
      hasData: true,
      period: {
        days,
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
      messages: {
        total: totalMessages,
        sent: inboundMessages,
        received: outboundMessages,
      },
      ai: {
        responses: aiResponses,
        humanResponses,
        responseRate: aiResponseRate,
        avgConfidence,
        avgResponseTimeMinutes,
      },
      intents,
      conversationStarted: conversation.created_at,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal analytics GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
