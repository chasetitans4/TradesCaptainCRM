// =====================================================
// SUPPORT TICKET SERVICE
// Handles ticket creation, management, and AI summarization
// =====================================================

import 'openai/shims/node';
import OpenAI from 'openai';
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

// In-memory ticket storage (replace with Supabase in production)
const ticketsStore = new Map<string, SupportTicket>();
const messagesStore = new Map<string, TicketMessage[]>();

// Create a new support ticket
export async function createTicket(
  input: CreateTicketInput,
  userId: string,
  userName: string,
  userEmail: string,
  businessId: string,
  businessName: string
): Promise<SupportTicket> {
  const ticketNumber = generateTicketNumber();
  const now = new Date().toISOString();

  const ticket: SupportTicket = {
    id: crypto.randomUUID(),
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
    created_at: now,
    updated_at: now,
    messages: [],
  };

  // Store ticket (in production, save to Supabase)
  ticketsStore.set(ticket.id, ticket);
  messagesStore.set(ticket.id, []);

  // Add initial system message
  const systemMessage: TicketMessage = {
    id: crypto.randomUUID(),
    ticket_id: ticket.id,
    sender_type: 'system',
    sender_id: 'system',
    sender_name: 'System',
    message: `Ticket #${ticketNumber} created. Our support team will respond shortly.`,
    is_internal: false,
    created_at: now,
  };

  messagesStore.get(ticket.id)?.push(systemMessage);

  return ticket;
}

// Get ticket by ID
export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const ticket = ticketsStore.get(ticketId);
  if (ticket) {
    ticket.messages = messagesStore.get(ticketId) || [];
  }
  return ticket || null;
}

// Get ticket by number
export async function getTicketByNumber(ticketNumber: string): Promise<SupportTicket | null> {
  for (const ticket of ticketsStore.values()) {
    if (ticket.ticket_number === ticketNumber) {
      ticket.messages = messagesStore.get(ticket.id) || [];
      return ticket;
    }
  }
  return null;
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
  const tickets: SupportTicket[] = [];

  for (const ticket of ticketsStore.values()) {
    if (ticket.crm_account_id === businessId) {
      if (filters?.status && ticket.status !== filters.status) continue;
      if (filters?.priority && ticket.priority !== filters.priority) continue;
      if (filters?.category && ticket.category !== filters.category) continue;
      tickets.push(ticket);
    }
  }

  return tickets.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Get all tickets (admin view)
export async function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  search?: string;
}): Promise<SupportTicket[]> {
  const tickets: SupportTicket[] = [];

  for (const ticket of ticketsStore.values()) {
    if (filters?.status && ticket.status !== filters.status) continue;
    if (filters?.priority && ticket.priority !== filters.priority) continue;
    if (filters?.category && ticket.category !== filters.category) continue;
    if (filters?.assigned_to && ticket.assigned_to !== filters.assigned_to) continue;
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.ticket_number.toLowerCase().includes(searchLower) ||
        ticket.user_name.toLowerCase().includes(searchLower) ||
        ticket.business_name.toLowerCase().includes(searchLower);
      if (!matchesSearch) continue;
    }
    tickets.push(ticket);
  }

  return tickets.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Update ticket
export async function updateTicket(
  ticketId: string,
  updates: UpdateTicketInput,
  updatedBy?: string
): Promise<SupportTicket | null> {
  const ticket = ticketsStore.get(ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();

  if (updates.status) {
    ticket.status = updates.status;
    if (updates.status === 'resolved' || updates.status === 'closed') {
      ticket.resolved_at = now;
      ticket.resolved_by = updatedBy;
    }
  }

  if (updates.priority) ticket.priority = updates.priority;
  if (updates.category) ticket.category = updates.category;

  if (updates.assigned_to) {
    ticket.assigned_to = updates.assigned_to;
    if (!ticket.assigned_at) {
      ticket.assigned_at = now;
    }
  }

  if (updates.resolution_notes) {
    ticket.resolution_notes = updates.resolution_notes;
  }

  ticket.updated_at = now;

  ticketsStore.set(ticketId, ticket);
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
  const ticket = ticketsStore.get(ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();

  const ticketMessage: TicketMessage = {
    id: crypto.randomUUID(),
    ticket_id: ticketId,
    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    message,
    is_internal: isInternal,
    created_at: now,
  };

  const messages = messagesStore.get(ticketId) || [];
  messages.push(ticketMessage);
  messagesStore.set(ticketId, messages);

  // Update ticket
  ticket.updated_at = now;

  // Track first response time
  if (senderType === 'agent' && !ticket.first_response_at) {
    ticket.first_response_at = now;
  }

  // Change status if agent responds
  if (senderType === 'agent' && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  // Change status if customer responds while waiting
  if (senderType === 'customer' && ticket.status === 'waiting_on_customer') {
    ticket.status = 'in_progress';
  }

  ticketsStore.set(ticketId, ticket);

  return ticketMessage;
}

// Get ticket statistics
export async function getTicketStats(): Promise<TicketStats> {
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

  for (const ticket of ticketsStore.values()) {
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
