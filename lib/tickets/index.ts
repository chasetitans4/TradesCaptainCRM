// =====================================================
// SUPPORT TICKET SERVICE
// Handles ticket creation, management, and AI summarization
// =====================================================

import 'openai/shims/node';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const ticketsLogger = logger.child({ context: 'tickets' });
import {
  SupportTicket,
  TicketMessage,
  CreateTicketInput,
  UpdateTicketInput,
  TicketStats,
  TicketCategory,
  TicketPriority,
} from '@/lib/admin/types';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Generate unique ticket number
function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TC-${timestamp}-${random}`;
}

// AI-powered issue summarization
export async function summarizeIssue(
  conversationHistory: Array<{ role: string; content: string }>,
  currentPage?: string
): Promise<{
  summary: string;
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  suggestedSubject: string;
}> {
  const client = getOpenAIClient();

  if (!client) {
    // Fallback without AI
    const lastUserMessage = conversationHistory
      .filter((m) => m.role === 'user')
      .pop()?.content || 'User needs assistance';

    return {
      summary: lastUserMessage.slice(0, 500),
      suggestedCategory: 'other',
      suggestedPriority: 'medium',
      suggestedSubject: 'Support Request',
    };
  }

  const conversationText = conversationHistory
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `Analyze this support conversation and provide a structured summary for a support ticket.

Conversation:
${conversationText}

${currentPage ? `Customer is currently on page: ${currentPage}` : ''}

Respond in this exact JSON format:
{
  "summary": "A clear, concise 2-3 sentence summary of the customer's issue and what they need help with",
  "suggestedCategory": "one of: technical_issue, billing_question, feature_request, how_to_question, account_issue, integration_help, bug_report, other",
  "suggestedPriority": "one of: low, medium, high, urgent",
  "suggestedSubject": "A brief 5-10 word subject line for the ticket"
}

Be concise but capture the key details. If the issue involves system errors or being unable to work, set priority to high. If it's urgent language like "ASAP" or "critical", set to urgent.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Customer needs assistance',
        suggestedCategory: parsed.suggestedCategory || 'other',
        suggestedPriority: parsed.suggestedPriority || 'medium',
        suggestedSubject: parsed.suggestedSubject || 'Support Request',
      };
    }
  } catch (error) {
    ticketsLogger.error({
      msg: 'Error summarizing issue',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
  }

  // Fallback
  return {
    summary: 'Customer needs assistance with their issue.',
    suggestedCategory: 'other',
    suggestedPriority: 'medium',
    suggestedSubject: 'Support Request',
  };
}

// Create a new support ticket
export async function createTicket(
  input: CreateTicketInput,
  userId: string,
  userName: string,
  userEmail: string,
  businessId: string,
  businessName: string
): Promise<SupportTicket> {
  const supabase = await createClient();
  const ticketNumber = generateTicketNumber();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      ticket_number: ticketNumber,
      crm_account_id: businessId,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      business_name: businessName,
      subject: input.subject,
      description: input.description,
      ai_summary: input.ai_summary,
      category: input.category,
      priority: input.priority || 'medium',
      status: 'open',
      conversation_context: input.conversation_context,
      page_context: input.page_context,
    })
    .select()
    .single();

  if (error) {
    ticketsLogger.error({ msg: 'Error creating ticket', error });
    throw error;
  }

  // Add initial system message
  const { error: msgError } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'system',
      sender_id: 'system',
      sender_name: 'System',
      message: `Ticket #${ticketNumber} created. Our support team will respond shortly.`,
      is_internal: false,
    });

  if (msgError) {
    ticketsLogger.error({ msg: 'Error creating initial message', error: msgError });
    // Don't throw, ticket was created
  }

  return { ...ticket, messages: [] };
}

