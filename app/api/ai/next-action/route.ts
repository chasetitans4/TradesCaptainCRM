// =====================================================
// AI NEXT ACTION API
// GET /api/ai/next-action - Get LLM-powered contextual suggestion
// Per Section 7.1: Analyzes unreplied messages, missed calls,
// overdue invoices, pending estimates to suggest ONE action
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { apiLogger } from '@/lib/logger';

interface SuggestionContext {
  missedCalls: number;
  unrepliedMessages: number;
  overdueInvoices: number;
  pendingEstimates: number;
  hotLeads: number;
  oldestMissedCall?: {
    id: string;
    phone: string;
    customerName: string | null;
    missedAt: string;
  };
  oldestUnreplied?: {
    id: string;
    customerPhone: string;
    customerName: string | null;
    lastMessageAt: string;
    preview: string;
  };
  oldestOverdueInvoice?: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    dueDate: string;
    daysPastDue: number;
  };
  oldestPendingEstimate?: {
    id: string;
    customerName: string;
    amount: number;
    sentAt: string;
    daysSinceSent: number;
  };
  topHotLead?: {
    id: string;
    customerPhone: string;
    customerName: string | null;
    intent: string;
    lastActivity: string;
  };
}

interface AINextActionSuggestion {
  type: string;
  what: string;
  why: string;
  effect: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionLabel?: string;
  entityId?: string;
  entityType?: string;
  customerName?: string;
}

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export async function GET() {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = profile.business_id;
    const supabase = createAdminClient();

    // Gather context data in parallel
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      missedCallsResult,
      unrepliedResult,
      overdueResult,
      pendingEstimatesResult,
      hotLeadsResult,
    ] = await Promise.all([
      // Missed calls in last 24h
      supabase
        .from('call_logs')
        .select('id, phone, customer_name, created_at')
        .eq('business_id', businessId)
        .eq('outcome', 'no_answer')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: true })
        .limit(5),

      // Unreplied conversations (last message is inbound)
      supabase
        .from('leads_captain_conversations_v2')
        .select(`
          id,
          customer_phone,
          customer_name,
          updated_at,
          leads_captain_messages_v2 (
            id,
            direction,
            message_text,
            created_at
          )
        `)
        .eq('config_id', profile.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: true })
        .limit(10),

      // Overdue invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total_amount, customers(name)')
        .eq('business_id', businessId)
        .in('status', ['sent', 'pending'])
        .lt('due_date', todayStart.toISOString())
        .order('due_date', { ascending: true })
        .limit(5),

      // Pending estimates older than 3 days
      supabase
        .from('estimates')
        .select('id, created_at, total_amount, customers(name)')
        .eq('business_id', businessId)
        .eq('status', 'sent')
        .lt('created_at', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(5),

      // Hot leads
      supabase
        .from('leads_captain_conversations_v2')
        .select('id, customer_phone, customer_name, current_intent, updated_at')
        .eq('config_id', profile.id)
        .eq('is_hot_lead', true)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(5),
    ]);

    // Build context object
    const context: SuggestionContext = {
      missedCalls: missedCallsResult.data?.length || 0,
      unrepliedMessages: 0, // Will calculate below
      overdueInvoices: overdueResult.data?.length || 0,
      pendingEstimates: pendingEstimatesResult.data?.length || 0,
      hotLeads: hotLeadsResult.data?.length || 0,
    };

    // Find unreplied conversations (where last message is inbound)
    interface ConversationWithMessages {
      id: string;
      customer_phone: string;
      customer_name: string | null;
      updated_at: string;
      leads_captain_messages_v2: Array<{
        id: string;
        direction: string;
        message_text: string;
        created_at: string;
      }>;
    }

    const unrepliedConversations = (unrepliedResult.data || []).filter((conv: ConversationWithMessages) => {
      const messages = conv.leads_captain_messages_v2 || [];
      if (messages.length === 0) return false;
      const sortedMessages = [...messages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return sortedMessages[0]?.direction === 'inbound';
    });

    context.unrepliedMessages = unrepliedConversations.length;

    // Get oldest items for suggestions
    if (missedCallsResult.data?.[0]) {
      const call = missedCallsResult.data[0];
      context.oldestMissedCall = {
        id: call.id,
        phone: call.phone,
        customerName: call.customer_name,
        missedAt: call.created_at,
      };
    }

    if (unrepliedConversations[0]) {
      const conv = unrepliedConversations[0] as ConversationWithMessages;
      const lastMsg = conv.leads_captain_messages_v2?.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      context.oldestUnreplied = {
        id: conv.id,
        customerPhone: conv.customer_phone,
        customerName: conv.customer_name,
        lastMessageAt: conv.updated_at,
        preview: lastMsg?.message_text?.slice(0, 100) || '',
      };
    }

    if (overdueResult.data?.[0]) {
      const inv = overdueResult.data[0] as unknown as {
        id: string;
        invoice_number: string;
        due_date: string;
        total_amount: number;
        customers: { name: string } | { name: string }[] | null;
      };
      const dueDate = new Date(inv.due_date);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
      // Handle both single object and array returns from Supabase
      const customerName = inv.customers
        ? Array.isArray(inv.customers)
          ? inv.customers[0]?.name
          : inv.customers.name
        : 'Unknown';
      context.oldestOverdueInvoice = {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerName: customerName || 'Unknown',
        amount: inv.total_amount,
        dueDate: inv.due_date,
        daysPastDue,
      };
    }

    if (pendingEstimatesResult.data?.[0]) {
      const est = pendingEstimatesResult.data[0] as unknown as {
        id: string;
        created_at: string;
        total_amount: number;
        customers: { name: string } | { name: string }[] | null;
      };
      const sentDate = new Date(est.created_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (24 * 60 * 60 * 1000));
      // Handle both single object and array returns from Supabase
      const customerName = est.customers
        ? Array.isArray(est.customers)
          ? est.customers[0]?.name
          : est.customers.name
        : 'Unknown';
      context.oldestPendingEstimate = {
        id: est.id,
        customerName: customerName || 'Unknown',
        amount: est.total_amount,
        sentAt: est.created_at,
        daysSinceSent,
      };
    }

    if (hotLeadsResult.data?.[0]) {
      const lead = hotLeadsResult.data[0];
      context.topHotLead = {
        id: lead.id,
        customerPhone: lead.customer_phone,
        customerName: lead.customer_name,
        intent: lead.current_intent || 'unknown',
        lastActivity: lead.updated_at,
      };
    }

    // Generate suggestion using AI or fallback logic
    const suggestion = await generateSuggestion(context);

    return NextResponse.json({
      suggestion,
      context: {
        missedCalls: context.missedCalls,
        unrepliedMessages: context.unrepliedMessages,
        overdueInvoices: context.overdueInvoices,
        pendingEstimates: context.pendingEstimates,
        hotLeads: context.hotLeads,
      },
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error generating AI suggestion' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}

async function generateSuggestion(context: SuggestionContext): Promise<AINextActionSuggestion | null> {
  // If nothing needs attention, return null
  const totalItems =
    context.missedCalls +
    context.unrepliedMessages +
    context.overdueInvoices +
    context.pendingEstimates +
    context.hotLeads;

  if (totalItems === 0) {
    return null;
  }

  // Try LLM-powered suggestion first
  const client = getOpenAIClient();
  if (client) {
    try {
      const suggestion = await generateLLMSuggestion(client, context);
      if (suggestion) return suggestion;
    } catch (err) {
      apiLogger.error({ error: err, context: 'LLM suggestion failed, using fallback' });
    }
  }

  // Fallback to rule-based suggestion
  return generateFallbackSuggestion(context);
}

async function generateLLMSuggestion(
  client: OpenAI,
  context: SuggestionContext
): Promise<AINextActionSuggestion | null> {
  const prompt = buildLLMPrompt(context);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a business assistant for a trades/service business. Analyze the pending tasks and suggest ONE specific, actionable next step.

Your response must be valid JSON with this structure:
{
  "type": "callback" | "reply_message" | "send_invoice_reminder" | "follow_up_estimate" | "hot_lead_action",
  "what": "Brief action description (max 10 words)",
  "why": "Why this matters (max 15 words)",
  "effect": "Expected outcome if action is taken (max 15 words)",
  "priority": "high" | "medium" | "low",
  "customerName": "Customer name if available"
}

Prioritize:
1. Hot leads (time-sensitive revenue)
2. Missed calls (customer frustration)
3. Unreplied messages (customer waiting)
4. Overdue invoices (cash flow)
5. Pending estimates (potential revenue)

Be specific and action-oriented. Use the customer's name when available.`,
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Build suggestion with action URLs
    const suggestion: AINextActionSuggestion = {
      type: parsed.type,
      what: parsed.what,
      why: parsed.why,
      effect: parsed.effect,
      priority: parsed.priority || 'medium',
      customerName: parsed.customerName,
    };

    // Add action URLs based on type
    addActionUrls(suggestion, context);

    return suggestion;
  } catch {
    apiLogger.error({ message: 'Failed to parse LLM response', content, context: 'generateLLMSuggestion' });
    return null;
  }
}

function buildLLMPrompt(context: SuggestionContext): string {
  const parts: string[] = [];

  if (context.missedCalls > 0 && context.oldestMissedCall) {
    const call = context.oldestMissedCall;
    const name = call.customerName || call.phone;
    const ago = getTimeAgo(call.missedAt);
    parts.push(`- ${context.missedCalls} missed call(s). Oldest: ${name} (${ago})`);
  }

  if (context.unrepliedMessages > 0 && context.oldestUnreplied) {
    const msg = context.oldestUnreplied;
    const name = msg.customerName || msg.customerPhone;
    const ago = getTimeAgo(msg.lastMessageAt);
    parts.push(`- ${context.unrepliedMessages} unreplied message(s). Oldest: ${name} (${ago}): "${msg.preview}"`);
  }

  if (context.hotLeads > 0 && context.topHotLead) {
    const lead = context.topHotLead;
    const name = lead.customerName || lead.customerPhone;
    parts.push(`- ${context.hotLeads} hot lead(s). Top: ${name} (intent: ${lead.intent})`);
  }

  if (context.overdueInvoices > 0 && context.oldestOverdueInvoice) {
    const inv = context.oldestOverdueInvoice;
    parts.push(
      `- ${context.overdueInvoices} overdue invoice(s). Oldest: ${inv.customerName} - $${inv.amount} (${inv.daysPastDue} days overdue)`
    );
  }

  if (context.pendingEstimates > 0 && context.oldestPendingEstimate) {
    const est = context.oldestPendingEstimate;
    parts.push(
      `- ${context.pendingEstimates} pending estimate(s). Oldest: ${est.customerName} - $${est.amount} (${est.daysSinceSent} days ago)`
    );
  }

  return `Current pending items:\n${parts.join('\n')}\n\nWhat should I do first?`;
}

function generateFallbackSuggestion(context: SuggestionContext): AINextActionSuggestion {
  // Priority order: hot leads > missed calls > unreplied > overdue > estimates

  if (context.hotLeads > 0 && context.topHotLead) {
    const lead = context.topHotLead;
    return {
      type: 'hot_lead_action',
      what: `Follow up with hot lead`,
      why: `They showed strong interest and may be ready to book`,
      effect: `Convert to paying customer`,
      priority: 'high',
      actionUrl: `/leads-captain/conversations?id=${lead.id}`,
      actionLabel: 'View Conversation',
      entityId: lead.id,
      entityType: 'lead',
      customerName: lead.customerName || lead.customerPhone,
    };
  }

  if (context.missedCalls > 0 && context.oldestMissedCall) {
    const call = context.oldestMissedCall;
    return {
      type: 'callback',
      what: `Call back ${call.customerName || 'customer'}`,
      why: `Missed call ${getTimeAgo(call.missedAt)}`,
      effect: `Don't lose a potential lead to a competitor`,
      priority: 'high',
      actionUrl: `/calls?id=${call.id}`,
      actionLabel: 'View & Call Back',
      entityId: call.id,
      entityType: 'call',
      customerName: call.customerName || call.phone,
    };
  }

  if (context.unrepliedMessages > 0 && context.oldestUnreplied) {
    const msg = context.oldestUnreplied;
    return {
      type: 'reply_message',
      what: `Reply to ${msg.customerName || 'customer'}`,
      why: `Message waiting ${getTimeAgo(msg.lastMessageAt)}`,
      effect: `Keep the conversation moving forward`,
      priority: 'medium',
      actionUrl: `/leads-captain/conversations?id=${msg.id}`,
      actionLabel: 'Open Conversation',
      entityId: msg.id,
      entityType: 'message',
      customerName: msg.customerName || msg.customerPhone,
    };
  }

  if (context.overdueInvoices > 0 && context.oldestOverdueInvoice) {
    const inv = context.oldestOverdueInvoice;
    return {
      type: 'send_invoice_reminder',
      what: `Send payment reminder for #${inv.invoiceNumber}`,
      why: `${inv.daysPastDue} days past due`,
      effect: `Improve cash flow with $${inv.amount.toLocaleString()}`,
      priority: 'medium',
      actionUrl: `/invoices/${inv.id}`,
      actionLabel: 'Send Reminder',
      entityId: inv.id,
      entityType: 'invoice',
      customerName: inv.customerName,
    };
  }

  if (context.pendingEstimates > 0 && context.oldestPendingEstimate) {
    const est = context.oldestPendingEstimate;
    return {
      type: 'follow_up_estimate',
      what: `Follow up on estimate`,
      why: `Sent ${est.daysSinceSent} days ago, no response`,
      effect: `Close $${est.amount.toLocaleString()} potential job`,
      priority: 'low',
      actionUrl: `/estimates/${est.id}`,
      actionLabel: 'Follow Up',
      entityId: est.id,
      entityType: 'estimate',
      customerName: est.customerName,
    };
  }

  // Should not reach here, but return a generic suggestion
  return {
    type: 'hot_lead_action',
    what: 'Check your dashboard',
    why: 'Stay on top of your business',
    effect: 'Never miss an opportunity',
    priority: 'low',
    actionUrl: '/dashboard',
    actionLabel: 'Go to Dashboard',
  };
}

function addActionUrls(suggestion: AINextActionSuggestion, context: SuggestionContext): void {
  switch (suggestion.type) {
    case 'callback':
      if (context.oldestMissedCall) {
        suggestion.actionUrl = `/calls?id=${context.oldestMissedCall.id}`;
        suggestion.actionLabel = 'View & Call Back';
        suggestion.entityId = context.oldestMissedCall.id;
        suggestion.entityType = 'call';
      }
      break;
    case 'reply_message':
      if (context.oldestUnreplied) {
        suggestion.actionUrl = `/leads-captain/conversations?id=${context.oldestUnreplied.id}`;
        suggestion.actionLabel = 'Open Conversation';
        suggestion.entityId = context.oldestUnreplied.id;
        suggestion.entityType = 'message';
      }
      break;
    case 'send_invoice_reminder':
      if (context.oldestOverdueInvoice) {
        suggestion.actionUrl = `/invoices/${context.oldestOverdueInvoice.id}`;
        suggestion.actionLabel = 'Send Reminder';
        suggestion.entityId = context.oldestOverdueInvoice.id;
        suggestion.entityType = 'invoice';
      }
      break;
    case 'follow_up_estimate':
      if (context.oldestPendingEstimate) {
        suggestion.actionUrl = `/estimates/${context.oldestPendingEstimate.id}`;
        suggestion.actionLabel = 'Follow Up';
        suggestion.entityId = context.oldestPendingEstimate.id;
        suggestion.entityType = 'estimate';
      }
      break;
    case 'hot_lead_action':
      if (context.topHotLead) {
        suggestion.actionUrl = `/leads-captain/conversations?id=${context.topHotLead.id}`;
        suggestion.actionLabel = 'View Conversation';
        suggestion.entityId = context.topHotLead.id;
        suggestion.entityType = 'lead';
      }
      break;
  }
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