// Get ticket by ID
export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const supabase = await createClient();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      messages:ticket_messages(*)
    `)
    .eq('id', ticketId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Sort messages
  if (ticket.messages) {
    ticket.messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return ticket;
}

// Get ticket by number
export async function getTicketByNumber(ticketNumber: string): Promise<SupportTicket | null> {
  const supabase = await createClient();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      messages:ticket_messages(*)
    `)
    .eq('ticket_number', ticketNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Sort messages
  if (ticket.messages) {
    ticket.messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return ticket;
}

// Get tickets for a business/user
export async function getTicketsForBusiness(
  businessId: string,
  filters?: {
    status?: string;
    priority?: string;
    category?: string;
  }
): Promise<SupportTicket[]> {
  const supabase = await createClient();

  let query = supabase
    .from('support_tickets')
    .select('*')
    .eq('crm_account_id', businessId);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.category) query = query.eq('category', filters.category);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get all tickets (admin view)
export async function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  search?: string;
}): Promise<SupportTicket[]> {
  const supabase = await createClient();

  let query = supabase.from('support_tickets').select('*');

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  
  if (filters?.search) {
    const search = filters.search;
    query = query.or(`subject.ilike.%${search}%,description.ilike.%${search}%,ticket_number.ilike.%${search}%,user_name.ilike.%${search}%,business_name.ilike.%${search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Update ticket
export async function updateTicket(
  ticketId: string,
  updates: UpdateTicketInput,
  updatedBy?: string
): Promise<SupportTicket | null> {
  const supabase = await createClient();
  
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.status) {
    updateData.status = updates.status;
    if (updates.status === 'resolved' || updates.status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = updatedBy;
    }
  }

  if (updates.priority) updateData.priority = updates.priority;
  if (updates.category) updateData.category = updates.category;

  if (updates.assigned_to) {
    updateData.assigned_to = updates.assigned_to;
    // We need to check if it was already assigned to handle assigned_at
    // But for simplicity/performance we'll just update it if provided
    updateData.assigned_at = new Date().toISOString();
  }

  if (updates.resolution_notes) {
    updateData.resolution_notes = updates.resolution_notes;
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return ticket;
}

// Add message to ticket
export async function addTicketMessage(
  ticketId: string,
  senderType: 'customer' | 'agent' | 'system',
  senderId: string,
  senderName: string,
  message: string,
  isInternal: boolean = false
): Promise<TicketMessage | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Insert message
  const { data: ticketMessage, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      message,
      is_internal: isInternal,
    })
    .select()
    .single();

  if (error) throw error;

  // Update ticket timestamp and status
  const ticketUpdates: any = { updated_at: now };

  // Get current ticket status to decide if we need to update it
  const { data: currentTicket } = await supabase
    .from('support_tickets')
    .select('status, first_response_at')
    .eq('id', ticketId)
    .single();

  if (currentTicket) {
    // Track first response time
    if (senderType === 'agent' && !currentTicket.first_response_at) {
      ticketUpdates.first_response_at = now;
    }

    // Change status if agent responds
    if (senderType === 'agent' && currentTicket.status === 'open') {
      ticketUpdates.status = 'in_progress';
    }

    // Change status if customer responds while waiting
    if (senderType === 'customer' && currentTicket.status === 'waiting_on_customer') {
      ticketUpdates.status = 'in_progress';
    }
    
    await supabase
      .from('support_tickets')
      .update(ticketUpdates)
      .eq('id', ticketId);
  }

  return ticketMessage;
}

// Get ticket statistics
export async function getTicketStats(): Promise<TicketStats> {
  const supabase = await createClient();
  
  // This is a simplified stats implementation. 
  // For production with large datasets, we should use an RPC or specific count queries.
  // Fetching all tickets is not scalable but works for the current refactor.
  
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('status, created_at, first_response_at, resolved_at');

  if (error) throw error;

  let total = 0;
  let open = 0;
  let in_progress = 0;
  let waiting_on_customer = 0;
  let resolved = 0;
  let closed = 0;
  let totalResponseTime = 0;
  let responseCount = 0;
  let totalResolutionTime = 0;
  let resolutionCount = 0;

  for (const ticket of (tickets || [])) {
    total++;
    switch (ticket.status) {
      case 'open':
        open++;
        break;
      case 'in_progress':
        in_progress++;
        break;
      case 'waiting_on_customer':
        waiting_on_customer++;
        break;
      case 'resolved':
        resolved++;
        break;
      case 'closed':
        closed++;
        break;
    }

    if (ticket.first_response_at) {
      const created = new Date(ticket.created_at).getTime();
      const firstResponse = new Date(ticket.first_response_at).getTime();
      totalResponseTime += (firstResponse - created) / (1000 * 60 * 60);
      responseCount++;
    }

    if (ticket.resolved_at) {
      const created = new Date(ticket.created_at).getTime();
      const resolved = new Date(ticket.resolved_at).getTime();
      totalResolutionTime += (resolved - created) / (1000 * 60 * 60);
      resolutionCount++;
    }
  }

  return {
    total,
    open,
    in_progress,
    waiting_on_customer,
    resolved,
    closed,
    avg_response_time_hours: responseCount > 0 ? totalResponseTime / responseCount : 0,
    avg_resolution_time_hours: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
  };
}

// Category labels for display
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical_issue: 'Technical Issue',
  billing_question: 'Billing Question',
  feature_request: 'Feature Request',
  how_to_question: 'How-To Question',
  account_issue: 'Account Issue',
  integration_help: 'Integration Help',
  bug_report: 'Bug Report',
  other: 'Other',
};

// Priority labels and colors
export const TICKET_PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; color: string; bgColor: string }
> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Status labels and colors
export const TICKET_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  open: { label: 'Open', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  waiting_on_customer: { label: 'Waiting on Customer', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  resolved: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-100' },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};
